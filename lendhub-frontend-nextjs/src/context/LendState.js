import React, { useState, useCallback, useMemo, useEffect } from "react";
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

const accountDataPriceAbi = ['function getAssetPrice1e18(address asset) view returns (uint256)'];

const fallbackHelperAbi = [
  'function getAllAssets() view returns (address[])',
  'function reserves(address) view returns (tuple(uint128 reserveCash,uint128 totalDebtPrincipal,uint128 liquidityIndex,uint128 variableBorrowIndex,uint64 liquidityRateRayPerSec,uint64 variableBorrowRateRayPerSec,uint16 reserveFactorBps,uint16 ltvBps,uint16 liqThresholdBps,uint16 liqBonusBps,uint16 closeFactorBps,uint8 decimals,bool isBorrowable,uint16 optimalUBps,uint64 baseRateRayPerSec,uint64 slope1RayPerSec,uint64 slope2RayPerSec,uint40 lastUpdate))',
  'function userReserves(address user, address asset) view returns (tuple(uint128 principal,uint128 index) supply, tuple(uint128 principal,uint128 index) borrow, bool useAsCollateral)',
  'function getCurrentSupplyBalance(address user, address asset) view returns (uint256)',
  'function getCurrentDebtBalance(address user, address asset) view returns (uint256)'
];

const computeAccountDataFallback = async (rpcProvider, wallet) => {
  const pool = new ethers.Contract(LendingPoolAddress, fallbackHelperAbi, rpcProvider);
  const priceOracle = new ethers.Contract(CONFIG.PRICE_ORACLE, accountDataPriceAbi, rpcProvider);
  
  const allAssets = await pool.getAllAssets().catch(() => []);
  const tokenMeta = CONFIG.TOKENS.reduce((acc, token) => {
    if (token.address) {
      acc[token.address.toLowerCase()] = token;
    }
    return acc;
  }, {});

  const perToken = await Promise.all(allAssets.map(async (assetAddress) => {
    try {
      const [userReserve, reserveData] = await Promise.all([
        pool.userReserves(wallet, assetAddress),
        pool.reserves(assetAddress)
      ]);
      
      const [supplyBalance, debtBalance] = await Promise.all([
        pool.getCurrentSupplyBalance(wallet, assetAddress).catch(() => userReserve.supply.principal),
        pool.getCurrentDebtBalance(wallet, assetAddress).catch(() => userReserve.borrow.principal)
      ]);
      
      const priceRaw = await priceOracle.getAssetPrice1e18(assetAddress);
      if (!priceRaw || priceRaw === 0n) {
        console.warn(`⚠️ Price unavailable for asset ${assetAddress}, skipping in fallback`);
        return null;
      }
      
      const priceUSD = Number(ethers.formatUnits(priceRaw, 18));
      if (!Number.isFinite(priceUSD) || priceUSD === 0) {
        return null;
      }
      
      const supplyAmount = Number(ethers.formatUnits(supplyBalance ?? 0n, 18));
      const debtAmount = Number(ethers.formatUnits(debtBalance ?? 0n, 18));
      // CRITICAL: Use liqThresholdBps (Liquidation Threshold) for collateral calculation
      // This matches the on-chain _getAccountData calculation in LendingPool.sol (after fix)
      // The contract now uses liqThresholdBps instead of ltvBps for Health Factor calculation
      const liqThresholdBps = Number(reserveData?.liqThresholdBps ?? 0);
      const useAsCollateral = Boolean(userReserve?.useAsCollateral);
      let collateralUSD = 0;
      if (supplyAmount > 0 && useAsCollateral && liqThresholdBps > 0) {
        const weighted = (supplyAmount * priceUSD) * (liqThresholdBps / 10000);
        if (Number.isFinite(weighted)) {
          collateralUSD = weighted;
        }
      }
      
      const debtUSD = debtAmount > 0 ? debtAmount * priceUSD : 0;
      
      return {
        collateralUSD,
        debtUSD
      };
    } catch (fallbackErr) {
      console.warn(`⚠️ Fallback account data failed for asset ${assetAddress}:`, fallbackErr.message || fallbackErr);
      return null;
    }
  }));
  
  const totals = perToken.reduce((acc, value) => {
    if (!value) return acc;
    return {
      collateral: acc.collateral + (Number.isFinite(value.collateralUSD) ? value.collateralUSD : 0),
      debt: acc.debt + (Number.isFinite(value.debtUSD) ? value.debtUSD : 0)
    };
  }, { collateral: 0, debt: 0 });
  
  const fallbackHF = totals.debt === 0
    ? Number.POSITIVE_INFINITY
    : totals.collateral / totals.debt;
  
  return {
    collateralUSD: totals.collateral.toString(),
    debtUSD: totals.debt.toString(),
    healthFactor: fallbackHF === Number.POSITIVE_INFINITY ? 'Infinity' : fallbackHF.toString()
  };
};

const LendState = (props) => {
  //* Declaring all the states

  // Set metamask details with hydration-safe initialization
  const [metamaskDetails, setMetamaskDetails] = useState({
    provider: null,
    networkName: null,
    signer: null,
    currentAccount: null,
    chainId: null,
  });

  // Track if component is mounted (client-side)
  const [isMounted, setIsMounted] = useState(false);

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

  // Function to restore wallet connection from localStorage (client-side only)
  const restoreWalletConnection = useCallback(async () => {
    if (typeof window === 'undefined' || !isMounted) return;
    
    const saved = localStorage.getItem('metamaskDetails');
    if (!saved) return;
    
    try {
      const parsed = JSON.parse(saved);
      if (parsed.currentAccount && window.ethereum) {
        const { ethereum } = window;
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        
        if (accounts.length > 0 && accounts[0].toLowerCase() === parsed.currentAccount.toLowerCase()) {
          const provider = new ethers.BrowserProvider(ethereum);
          const network = await provider.getNetwork();
          const signer = await provider.getSigner();
          
          setMetamaskDetails({
            provider: provider,
            networkName: parsed.networkName,
            signer: signer,
            currentAccount: parsed.currentAccount,
            chainId: parsed.chainId,
          });
          
          console.log("Restored wallet connection:", parsed.currentAccount);
        }
      }
    } catch (error) {
      console.log('Failed to restore wallet connection:', error);
    }
  }, [isMounted]);

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
        const newDetails = {
          provider: provider,
          networkName: networkName,
          signer: signer,
          currentAccount: currentAddress,
          chainId: Number(network.chainId),
        };
        setMetamaskDetails(newDetails);
        
        // Save to localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('metamaskDetails', JSON.stringify({
            networkName: networkName,
            currentAccount: currentAddress,
            chainId: Number(network.chainId),
          }));
        }
        
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

  // Get user assets (balances) with fallback provider
  const getUserAssets = useCallback(async () => {
    console.log("🔄 Getting user assets...");
    console.log("  Provider:", !!metamaskDetails.provider);
    console.log("  Account:", metamaskDetails.currentAccount);
    
    try {
      if (!metamaskDetails.currentAccount) {
        console.warn("⚠️ No account, returning empty array");
        return [];
      }

      // ALWAYS use direct RPC provider for read operations to avoid MetaMask circuit breaker
      // Only use MetaMask provider for transactions (signing)
      const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
      const useProvider = rpcProvider; // Force RPC for reads
      
      console.log("  ✅ Using direct RPC provider for balance reads (avoids circuit breaker)");

      const assets = await Promise.all(
        CONFIG.TOKENS.map(async (token) => {
          let balance = "0";
          let balanceUSD = 0;

          try {
            if (token.isNative) {
              // ETH native balance - try MetaMask first, fallback to RPC
              try {
                const bal = await useProvider.getBalance(metamaskDetails.currentAccount);
              balance = ethers.formatEther(bal);
                console.log(`  ✅ ${token.symbol} (native): ${balance} ${token.symbol}`);
              } catch (error) {
                // Try fallback RPC provider if MetaMask fails
                if (error?.code === -32603 || error?.cause?.isBrokenCircuitError) {
                  console.warn(`⚠️ MetaMask circuit breaker, trying direct RPC for ${token.symbol}...`);
                  try {
                    const bal = await rpcProvider.getBalance(metamaskDetails.currentAccount);
                    balance = ethers.formatEther(bal);
                    console.log(`  ✅ ${token.symbol} (via RPC): ${balance} ${token.symbol}`);
                  } catch (rpcError) {
                    console.warn(`⚠️ RPC also failed for ${token.symbol}:`, rpcError.message);
                    balance = "0";
                  }
                } else if (error?.message?.includes('header not found')) {
                  console.warn(`⚠️ Ganache state issue for ${token.symbol}`);
                  balance = "0";
            } else {
                  throw error;
                }
              }
            } else {
              // ERC20 token balance - try MetaMask first, fallback to RPC
              console.log(`  🔍 Checking ${token.symbol} at ${token.address}...`);
              try {
              balance = await getTokenBalance(
                  useProvider,
                token.address,
                metamaskDetails.currentAccount,
                token.decimals
              );
                console.log(`  ✅ ${token.symbol}: ${balance} ${token.symbol}`);
              } catch (error) {
                // Try fallback RPC provider if MetaMask fails
                if (error?.code === -32603 || error?.cause?.isBrokenCircuitError) {
                  console.warn(`⚠️ MetaMask circuit breaker, trying direct RPC for ${token.symbol}...`);
                  try {
                    balance = await getTokenBalance(
                      rpcProvider,
                      token.address,
                      metamaskDetails.currentAccount,
                      token.decimals
                    );
                    console.log(`  ✅ ${token.symbol} (via RPC): ${balance} ${token.symbol}`);
                  } catch (rpcError) {
                    console.warn(`⚠️ RPC also failed for ${token.symbol}:`, rpcError.message);
                    balance = "0";
                  }
                } else {
                  throw error;
                }
              }
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
            console.error(`❌ Error getting balance for ${token.symbol}:`, error);
            console.error(`  Address: ${token.address}`);
            console.error(`  User: ${metamaskDetails.currentAccount}`);
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

      console.log("✅ Got user assets:", assets.map(a => ({
        symbol: a.symbol,
        balance: a.balance,
        balanceUSD: a.balanceUSD
      })));

      setUserAssets(assets);
      return assets;
    } catch (error) {
      console.error("❌ Critical error in getUserAssets:", error);
      reportError(error);
      return [];
    }
  }, [metamaskDetails.provider, metamaskDetails.currentAccount]);

  // Get price in USD
  const getPriceUSD = useCallback(async (asset) => {
    try {
      // Use RPC provider for reads to avoid circuit breaker
      const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
      const abi = ['function getAssetPrice1e18(address asset) view returns (uint256)'];
      const oracle = new ethers.Contract(CONFIG.PRICE_ORACLE, abi, rpcProvider);
      const price = await oracle.getAssetPrice1e18(asset);
      return ethers.formatUnits(price, 18);
    } catch (error) {
      // Silently handle "price not available" errors - this is expected when Chainlink hasn't updated prices yet
      if (error?.reason?.includes('price not available') || error?.message?.includes('price not available')) {
        // Don't log this as it's expected behavior when prices aren't set up yet
        return "0";
      }
      // Only log unexpected errors
      console.warn(`Error getting price for ${asset}:`, error.message || error.reason || error);
      return "0";
    }
  }, []);

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
        // Refresh data after successful supply
        setTimeout(() => {
          console.log("🔄 Refreshing after supply...");
          refresh();
        }, 2000);
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
        // Refresh data after successful withdraw
        setTimeout(() => {
          console.log("🔄 Refreshing after withdraw...");
          refresh();
        }, 2000);
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
        // Refresh data after successful borrow
        setTimeout(() => {
          console.log("🔄 Refreshing after borrow...");
          refresh();
        }, 2000);
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
        // Refresh data after successful repay
        setTimeout(() => {
          console.log("🔄 Refreshing after repay...");
          refresh();
        }, 2000);
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
      if (!metamaskDetails.currentAccount) return null;

      // Use RPC provider for reads to avoid circuit breaker
      const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
      const pool = new ethers.Contract(LendingPoolAddress, LendingPoolABI.abi, rpcProvider);
      const wallet = user || metamaskDetails.currentAccount || ethers.ZeroAddress;
      
      console.log('🔍 Getting account data for:', wallet);
      
      // Add error handling for empty response
      let col, debt, hf;
      try {
        [col, debt, hf] = await pool.getAccountData(wallet);
        
        console.log('📊 Account Data from Contract (raw):', {
          collateralValue1e18: col.toString(),
          debtValue1e18: debt.toString(),
          healthFactor1e18: hf.toString()
        });
      } catch (contractError) {
        console.error('❌ Contract getAccountData failed:', contractError.message);
        col = ethers.parseUnits("0", 18);
        debt = ethers.parseUnits("0", 18);
        hf = ethers.parseUnits("115792089237316195423570985008687907853269984665640564039457.584007913129639935", 18); // Max uint256
      }
      
      const collateralUSDValue = Number(ethers.formatUnits(col, 18));
      const debtUSDValue = Number(ethers.formatUnits(debt, 18));
      let healthFactorValue;

      if (debt === 0n) {
        healthFactorValue = 'Infinity';
      } else {
        const hfNumber = Number(ethers.formatUnits(hf, 18));
        // Accept any finite HF value, even if very large (just not Infinity)
        healthFactorValue = Number.isFinite(hfNumber)
          ? hfNumber.toString()
          : 'Infinity';
      }

      let accountData = {
        collateralUSD: collateralUSDValue.toString(),
        debtUSD: debtUSDValue.toString(),
        healthFactor: healthFactorValue
      };

      // Only use fallback if on-chain data is completely empty (both collateral and debt are 0)
      // AND healthFactor is invalid (Infinity or not finite)
      // This ensures we always use on-chain HF when available (even if 0.39)
      const needsFallback =
        (collateralUSDValue === 0 && debtUSDValue === 0) &&
        (healthFactorValue === 'Infinity' || !Number.isFinite(parseFloat(healthFactorValue))) &&
        metamaskDetails.currentAccount;

      if (needsFallback) {
        console.warn('⚠️ On-chain account data incomplete, computing fallback values...');
        const fallbackData = await computeAccountDataFallback(rpcProvider, wallet);
        if (fallbackData) {
          accountData = fallbackData;
          console.warn('⚠️ Using fallback HF:', fallbackData.healthFactor, '(may differ from on-chain)');
        }
      } else {
        // Log on-chain HF to help debug
        console.log('✅ Using on-chain HF:', healthFactorValue, 'Collateral:', collateralUSDValue, 'Debt:', debtUSDValue);
      }
      
      console.log('📊 Account Data (formatted):', accountData);
      
      setAccountData(accountData);
      return accountData;
    } catch (error) {
      console.error('❌ getAccountData error:', error.message);
      // Return fallback values on any error if possible
      try {
        const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
        const wallet = user || metamaskDetails.currentAccount || ethers.ZeroAddress;
        const fallbackData = await computeAccountDataFallback(rpcProvider, wallet);
        if (fallbackData) {
          setAccountData(fallbackData);
          return fallbackData;
        }
      } catch (fallbackError) {
        console.warn('⚠️ Fallback computation failed:', fallbackError.message || fallbackError);
      }

      const accountData = {
        collateralUSD: "0",
        debtUSD: "0", 
        healthFactor: "Infinity"
      };
      setAccountData(accountData);
      return accountData;
    }
  }, [metamaskDetails.provider, metamaskDetails.currentAccount]);

  // Get your supplies
  const getYourSupplies = useCallback(async () => {
    console.log("3. Getting your supplies...");
    try {
      if (!metamaskDetails.currentAccount) return [];
      
      // Use RPC provider for reads to avoid circuit breaker
      const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');

      const abi = [
        'function userReserves(address user, address asset) view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)',
        'function getCurrentSupplyBalance(address user, address asset) view returns (uint256)',
        'function getCurrentDebtBalance(address user, address asset) view returns (uint256)',
        'function reserves(address) view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)'
      ];
      const pool = new ethers.Contract(CONFIG.LENDING_POOL, abi, rpcProvider);

      const supplies = await Promise.all(
        CONFIG.TOKENS.filter(t => !t.isNative).map(async (token) => {
          try {
            console.log(`🔍 Checking supply for ${token.symbol} (${token.address})`);
            const userReserve = await pool.userReserves(metamaskDetails.currentAccount, token.address);
            const reserveData = await pool.reserves(token.address);
            const liqThresholdBps = Number(reserveData.liqThresholdBps ?? 0);
            const ltvBps = Number(reserveData.ltvBps ?? 0);
            
            // ✅ Lấy balance VỚI lãi tích lũy
            let supplyBalance, borrowBalance;
            try {
              supplyBalance = await pool.getCurrentSupplyBalance(metamaskDetails.currentAccount, token.address);
              borrowBalance = await pool.getCurrentDebtBalance(metamaskDetails.currentAccount, token.address);
              console.log(`✅ Got balance with interest for ${token.symbol}`);
            } catch (error) {
              console.warn(`⚠️ Could not get balance with interest for ${token.symbol}, using principal:`, error.message);
              // Fallback to principal
              supplyBalance = userReserve.supply.principal;
              borrowBalance = userReserve.borrow.principal;
            }
            
            // Contract returns in 1e18 (WAD), format with 18 decimals regardless of token decimals
            const supplyFormatted = ethers.formatUnits(supplyBalance, 18);
            const borrowFormatted = ethers.formatUnits(borrowBalance, 18);
            const supplyPrincipalFormatted = ethers.formatUnits(userReserve.supply.principal, 18);
            
            console.log(`📊 ${token.symbol}:`, {
              principal: supplyPrincipalFormatted,
              balanceWithInterest: supplyFormatted,
              borrowPrincipal: ethers.formatUnits(userReserve.borrow.principal, token.decimals),
              borrowWithInterest: borrowFormatted,
              isCollateral: userReserve.useAsCollateral,
            });
            
            if (Number.parseFloat(supplyFormatted) > 0) {
              const price = await getPriceUSD(token.address);
              const balanceUSD = Number(supplyFormatted) * Number(price);
              // CRITICAL: Use liqThresholdBps (Liquidation Threshold) for collateral calculation
              // This matches the on-chain _getAccountData calculation in LendingPool.sol (after fix)
              // The contract now uses liqThresholdBps instead of ltvBps for Health Factor calculation
              // Note: ltvBps is still used for borrow capacity, but liqThresholdBps is used for HF
              const collateralUSD = balanceUSD * (liqThresholdBps > 0 ? liqThresholdBps / 10000 : 0);
              
              console.log(`✅ Found supply for ${token.symbol}:`, {
                principal: supplyPrincipalFormatted,
                withInterest: supplyFormatted,
                balanceUSD,
                collateralUSD,
                liqThresholdBps, // Using LiqThreshold for collateral (matches on-chain HF calculation)
                ltvBps // Only used for borrow capacity
              });
              
              return {
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                supplyPrincipal: supplyPrincipalFormatted,
                supplyBalance: supplyFormatted,  // ✅ Với lãi
                balanceUSD,
                collateralUSD,
                priceUSD: price,
                isCollateral: userReserve.useAsCollateral,
                liqThresholdBps,
                ltvBps,
              };
            }
            console.log(`❌ No supply found for ${token.symbol}`);
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
      const totalUSDBalance = validSupplies.reduce((sum, asset) => sum + (Number(asset.balanceUSD) || 0), 0);
      const totalUSDCollateral = validSupplies.reduce((sum, asset) => sum + (Number(asset.collateralUSD) || 0), 0);
      const weightedAvgAPY = validSupplies.length > 0 ? 
        validSupplies.reduce((sum, asset) => sum + (asset.apy || 0), 0) / validSupplies.length : 0;

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
  }, [metamaskDetails.currentAccount, getPriceUSD]);

  // Get your borrows
  const getYourBorrows = useCallback(async () => {
    console.log("4. Getting your borrows...");
    try {
      if (!metamaskDetails.currentAccount) return [];

      // Use RPC provider for reads to avoid circuit breaker
      const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');

      const abi = [
        'function userReserves(address user, address asset) view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)',
        'function getCurrentSupplyBalance(address user, address asset) view returns (uint256)',
        'function getCurrentDebtBalance(address user, address asset) view returns (uint256)'
      ];
      const pool = new ethers.Contract(CONFIG.LENDING_POOL, abi, rpcProvider);

      const borrows = await Promise.all(
        CONFIG.TOKENS.filter(t => !t.isNative).map(async (token) => {
          try {
            console.log(`🔍 Checking borrow for ${token.symbol} (${token.address})`);
            const userReserve = await pool.userReserves(metamaskDetails.currentAccount, token.address);
            
            // ✅ Lấy debt VỚI lãi tích lũy
            let borrowBalance;
            try {
              borrowBalance = await pool.getCurrentDebtBalance(metamaskDetails.currentAccount, token.address);
              console.log('✅ Got debt with interest');
            } catch (error) {
              console.warn('⚠️ Could not get debt with interest, using principal:', error);
              borrowBalance = userReserve.borrow.principal;
            }
            
            // Contract returns in 1e18 (WAD), format with 18 decimals
            const borrowFormatted = ethers.formatUnits(borrowBalance, 18);
            const borrowPrincipalFormatted = ethers.formatUnits(userReserve.borrow.principal, 18);
            const supplyPrincipal = ethers.formatUnits(userReserve.supply.principal, 18);
            
            console.log(`📊 ${token.symbol} borrow:`, {
              principal: borrowPrincipalFormatted,
              debtWithInterest: borrowFormatted,
              borrowBalanceNum: parseFloat(borrowFormatted),
              supplyBalance: supplyPrincipal,
              isCollateral: userReserve.useAsCollateral,
            });
            
            // Check if borrow balance is reasonable (not corrupted)
            const borrowBalanceNum = parseFloat(borrowFormatted);
            if (borrowBalanceNum > 0 && borrowBalanceNum < 1e15) { // Reasonable range
              const price = await getPriceUSD(token.address);
              const balanceUSD = borrowBalanceNum * parseFloat(price);
              
              console.log(`✅ Found borrow for ${token.symbol}:`, {
                principal: borrowPrincipalFormatted,
                withInterest: borrowFormatted
              });
              
              return {
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                borrowPrincipal: borrowPrincipalFormatted,
                borrowBalance: borrowFormatted,  // ✅ Với lãi
                balanceUSD: balanceUSD,
                priceUSD: price,
                isCollateral: userReserve.useAsCollateral,
              };
            }
            console.log(`❌ No borrow found for ${token.symbol}`);
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
      const totalUSDBalance = validBorrows.reduce((sum, asset) => sum + (Number(asset.balanceUSD) || 0), 0);
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
  }, [metamaskDetails.currentAccount, getPriceUSD]);

  // Get assets to borrow
  const getAssetsToBorrow = useCallback(async () => {
    console.log("5. Getting assets to borrow...");
    try {
      // Use RPC provider for reads to avoid circuit breaker
      const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');

      const abi = [
        'function reserves(address) view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)'
      ];
      const pool = new ethers.Contract(CONFIG.LENDING_POOL, abi, rpcProvider);

      const assets = await Promise.all(
        CONFIG.TOKENS.filter(t => !t.isNative).map(async (token) => {
          try {
            const reserve = await pool.reserves(token.address);
            const isBorrowable = Boolean(reserve.isBorrowable);
            // Contract stores reserveCash in 18 decimals (normalized), need to convert back to token decimals
            const reserveCash1e18 = reserve.reserveCash;
            // Convert from 18 decimals to token decimals
            const reserveCash = ethers.formatUnits(reserveCash1e18, 18);
            const price = await getPriceUSD(token.address);

            // Always return the reserve (even if not borrowable or 0 cash) so UI shows total pool
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
  }, [getPriceUSD]);

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

  // Refresh all data with circuit breaker protection
  const refresh = useCallback(async () => {
    try {
      console.log("🔄 Starting refresh...");
      await Promise.all([
        getUserAssets(),
        getYourSupplies(),
        getYourBorrows(),
        getAssetsToBorrow(),
        getAccountData(),
      ]);
      console.log("✅ All data refreshed");
    } catch (error) {
      // Check if it's a circuit breaker error
      const isCircuitBreaker = 
        error?.message?.includes('circuit breaker') ||
        error?.cause?.isBrokenCircuitError ||
        error?.code === -32603;
      
      if (isCircuitBreaker) {
        console.warn("⚠️ Circuit breaker is open. Please wait a moment and try again, or reset MetaMask connection.");
        // Don't report circuit breaker errors as they're temporary
        return;
      }
      
      console.error("❌ Error during refresh:", error);
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
      if (!metamaskDetails.currentAccount) return 0;

      // Use RPC provider for reads to avoid circuit breaker
      const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');

      const abi = [
        'function getUserTotalAvailableBalanceInUSD(address user, uint256 assetType) view returns (uint256)'
      ];
      const pool = new ethers.Contract(CONFIG.LENDING_POOL, abi, rpcProvider);
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
    provider: metamaskDetails.provider,
    signer: metamaskDetails.signer,
    currentAccount: metamaskDetails.currentAccount,
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
    restoreWalletConnection,
    isMounted,
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

  // Set mounted flag and restore wallet connection
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-restore wallet connection after component is mounted
  useEffect(() => {
    if (isMounted) {
      restoreWalletConnection();
    }
  }, [isMounted, restoreWalletConnection]);

  return (
    <lendContext.Provider value={contextValue}>
      {props.children}
    </lendContext.Provider>
  );
};

export default LendState;
