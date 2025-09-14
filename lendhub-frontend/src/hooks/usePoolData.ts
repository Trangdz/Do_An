import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { CONFIG } from '../config/contracts';
import { POOL_ABI, ORACLE_ABI } from '../config/abis';
import { 
  toNumber, 
  aprFromPerSecRay, 
  valueByIndex, 
  utilization,
  calculateSupplyRate,
  formatNumber,
  formatPercentage,
  formatCurrency,
  formatTokenAmount
} from '../lib/math';

// Types
export interface ReserveData {
  reserveCash: bigint;
  totalDebt: bigint;
  utilizationWad: bigint;
  liquidityRateRayPerSec: bigint;
  variableBorrowRateRayPerSec: bigint;
  liquidityIndexRay: bigint;
  variableBorrowIndexRay: bigint;
  decimals: number;
  isBorrowable: boolean;
  liquidationThreshold: number;
  ltv: number;
  reserveFactor: number;
  liquidationBonus: number;
  closeFactor: number;
}

export interface UserReserveData {
  supplyBalance1e18: bigint;
  borrowBalance1e18: bigint;
  isCollateral: boolean;
}

export interface AccountData {
  collateralValue1e18: bigint;
  debtValue1e18: bigint;
  healthFactor1e18: bigint;
}

export interface TokenData {
  token: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    isBorrowable: boolean;
    isCollateral: boolean;
  };
  price: number;
  reserveData: ReserveData;
  userReserveData?: UserReserveData;
  supplyAPR: number;
  borrowAPR: number;
  utilization: number;
  totalSupply: number;
  totalBorrow: number;
  availableLiquidity: number;
  maxBorrow: number;
  currentSupplyBalance: number;
  currentBorrowBalance: number;
}

export interface PoolData {
  tokens: TokenData[];
  accountData: AccountData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

export function usePoolData(
  provider: ethers.Provider | null,
  signer: ethers.Signer | null,
  address: string | null
): PoolData {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(0);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const contractRef = useRef<ethers.Contract | null>(null);
  const oracleRef = useRef<ethers.Contract | null>(null);

  // Initialize contracts
  useEffect(() => {
    if (!provider) return;

    contractRef.current = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, provider);
    oracleRef.current = new ethers.Contract(CONFIG.PRICE_ORACLE, ORACLE_ABI, provider);
  }, [provider]);

  // Load token data
  const loadTokenData = useCallback(async (tokenAddress: string): Promise<TokenData | null> => {
    if (!contractRef.current || !oracleRef.current) return null;

    try {
      const token = CONFIG.TOKENS.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
      if (!token) return null;

      // Read price from oracle
      const price = await oracleRef.current.getAssetPrice1e18(tokenAddress);
      const priceNumber = toNumber(price);

      // Read reserve data
      const reserveDataRaw = await contractRef.current.reserves(tokenAddress);
      const reserveData: ReserveData = {
        reserveCash: BigInt(reserveDataRaw.totalLiquidity),
        totalDebt: BigInt(reserveDataRaw.totalDebt),
        utilizationWad: BigInt(0), // Will calculate below
        liquidityRateRayPerSec: BigInt(reserveDataRaw.liquidityRate),
        variableBorrowRateRayPerSec: BigInt(reserveDataRaw.variableBorrowRate),
        liquidityIndexRay: BigInt(reserveDataRaw.liquidityIndex),
        variableBorrowIndexRay: BigInt(reserveDataRaw.variableBorrowIndex),
        decimals: Number(reserveDataRaw.decimals),
        isBorrowable: Boolean(reserveDataRaw.isBorrowable),
        liquidationThreshold: Number(reserveDataRaw.liquidationThreshold),
        ltv: Number(reserveDataRaw.ltv),
        reserveFactor: Number(reserveDataRaw.reserveFactor),
        liquidationBonus: Number(reserveDataRaw.liquidationBonus),
        closeFactor: Number(reserveDataRaw.closeFactor),
      };

      // Read user reserve data if address provided
      let userReserveData: UserReserveData | undefined;
      if (address) {
        try {
          const userDataRaw = await contractRef.current.getUserReserveData(address, tokenAddress);
          userReserveData = {
            supplyBalance1e18: BigInt(userDataRaw.supplyBalance1e18),
            borrowBalance1e18: BigInt(userDataRaw.borrowBalance1e18),
            isCollateral: Boolean(userDataRaw.isCollateral),
          };
        } catch (error) {
          console.warn(`Failed to load user data for ${token.symbol}:`, error);
          // Set default values if user data not available
          userReserveData = {
            supplyBalance1e18: 0n,
            borrowBalance1e18: 0n,
            isCollateral: false,
          };
        }
      }

      // Calculate derived values
      const utilizationRate = utilization(reserveData.reserveCash, reserveData.totalDebt);
      const borrowAPR = aprFromPerSecRay(reserveData.variableBorrowRateRayPerSec);
      const supplyAPR = calculateSupplyRate(
        reserveData.variableBorrowRateRayPerSec,
        utilizationRate,
        reserveData.reserveFactor
      );

      // Calculate current balances using index
      const currentSupplyBalance = userReserveData ? 
        toNumber(valueByIndex(userReserveData.supplyBalance1e18, reserveData.liquidityIndexRay, reserveData.liquidityIndexRay)) : 0;
      const currentBorrowBalance = userReserveData ? 
        toNumber(valueByIndex(userReserveData.borrowBalance1e18, reserveData.variableBorrowIndexRay, reserveData.variableBorrowIndexRay)) : 0;

      // Calculate max borrow
      const collateralValue = accountData ? toNumber(accountData.collateralValue1e18) : 0;
      const debtValue = accountData ? toNumber(accountData.debtValue1e18) : 0;
      const maxBorrowUSD = Math.max(0, (collateralValue - debtValue) / price);
      const maxBorrow = Math.min(maxBorrowUSD, toNumber(reserveData.reserveCash));

      return {
        token,
        price: priceNumber,
        reserveData,
        userReserveData,
        supplyAPR,
        borrowAPR,
        utilization: utilizationRate,
        totalSupply: toNumber(reserveData.reserveCash) + toNumber(reserveData.totalDebt),
        totalBorrow: toNumber(reserveData.totalDebt),
        availableLiquidity: toNumber(reserveData.reserveCash),
        maxBorrow,
        currentSupplyBalance,
        currentBorrowBalance,
      };
    } catch (error) {
      console.error(`Error loading data for ${tokenAddress}:`, error);
      return null;
    }
  }, [address, accountData]);

  // Load account data
  const loadAccountData = useCallback(async (): Promise<AccountData | null> => {
    if (!contractRef.current || !address) return null;

    try {
      const [collateralValue, debtValue, healthFactor] = await contractRef.current.getAccountData(address);
      return {
        collateralValue1e18: BigInt(collateralValue),
        debtValue1e18: BigInt(debtValue),
        healthFactor1e18: BigInt(healthFactor),
      };
    } catch (error) {
      console.error('Error loading account data:', error);
      return null;
    }
  }, [address]);

  // Load all data
  const loadAllData = useCallback(async () => {
    if (!provider || !contractRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load account data first
      const account = await loadAccountData();
      setAccountData(account);

      // Load token data
      const tokenPromises = CONFIG.TOKENS.map(token => loadTokenData(token.address));
      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter((token): token is TokenData => token !== null);
      
      setTokens(validTokens);
      setLastUpdated(Date.now());
    } catch (error: any) {
      console.error('Error loading pool data:', error);
      setError(error.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [provider, loadAccountData, loadTokenData]);

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Setup event listeners
  useEffect(() => {
    if (!contractRef.current) return;

    const handleReserveDataUpdated = (event: any) => {
      console.log('Reserve data updated:', event);
      loadAllData();
    };

    contractRef.current.on('ReserveDataUpdated', handleReserveDataUpdated);

    return () => {
      if (contractRef.current) {
        contractRef.current.removeAllListeners('ReserveDataUpdated');
      }
    };
  }, [loadAllData]);

  // Poll oracle prices every 3 seconds
  useEffect(() => {
    if (!oracleRef.current) return;

    const pollPrices = async () => {
      try {
        const pricePromises = CONFIG.TOKENS.map(async (token) => {
          const price = await oracleRef.current!.getAssetPrice1e18(token.address);
          return { address: token.address, price: toNumber(price) };
        });

        const prices = await Promise.all(pricePromises);
        
        setTokens(prev => prev.map(tokenData => {
          const priceData = prices.find(p => p.address.toLowerCase() === tokenData.token.address.toLowerCase());
          if (priceData) {
            return {
              ...tokenData,
              price: priceData.price,
            };
          }
          return tokenData;
        }));
      } catch (error) {
        console.error('Error polling prices:', error);
      }
    };

    pollIntervalRef.current = setInterval(pollPrices, 3000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (contractRef.current) {
        contractRef.current.removeAllListeners();
      }
    };
  }, []);

  return {
    tokens,
    accountData,
    isLoading,
    error,
    lastUpdated,
  };
}

// Helper hook for specific token data
export function useTokenData(
  provider: ethers.Provider | null,
  signer: ethers.Signer | null,
  address: string | null,
  tokenAddress: string
): TokenData | null {
  const { tokens } = usePoolData(provider, signer, address);
  return tokens.find(token => token.token.address.toLowerCase() === tokenAddress.toLowerCase()) || null;
}

// Helper hook for account summary
export function useAccountSummary(
  provider: ethers.Provider | null,
  signer: ethers.Signer | null,
  address: string | null
) {
  const { accountData, tokens } = usePoolData(provider, signer, address);

  const collateralValue = accountData ? toNumber(accountData.collateralValue1e18) : 0;
  const debtValue = accountData ? toNumber(accountData.debtValue1e18) : 0;
  const healthFactor = accountData ? toNumber(accountData.healthFactor1e18) : 0;

  const totalSupplied = tokens.reduce((sum, token) => sum + token.currentSupplyBalance, 0);
  const totalBorrowed = tokens.reduce((sum, token) => sum + token.currentBorrowBalance, 0);

  return {
    collateralValue,
    debtValue,
    healthFactor,
    totalSupplied,
    totalBorrowed,
    isHealthy: healthFactor >= 1,
    canLiquidate: healthFactor < 1,
  };
}
