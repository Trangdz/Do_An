import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONFIG } from '../config/contracts';
import { POOL_ABI, ORACLE_ABI } from '../config/abis';
import { toNumber, formatCurrency } from '../lib/math';

export interface SimpleTokenData {
  symbol: string;
  address: string;
  price: number;
  totalSupply: number;
  totalBorrow: number;
  availableLiquidity: number;
  supplyAPR: number;
  borrowAPR: number;
  utilization: number;
}

export interface SimplePoolData {
  tokens: SimpleTokenData[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

export function usePoolDataSimple(
  provider: ethers.Provider | null,
  signer: ethers.Signer | null,
  address: string | null
): SimplePoolData {
  const [tokens, setTokens] = useState<SimpleTokenData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(0);

  const loadData = useCallback(async () => {
    if (!provider) return;

    setIsLoading(true);
    setError(null);

    try {
      const contract = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, provider);
      const oracle = new ethers.Contract(CONFIG.PRICE_ORACLE, ORACLE_ABI, provider);

      const tokenPromises = CONFIG.TOKENS.map(async (token) => {
        try {
          // Read price
          const price = await oracle.getAssetPrice1e18(token.address);
          const priceNumber = toNumber(price);

          // Read reserve data
          const reserveData = await contract.reserves(token.address);
          const totalLiquidity = toNumber(reserveData.totalLiquidity);
          const totalDebt = toNumber(reserveData.totalDebt);
          const utilization = totalDebt / (totalLiquidity + totalDebt) || 0;

          // Calculate APRs (simplified)
          const borrowAPR = toNumber(reserveData.variableBorrowRate) * 100;
          const supplyAPR = toNumber(reserveData.liquidityRate) * 100;

          return {
            symbol: token.symbol,
            address: token.address,
            price: priceNumber,
            totalSupply: totalLiquidity + totalDebt,
            totalBorrow: totalDebt,
            availableLiquidity: totalLiquidity,
            supplyAPR,
            borrowAPR,
            utilization,
          };
        } catch (error) {
          console.warn(`Error loading data for ${token.symbol}:`, error);
          return {
            symbol: token.symbol,
            address: token.address,
            price: 0,
            totalSupply: 0,
            totalBorrow: 0,
            availableLiquidity: 0,
            supplyAPR: 0,
            borrowAPR: 0,
            utilization: 0,
          };
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      setTokens(tokenResults);
      setLastUpdated(Date.now());
    } catch (error: any) {
      console.error('Error loading pool data:', error);
      setError(error.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    tokens,
    isLoading,
    error,
    lastUpdated,
  };
}
