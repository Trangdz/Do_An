import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { ContractManager } from '../utils/contracts';
import { MarketData, Token, ReserveData, UserReserveData, AccountData, TransactionStatus } from '../types';
import { 
  toNumber, 
  calculateUtilization, 
  rateRayToAPR, 
  calculateSupplyRate,
  calculateHealthFactor 
} from '../utils/math';
import { CONTRACT_ADDRESSES } from '../types';

export function useLendingPool(provider: ethers.Provider | null, signer: ethers.Signer | null) {
  const [contractManager, setContractManager] = useState<ContractManager | null>(null);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [userAccount, setUserAccount] = useState<AccountData | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>('idle');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize contract manager
  useEffect(() => {
    if (provider) {
      const manager = new ContractManager(provider);
      if (signer) {
        manager.setSigner(signer);
      }
      setContractManager(manager);
    }
  }, [provider, signer]);

  // Load market data
  const loadMarketData = useCallback(async () => {
    if (!contractManager) return;

    setIsLoading(true);
    try {
      const tokens: Token[] = [
        {
          address: CONTRACT_ADDRESSES.WETH,
          symbol: 'WETH',
          name: 'Wrapped Ethereum',
          decimals: 18,
          isBorrowable: false,
          isCollateral: true,
        },
        {
          address: CONTRACT_ADDRESSES.DAI,
          symbol: 'DAI',
          name: 'Dai Stablecoin',
          decimals: 18,
          isBorrowable: true,
          isCollateral: false,
        },
      ];

      const marketDataPromises = tokens.map(async (token) => {
        try {
          const [reserveData, price] = await Promise.all([
            contractManager.getReserveData(token.address),
            contractManager.getAssetPrice(token.address),
          ]);

          const priceNumber = toNumber(price);
          const utilization = calculateUtilization(reserveData.totalDebt, reserveData.reserveCash);
          const borrowAPR = rateRayToAPR(reserveData.variableBorrowRateRayPerSec);
          const supplyAPR = calculateSupplyRate(
            reserveData.variableBorrowRateRayPerSec,
            utilization,
            toNumber(reserveData.reserveFactor)
          );

          return {
            token,
            reserveData,
            price: priceNumber,
            supplyAPR,
            borrowAPR,
            utilization,
            totalSupply: toNumber(reserveData.reserveCash) + toNumber(reserveData.totalDebt),
            totalBorrow: toNumber(reserveData.totalDebt),
            availableLiquidity: toNumber(reserveData.reserveCash),
          } as MarketData;
        } catch (error) {
          console.error(`Error loading data for ${token.symbol}:`, error);
          return null;
        }
      });

      const results = await Promise.all(marketDataPromises);
      const validResults = results.filter((result): result is MarketData => result !== null);
      setMarketData(validResults);
    } catch (error) {
      console.error('Error loading market data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [contractManager]);

  // Load user account data
  const loadUserAccount = useCallback(async (userAddress: string) => {
    if (!contractManager) return;

    try {
      const [collateralValue, debtValue, healthFactor] = await contractManager.getAccountData(userAddress);
      
      setUserAccount({
        collateralValue: toNumber(collateralValue),
        debtValue: toNumber(debtValue),
        healthFactor: toNumber(healthFactor),
      });
    } catch (error) {
      console.error('Error loading user account:', error);
    }
  }, [contractManager]);

  // Load user reserve data for specific asset
  const loadUserReserveData = useCallback(async (userAddress: string, assetAddress: string) => {
    if (!contractManager) return null;

    try {
      const [supplyBalance, borrowBalance, isCollateral] = await contractManager.getUserReserveData(
        userAddress,
        assetAddress
      );

      return {
        supplyBalance: toNumber(supplyBalance),
        borrowBalance: toNumber(borrowBalance),
        isCollateral,
      } as UserReserveData;
    } catch (error) {
      console.error('Error loading user reserve data:', error);
      return null;
    }
  }, [contractManager]);

  // Transaction handlers
  const handleTransaction = async (txPromise: Promise<any>, action: string) => {
    setTransactionStatus('pending');
    try {
      const tx = await txPromise;
      await tx.wait();
      setTransactionStatus('confirmed');
      
      // Reload data after successful transaction
      await loadMarketData();
      // Note: userAccount is not available here, this will be handled by the calling component
      
      return tx;
    } catch (error) {
      console.error(`Error ${action}:`, error);
      setTransactionStatus('failed');
      throw error;
    } finally {
      // Reset status after a delay
      setTimeout(() => setTransactionStatus('idle'), 3000);
    }
  };

  const supply = useCallback(async (assetAddress: string, amount: string, userAddress: string) => {
    if (!contractManager) throw new Error('Contract manager not initialized');
    
    const amountBN = ethers.parseUnits(amount, 18);
    
    // Approve token first
    await contractManager.approveToken(assetAddress, CONTRACT_ADDRESSES.LENDING_POOL, amountBN);
    
    // Then supply
    return handleTransaction(
      contractManager.supply(assetAddress, amountBN),
      'supplying'
    );
  }, [contractManager]);

  const withdraw = useCallback(async (assetAddress: string, amount: string) => {
    if (!contractManager) throw new Error('Contract manager not initialized');
    
    const amountBN = ethers.parseUnits(amount, 18);
    
    return handleTransaction(
      contractManager.withdraw(assetAddress, amountBN),
      'withdrawing'
    );
  }, [contractManager]);

  const borrow = useCallback(async (assetAddress: string, amount: string) => {
    if (!contractManager) throw new Error('Contract manager not initialized');
    
    const amountBN = ethers.parseUnits(amount, 18);
    
    return handleTransaction(
      contractManager.borrow(assetAddress, amountBN),
      'borrowing'
    );
  }, [contractManager]);

  const repay = useCallback(async (assetAddress: string, amount: string, onBehalfOf: string) => {
    if (!contractManager) throw new Error('Contract manager not initialized');
    
    const amountBN = ethers.parseUnits(amount, 18);
    
    // Approve token first
    await contractManager.approveToken(assetAddress, CONTRACT_ADDRESSES.LENDING_POOL, amountBN);
    
    // Then repay
    return handleTransaction(
      contractManager.repay(assetAddress, amountBN, onBehalfOf),
      'repaying'
    );
  }, [contractManager]);

  const liquidate = useCallback(async (debtAsset: string, collateralAsset: string, user: string, debtAmount: string) => {
    if (!contractManager) throw new Error('Contract manager not initialized');
    
    const amountBN = ethers.parseUnits(debtAmount, 18);
    
    // Approve debt token first
    await contractManager.approveToken(debtAsset, CONTRACT_ADDRESSES.LENDING_POOL, amountBN);
    
    // Then liquidate
    return handleTransaction(
      contractManager.liquidate(debtAsset, collateralAsset, user, amountBN),
      'liquidating'
    );
  }, [contractManager]);

  // Event listeners
  useEffect(() => {
    if (!contractManager) return;

    const handleReserveDataUpdated = (event: any) => {
      console.log('Reserve data updated:', event);
      loadMarketData();
    };

    const handleSupplied = (event: any) => {
      console.log('Supplied:', event);
      loadMarketData();
    };

    const handleWithdrawn = (event: any) => {
      console.log('Withdrawn:', event);
      loadMarketData();
    };

    const handleBorrowed = (event: any) => {
      console.log('Borrowed:', event);
      loadMarketData();
    };

    const handleRepaid = (event: any) => {
      console.log('Repaid:', event);
      loadMarketData();
    };

    const handleLiquidated = (event: any) => {
      console.log('Liquidated:', event);
      loadMarketData();
    };

    // Set up event listeners
    contractManager.onReserveDataUpdated(handleReserveDataUpdated);
    contractManager.onSupplied(handleSupplied);
    contractManager.onWithdrawn(handleWithdrawn);
    contractManager.onBorrowed(handleBorrowed);
    contractManager.onRepaid(handleRepaid);
    contractManager.onLiquidated(handleLiquidated);

    // Cleanup
    return () => {
      contractManager.removeAllListeners();
    };
  }, [contractManager, loadMarketData]);

  return {
    marketData,
    userAccount,
    transactionStatus,
    isLoading,
    loadMarketData,
    loadUserAccount,
    loadUserReserveData,
    supply,
    withdraw,
    borrow,
    repay,
    liquidate,
  };
}
