import React, { useState, useCallback, useMemo } from "react";
import lendContext from "./lendContext";
import { ethers } from "ethers";
import { CONFIG } from "../config/contracts";
import { getTokenBalance, getTokenAllowance, approveIfNeeded, lend as lendTx, withdraw as withdrawTx, borrow as borrowTx, repay as repayTx } from "../lib/tx";
import { ETHAddress, LendingPoolAddress, LendingHelperAddress, WETHAddress } from "../addresses";
import { TokenABI, LendingPoolABI, LendingHelperABI } from "../abis";

// Utility functions
const numberToEthers = (number) => {
  return ethers.parseEther(number.toString());
};

const reportError = (error) => {
  console.error("LendState Error:", JSON.stringify(error));
  console.error("Error details:", error);
};

const LendState = (props) => {
  //* Declaring all the states

  // Set metamask details
  const [metamaskDetails, setMetamaskDetails] = useState({
    provider: null,
    networkName: null,
    signer: null,
    currentAccount: null,
    chainId: null,
  });

  // User assets and balances
  const [userAssets, setUserAssets] = useState([]);
  const [supplyAssets, setSupplyAssets] = useState([]);
  const [assetsToBorrow, setAssetsToBorrow] = useState([]);
  const [yourBorrows, setYourBorrows] = useState([]);

  // Contract details
  const [contract, setContract] = useState({
    lendingPoolContract: null,
    oracleContract: null,
  });

  // Summary data
  const [supplySummary, setSupplySummary] = useState({
    totalUSDBalance: 0,
    weightedAvgAPY: 0,
    totalUSDCollateral: 0,
  });

  const [borrowSummary, setBorrowSummary] = useState({
    totalUSDBalance: 0,
    weightedAvgAPY: 0,
    totalBorrowPowerUsed: 0,
  });

  // Account data
  const [accountData, setAccountData] = useState({
    collateralUSD: "0",
    debtUSD: "0",
    healthFactor: "0",
  });

  // Connect wallet
  // const connectWallet = useCallback(async () => {
  //   console.log("1. Connecting to wallet...");
  //   const { ethereum } = window;
  //   const failMessage = "Please install Metamask & connect your Metamask";
    
  //   try {
  //     if (!ethereum) {
  //       alert(failMessage);
  //       return;
  //     }

  //     const accounts = await ethereum.request({
  //       method: "eth_requestAccounts",
  //     });

  //     // Listen for account and chain changes
  //     ethereum.on("chainChanged", () => {
  //       window.location.reload();
  //     });
  //     ethereum.on("accountsChanged", () => {
  //       window.location.reload();
  //     });

  //     const provider = new ethers.BrowserProvider(ethereum);
  //     const network = await provider.getNetwork();
  //     const networkName = network.name;
  //     const signer = await provider.getSigner();

  //     if (accounts.length) {
  //       let currentAddress = accounts[0];
  //       setMetamaskDetails({
  //         provider: provider,
  //         networkName: networkName,
  //         signer: signer,
  //         currentAccount: currentAddress,
  //         chainId: Number(network.chainId),
  //       });
  //       console.log("Connected to wallet:", currentAddress);
  //     } else {
  //       alert(failMessage);
  //       return;
  //     }
  //   } catch (error) {
  //     reportError(error);
  //   }
  // }, []);

  const connectWallet = useCallback(async () => {
    console.log("1. Connecting to wallet...");
    const { ethereum } = window;
    const failMessage = "Please install Metamask & connect your Metamask";
    try {
      if (!ethereum) {
        alert(failMessage);
        return;
      }

      const accounts = await ethereum.request({ method: "eth_requestAccounts" });

      // Listen for account and chain changes
      ethereum.on("chainChanged", () => {
        window.location.reload();
      });
      ethereum.on("accountsChanged", () => {
        window.location.reload();
      });

      const provider = new ethers.BrowserProvider(ethereum);
      const network = await provider.getNetwork();
      const networkName = network.name;
      const signer = await provider.getSigner();

      if (accounts.length) {
        let currentAddress = accounts[0];
        setMetamaskDetails({
          provider: provider,
          networkName: networkName,
          signer: signer,
          currentAccount: currentAddress,
          chainId: Number(network.chainId),
        });
        console.log("Connected to wallet++++++++++++++++++++++++++++++++++:", currentAddress);
      } else {
        alert(failMessage);
        return;
      }
    } catch (error) {
      reportError(error);
    }
  }, []);

  // Get contract instance
  const getContract = useCallback(async (address, abi) => {
    if (!metamaskDetails.provider) return null;
    const contract = new ethers.Contract(address, abi, metamaskDetails.provider);
    return contract;
  }, [metamaskDetails.provider]);

  // Get user assets (balances)
  const getUserAssets = useCallback(async () => {
    console.log("2. Getting user assets...");
    try {
      if (!metamaskDetails.provider || !metamaskDetails.currentAccount) return [];

      const assets = await Promise.all(
        CONFIG.TOKENS.map(async (token) => {
          let balance = "0";
          let balanceUSD = 0;

          try {
            if (token.isNative) {
              // ETH native balance
              const bal = await metamaskDetails.provider.getBalance(metamaskDetails.currentAccount);
              balance = ethers.formatEther(bal);
            } else {
              // ERC20 token balance
              balance = await getTokenBalance(
                metamaskDetails.provider,
                token.address,
                metamaskDetails.currentAccount,
                token.decimals
              );
            }

            // Get USD value
            const price = await getPriceUSD(token.address);
            balanceUSD = parseFloat(balance) * parseFloat(price);

            return {
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals,
              isNative: token.isNative,
              balance: balance,
              balanceUSD: balanceUSD,
              priceUSD: price,
            };
          } catch (error) {
            console.warn(`Error getting balance for ${token.symbol}:`, error);
            return {
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals,
              isNative: token.isNative,
              balance: "0",
              balanceUSD: 0,
              priceUSD: "0",
            };
          }
        })
      );

      setUserAssets(assets);
      console.log("Got user assets:", assets);
      return assets;
    } catch (error) {
      reportError(error);
      return [];
    }
  }, [metamaskDetails.provider, metamaskDetails.currentAccount]);

  // Get price in USD
  const getPriceUSD = useCallback(async (asset) => {
    if (!metamaskDetails.provider) return "0";
    try {
      const abi = ['function getAssetPrice1e18(address asset) view returns (uint256)'];
      const oracle = new ethers.Contract(CONFIG.PRICE_ORACLE, abi, metamaskDetails.provider);
      const price = await oracle.getAssetPrice1e18(asset);
      return ethers.formatUnits(price, 18);
    } catch (error) {
      console.warn(`Error getting price for ${asset}:`, error);
      return "0";
    }
  }, [metamaskDetails.provider]);

  // Get amount in USD
  const getAmountInUSD = useCallback(async (address, amount) => {
    try {
      const price = await getPriceUSD(address);
      const amountInUSD = parseFloat(amount) * parseFloat(price);
      return amountInUSD;
    } catch (error) {
      reportError(error);
      return 0;
    }
  }, [getPriceUSD]);

  // Approve tokens
  const ApproveToContinue = useCallback(async (tokenAddress, approveAmount) => {
    if (!metamaskDetails.signer) {
      throw new Error("No signer available");
    }

    try {
      const token = CONFIG.TOKENS.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
      if (!token) throw new Error("Token not found");

      await approveIfNeeded(
        metamaskDetails.signer,
        tokenAddress,
        CONFIG.LENDING_POOL,
        approveAmount,
        token.decimals
      );

      console.log("Token approved:", tokenAddress);
      return { status: 200, message: "Transaction Successful..." };
    } catch (error) {
      reportError(error);
      return { status: 500, message: error.message || error.reason };
    }
  }, [metamaskDetails.signer]);

  // Lend asset
  const LendAsset = useCallback(async (token, supplyAmount) => {
    if (!metamaskDetails.signer) {
      throw new Error("No signer available");
    }

    try {
      const tokenInfo = CONFIG.TOKENS.find(t => t.address.toLowerCase() === token.toLowerCase());
      if (!tokenInfo) throw new Error("Token not found");

      const amount = ethers.parseUnits(supplyAmount, tokenInfo.decimals);
      const tx = await lendTx(metamaskDetails.signer, token, amount);
      
      if (tx) {
        console.log("Asset lent successfully:", token, supplyAmount);
        return { status: 200, message: "Transaction Successful...", hash: tx.hash };
      }
      throw new Error("Transaction failed");
    } catch (error) {
      reportError(error);
      return { status: 500, message: error.message || error.reason };
    }
  }, [metamaskDetails.signer]);

  // Withdraw asset
  const WithdrawAsset = useCallback(async (tokenAddress, withdrawAmount) => {
    if (!metamaskDetails.signer) {
      throw new Error("No signer available");
    }

    try {
      const tokenInfo = CONFIG.TOKENS.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
      if (!tokenInfo) throw new Error("Token not found");

      const amount = ethers.parseUnits(withdrawAmount, tokenInfo.decimals);
      const tx = await withdrawTx(metamaskDetails.signer, tokenAddress, amount);
      
      if (tx) {
        console.log("Asset withdrawn successfully:", tokenAddress, withdrawAmount);
        return { status: 200, message: "Transaction Successful...", hash: tx.hash };
      }
      throw new Error("Transaction failed");
    } catch (error) {
      reportError(error);
      return { status: 500, message: error.message || error.reason };
    }
  }, [metamaskDetails.signer]);

  // Borrow asset
  const borrowAsset = useCallback(async (token, borrowAmount) => {
    if (!metamaskDetails.signer) {
      throw new Error("No signer available");
    }

    try {
      const tokenInfo = CONFIG.TOKENS.find(t => t.address.toLowerCase() === token.toLowerCase());
      if (!tokenInfo) throw new Error("Token not found");

      const amount = ethers.parseUnits(borrowAmount, tokenInfo.decimals);
      const tx = await borrowTx(metamaskDetails.signer, token, amount);
      
      if (tx) {
        console.log("Asset borrowed successfully:", token, borrowAmount);
        return { status: 200, message: "Transaction Successful...", hash: tx.hash };
      }
      throw new Error("Transaction failed");
    } catch (error) {
      reportError(error);
      return { status: 500, message: error.message || error.reason };
    }
  }, [metamaskDetails.signer]);

  // Repay asset
  const repayAsset = useCallback(async (tokenAddress, repayAmount) => {
    if (!metamaskDetails.signer) {
      throw new Error("No signer available");
    }

    try {
      const tokenInfo = CONFIG.TOKENS.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
      if (!tokenInfo) throw new Error("Token not found");

      const amount = ethers.parseUnits(repayAmount, tokenInfo.decimals);
      const tx = await repayTx(metamaskDetails.signer, tokenAddress, amount);
      
      if (tx) {
        console.log("Asset repaid successfully:", tokenAddress, repayAmount);
        return { status: 200, message: "Transaction Successful...", hash: tx.hash };
      }
      throw new Error("Transaction failed");
    } catch (error) {
      reportError(error);
      return { status: 500, message: error.message || error.reason };
    }
  }, [metamaskDetails.signer]);

  // Get account data (collateral, debt, health factor)
  const getAccountData = useCallback(async (user) => {
    try {
      if (!metamaskDetails.provider) return null;

      const pool = new ethers.Contract(LendingPoolAddress, LendingPoolABI.abi, metamaskDetails.provider);
      const wallet = user || metamaskDetails.currentAccount || ethers.ZeroAddress;
      
      // Add error handling for empty response
      let col, debt, hf;
      try {
        [col, debt, hf] = await pool.getAccountData(wallet);
      } catch (contractError) {
        console.log('Contract getAccountData failed, using defaults:', contractError.message);
        // Return default values for new users
        col = ethers.parseUnits("0", 18);
        debt = ethers.parseUnits("0", 18);
        hf = ethers.parseUnits("115792089237316195423570985008687907853269984665640564039457.584007913129639935", 18); // Max uint256
      }
      
      const accountData = {
        collateralUSD: ethers.formatUnits(col, 18),
        debtUSD: ethers.formatUnits(debt, 18),
        healthFactor: ethers.formatUnits(hf, 18)
      };

      setAccountData(accountData);
      return accountData;
    } catch (error) {
      console.log('getAccountData error, using defaults:', error.message);
      // Return default values on any error
      const accountData = {
        collateralUSD: "0",
        debtUSD: "0", 
        healthFactor: "115792089237316195423570985008687907853269984665640564039457.584007913129639935"
      };
      setAccountData(accountData);
      return accountData;
    }
  }, [metamaskDetails.provider, metamaskDetails.currentAccount]);

  // Get your supplies
  const getYourSupplies = useCallback(async () => {
    console.log("3. Getting your supplies...");
    try {
      if (!metamaskDetails.provider || !metamaskDetails.currentAccount) return [];

      const abi = [
        'function getUserReserve(address user, address asset) view returns (tuple(uint128 principal,uint128 index) supply, tuple(uint128 principal,uint128 index) borrow)'
      ];
      const pool = new ethers.Contract(CONFIG.LENDING_POOL, abi, metamaskDetails.provider);

      const supplies = await Promise.all(
        CONFIG.TOKENS.filter(t => !t.isNative).map(async (token) => {
          try {
            const userReserve = await pool.getUserReserve(metamaskDetails.currentAccount, token.address);
            const supplyPrincipal = ethers.formatUnits(userReserve.supply.principal, 18);
            const supplyIndex = userReserve.supply.index.toString();
            
            if (parseFloat(supplyPrincipal) > 0) {
              const price = await getPriceUSD(token.address);
              const balanceUSD = parseFloat(supplyPrincipal) * parseFloat(price);
              
              return {
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                supplyPrincipal: supplyPrincipal,
                supplyIndex: supplyIndex,
                balanceUSD: balanceUSD,
                priceUSD: price,
              };
            }
            return null;
          } catch (error) {
            console.warn(`Error getting supply for ${token.symbol}:`, error);
            return null;
          }
        })
      );

      const validSupplies = supplies.filter(s => s !== null);
      setSupplyAssets(validSupplies);

      // Calculate summary
      const totalUSDBalance = validSupplies.reduce((sum, asset) => sum + asset.balanceUSD, 0);
      const weightedAvgAPY = validSupplies.length > 0 ? 
        validSupplies.reduce((sum, asset) => sum + (asset.apy || 0), 0) / validSupplies.length : 0;
      const totalUSDCollateral = validSupplies.reduce((sum, asset) => sum + asset.balanceUSD, 0);

      setSupplySummary({
        totalUSDBalance,
        weightedAvgAPY,
        totalUSDCollateral,
      });

      console.log("Got your supplies:", validSupplies);
      return validSupplies;
    } catch (error) {
      reportError(error);
      return [];
    }
  }, [metamaskDetails.provider, metamaskDetails.currentAccount, getPriceUSD]);

  // Get your borrows
  const getYourBorrows = useCallback(async () => {
    console.log("4. Getting your borrows...");
    try {
      if (!metamaskDetails.provider || !metamaskDetails.currentAccount) return [];

      const abi = [
        'function getUserReserve(address user, address asset) view returns (tuple(uint128 principal,uint128 index) supply, tuple(uint128 principal,uint128 index) borrow)'
      ];
      const pool = new ethers.Contract(CONFIG.LENDING_POOL, abi, metamaskDetails.provider);

      const borrows = await Promise.all(
        CONFIG.TOKENS.filter(t => !t.isNative).map(async (token) => {
          try {
            const userReserve = await pool.getUserReserve(metamaskDetails.currentAccount, token.address);
            const borrowPrincipal = ethers.formatUnits(userReserve.borrow.principal, 18);
            const borrowIndex = userReserve.borrow.index.toString();
            
            if (parseFloat(borrowPrincipal) > 0) {
              const price = await getPriceUSD(token.address);
              const balanceUSD = parseFloat(borrowPrincipal) * parseFloat(price);
              
              return {
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                borrowPrincipal: borrowPrincipal,
                borrowIndex: borrowIndex,
                balanceUSD: balanceUSD,
                priceUSD: price,
              };
            }
            return null;
          } catch (error) {
            console.warn(`Error getting borrow for ${token.symbol}:`, error);
            return null;
          }
        })
      );

      const validBorrows = borrows.filter(b => b !== null);
      setYourBorrows(validBorrows);

      // Calculate summary
      const totalUSDBalance = validBorrows.reduce((sum, asset) => sum + asset.balanceUSD, 0);
      const weightedAvgAPY = validBorrows.length > 0 ? 
        validBorrows.reduce((sum, asset) => sum + (asset.apy || 0), 0) / validBorrows.length : 0;
      const totalBorrowPowerUsed = totalUSDBalance;

      setBorrowSummary({
        totalUSDBalance,
        weightedAvgAPY,
        totalBorrowPowerUsed,
      });

      console.log("Got your borrows:", validBorrows);
      return validBorrows;
    } catch (error) {
      reportError(error);
      return [];
    }
  }, [metamaskDetails.provider, metamaskDetails.currentAccount, getPriceUSD]);

  // Get assets to borrow
  const getAssetsToBorrow = useCallback(async () => {
    console.log("5. Getting assets to borrow...");
    try {
      if (!metamaskDetails.provider) return [];

      const abi = [
        'function reserves(address) view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)'
      ];
      const pool = new ethers.Contract(CONFIG.LENDING_POOL, abi, metamaskDetails.provider);

      const assets = await Promise.all(
        CONFIG.TOKENS.filter(t => !t.isNative).map(async (token) => {
          try {
            const reserve = await pool.reserves(token.address);
            const isBorrowable = Boolean(reserve.isBorrowable);
            const reserveCash = ethers.formatUnits(reserve.reserveCash, 18);
            const price = await getPriceUSD(token.address);
            
            if (isBorrowable && parseFloat(reserveCash) > 0) {
              return {
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                reserveCash: reserveCash,
                isBorrowable: isBorrowable,
                priceUSD: price,
                ltvBps: Number(reserve.ltvBps),
                liqThresholdBps: Number(reserve.liqThresholdBps),
              };
            }
            return null;
          } catch (error) {
            console.warn(`Error getting borrow asset ${token.symbol}:`, error);
            return null;
          }
        })
      );

      const validAssets = assets.filter(a => a !== null);
      setAssetsToBorrow(validAssets);
      console.log("Got assets to borrow:", validAssets);
      return validAssets;
    } catch (error) {
      reportError(error);
      return [];
    }
  }, [metamaskDetails.provider, getPriceUSD]);

  // Wrap ETH to WETH
  const wrapEth = useCallback(async (amountEth) => {
    if (!metamaskDetails.signer) {
      throw new Error("No signer available");
    }

    try {
      const data = '0xd0e30db0'; // deposit()
      console.log('wrapEth → using WETH address:', WETHAddress);
      const tx = await metamaskDetails.signer.sendTransaction({
        to: WETHAddress,
        value: ethers.parseEther(amountEth),
        data
      });
      await tx.wait();
      console.log("ETH wrapped to WETH:", amountEth);
      return { status: 200, message: "Transaction Successful...", hash: tx.hash };
    } catch (error) {
      reportError(error);
      return { status: 500, message: error.message || error.reason };
    }
  }, [metamaskDetails.signer]);

  // Unwrap WETH to ETH
  const unwrapWeth = useCallback(async (amountEth) => {
    if (!metamaskDetails.signer) {
      throw new Error("No signer available");
    }

    try {
      const abi = ['function withdraw(uint256 wad)'];
      console.log('unwrapWeth → using WETH address:', WETHAddress);
      const weth = new ethers.Contract(WETHAddress, abi, metamaskDetails.signer);
      const tx = await weth.withdraw(ethers.parseEther(amountEth));
      await tx.wait();
      console.log("WETH unwrapped to ETH:", amountEth);
      return { status: 200, message: "Transaction Successful...", hash: tx.hash };
    } catch (error) {
      reportError(error);
      return { status: 500, message: error.message || error.reason };
    }
  }, [metamaskDetails.signer]);

  // Withdraw token to ETH (for all tokens with withdraw function)
  const withdrawToken = useCallback(async (tokenAddress, amount) => {
    if (!metamaskDetails.signer) {
      throw new Error("No signer available");
    }

    try {
      const abi = ['function withdraw(uint256 amount)'];
      console.log('withdrawToken → using address:', tokenAddress);
      const token = new ethers.Contract(tokenAddress, abi, metamaskDetails.signer);
      const tx = await token.withdraw(ethers.parseEther(amount));
      await tx.wait();
      console.log("Token withdrawn to ETH:", amount);
      return { status: 200, message: "Withdraw Successful...", hash: tx.hash };
    } catch (error) {
      reportError(error);
      return { status: 500, message: error.message || error.reason };
    }
  }, [metamaskDetails.signer]);

  // Deposit ETH to get token (for all tokens with deposit function)
  const depositToToken = useCallback(async (tokenAddress, amountEth) => {
    if (!metamaskDetails.signer) {
      throw new Error("No signer available");
    }

    try {
      const abi = ['function deposit() payable'];
      console.log('depositToToken → using address:', tokenAddress);
      const token = new ethers.Contract(tokenAddress, abi, metamaskDetails.signer);
      const tx = await token.deposit({ value: ethers.parseEther(amountEth) });
      await tx.wait();
      console.log("ETH deposited to token:", amountEth);
      return { status: 200, message: "Deposit Successful...", hash: tx.hash };
    } catch (error) {
      reportError(error);
      return { status: 500, message: error.message || error.reason };
    }
  }, [metamaskDetails.signer]);

  // Refresh all data
  const refresh = useCallback(async () => {
    try {
      await Promise.all([
        getUserAssets(),
        getYourSupplies(),
        getYourBorrows(),
        getAssetsToBorrow(),
        getAccountData(),
      ]);
      console.log("All data refreshed");
    } catch (error) {
      reportError(error);
    }
  }, [getUserAssets, getYourSupplies, getYourBorrows, getAssetsToBorrow, getAccountData]);

  // Update interests (accrue)
  const updateInterests = useCallback(async (asset) => {
    if (!metamaskDetails.signer) {
      throw new Error("No signer available");
    }

    try {
      const abi = ['function accruePublic(address asset)'];
      const pool = new ethers.Contract(CONFIG.LENDING_POOL, abi, metamaskDetails.signer);
      const tx = await pool.accruePublic(asset);
      await tx.wait();
      console.log("Interests updated for asset:", asset);
      return { status: 200, message: "Transaction Successful..." };
    } catch (error) {
      reportError(error);
      return { status: 500, message: error.message || error.reason };
    }
  }, [metamaskDetails.signer]);

  // Get user total available balance
  const getUserTotalAvailableBalance = useCallback(async () => {
    try {
      if (!metamaskDetails.provider || !metamaskDetails.currentAccount) return 0;

      const abi = [
        'function getUserTotalAvailableBalanceInUSD(address user, uint256 assetType) view returns (uint256)'
      ];
      const pool = new ethers.Contract(CONFIG.LENDING_POOL, abi, metamaskDetails.provider);
      const maxAmount = await pool.getUserTotalAvailableBalanceInUSD(metamaskDetails.currentAccount, 1);
      return Number(ethers.formatUnits(maxAmount, 18));
    } catch (error) {
      reportError(error);
      return 0;
    }
  }, [metamaskDetails.provider, metamaskDetails.currentAccount]);

  // Get tokens per USD amount
  const getTokensPerUSDAmount = useCallback(async (token, amount) => {
    try {
      if (!metamaskDetails.provider) return 0;

      const abi = [
        'function getTokensPerUSDAmount(address token, uint256 amount) view returns (uint256)'
      ];
      const helper = new ethers.Contract(CONFIG.PRICE_ORACLE, abi, metamaskDetails.provider);
      const maxQty = await helper.getTokensPerUSDAmount(token, ethers.parseUnits(amount.toString(), 18));
      return Number(ethers.formatUnits(maxQty, 18));
    } catch (error) {
      reportError(error);
      return 0;
    }
  }, [metamaskDetails.provider]);

  // Objectify supplied assets (format data)
  const objectifySuppliedAssets = useCallback(async (assets) => {
    const assetsList = [];
    for (let i = 0; i < assets.length; i++) {
      const token = assets[i].token;
      let lendQty = assets[i].lentQty;

      const amountInUSD = await getAmountInUSD(token, lendQty);
      lendQty = Number(assets[i].lentQty) / 1e18;

      const maxSupplyAmount = await getUserTotalAvailableBalance();
      const maxQty = await getTokensPerUSDAmount(token, maxSupplyAmount);
      const qty = lendQty <= maxQty ? lendQty : maxQty;

      assetsList.push({
        token: assets[i].token,
        balance: lendQty,
        apy: Number(assets[i].lentApy),
        balanceInUSD: amountInUSD,
        maxSupply: qty,
      });
    }
    return assetsList;
  }, [getAmountInUSD, getUserTotalAvailableBalance, getTokensPerUSDAmount]);

  // Objectify borrowed assets (format data)
  const objectifyBorrowedAssets = useCallback(async (assets) => {
    const borrowsList = [];
    for (let i = 0; i < assets.length; i++) {
      const token = assets[i].token;
      const borrowQty = assets[i].borrowQty;
      const borrowApy = assets[i].borrowApy;
      const amountInUSD = await getAmountInUSD(token, borrowQty);
      
      borrowsList.push({
        token: token,
        borrowQty: Number(borrowQty),
        borrowApy: Number(borrowApy),
        borrowedBalInUSD: amountInUSD,
      });
    }
    return borrowsList;
  }, [getAmountInUSD]);

  // Merge objectified assets with token info
  const mergeObjectifiedAssets = useCallback((assets) => {
    const result = CONFIG.TOKENS
      .filter((tokenList) => {
        return assets.some((assetList) => {
          return tokenList.address.toLowerCase() === assetList.token.toLowerCase();
        });
      })
      .map((assetObj) => ({
        ...assets.find((item) => item.token.toLowerCase() === assetObj.address.toLowerCase()),
        ...assetObj,
      }));
    return result;
  }, []);

  // Context value
  const contextValue = useMemo(() => ({
    // State
    metamaskDetails,
    userAssets,
    supplyAssets,
    assetsToBorrow,
    yourBorrows,
    supplySummary,
    borrowSummary,
    accountData,
    contract,

    // Wallet functions
    connectWallet,
    refresh,

    // Asset functions
    getUserAssets,
    getYourSupplies,
    getYourBorrows,
    getAssetsToBorrow,

    // Transaction functions
    ApproveToContinue,
    LendAsset,
    WithdrawAsset,
    borrowAsset,
    repayAsset,

    // Utility functions
    getContract,
    getPriceUSD,
    getAmountInUSD,
    numberToEthers,
    reportError,

    // ETH/WETH functions
    wrapEth,
    unwrapWeth,

    // Account functions
    getAccountData,
    getUserTotalAvailableBalance,
    getTokensPerUSDAmount,

    // Data processing functions
    objectifySuppliedAssets,
    objectifyBorrowedAssets,
    mergeObjectifiedAssets,

    // Interest functions
    updateInterests,

    // Token withdraw/deposit functions
    withdrawToken,
    depositToToken,
  }), [
    metamaskDetails,
    userAssets,
    supplyAssets,
    assetsToBorrow,
    yourBorrows,
    supplySummary,
    borrowSummary,
    accountData,
    contract,
    connectWallet,
    refresh,
    getUserAssets,
    getYourSupplies,
    getYourBorrows,
    getAssetsToBorrow,
    ApproveToContinue,
    LendAsset,
    WithdrawAsset,
    borrowAsset,
    repayAsset,
    getContract,
    getPriceUSD,
    getAmountInUSD,
    wrapEth,
    unwrapWeth,
    getAccountData,
    getUserTotalAvailableBalance,
    getTokensPerUSDAmount,
    objectifySuppliedAssets,
    objectifyBorrowedAssets,
    mergeObjectifiedAssets,
    updateInterests,
  ]);

  return (
    <lendContext.Provider value={contextValue}>
      {props.children}
    </lendContext.Provider>
  );
};

export default LendState;
