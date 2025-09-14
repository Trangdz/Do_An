import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONFIG } from '../config/contracts';
import { POOL_ABI } from '../config/abis';
import { toNumber, aprFromPerSecRay } from '../lib/math';

export interface InterestRateDataPoint {
  timestamp: number;
  time: string;
  [key: string]: number | string; // Dynamic keys for each token's rates
}

export interface InterestRateChartData {
  data: InterestRateDataPoint[];
  isLoading: boolean;
  error: string | null;
}

export function useInterestRateChart(
  provider: ethers.Provider | null,
  maxDataPoints: number = 15
): InterestRateChartData {
  const [data, setData] = useState<InterestRateDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRates = useCallback(async () => {
    if (!provider) return;

    setIsLoading(true);
    setError(null);

    try {
      const contract = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, provider);
      
      // Load rates for all tokens
      const ratePromises = CONFIG.TOKENS.map(async (token) => {
        try {
          const reserveData = await contract.reserves(token.address);
          const supplyRate = aprFromPerSecRay(reserveData.liquidityRate);
          const borrowRate = aprFromPerSecRay(reserveData.variableBorrowRate);
          
          return { 
            symbol: token.symbol, 
            supplyRate, 
            borrowRate 
          };
        } catch (err) {
          console.warn(`Failed to load rates for ${token.symbol}:`, err);
          return { 
            symbol: token.symbol, 
            supplyRate: 0, 
            borrowRate: 0 
          };
        }
      });

      const rates = await Promise.all(ratePromises);
      
      const now = new Date();
      const newDataPoint: InterestRateDataPoint = {
        timestamp: now.getTime(),
        time: now.toLocaleTimeString(),
      };

      // Add rates for each token
      rates.forEach(({ symbol, supplyRate, borrowRate }) => {
        newDataPoint[`${symbol}_Supply`] = supplyRate;
        newDataPoint[`${symbol}_Borrow`] = borrowRate;
      });

      setData(prev => {
        const newData = [...prev, newDataPoint];
        // Keep only the last maxDataPoints
        return newData.slice(-maxDataPoints);
      });
    } catch (err: any) {
      console.error('Error loading interest rates:', err);
      setError(err.message || 'Failed to load interest rates');
    } finally {
      setIsLoading(false);
    }
  }, [provider, maxDataPoints]);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  // Poll rates every 5 seconds
  useEffect(() => {
    if (!provider) return;

    const interval = setInterval(loadRates, 5000);
    return () => clearInterval(interval);
  }, [loadRates, provider]);

  return {
    data,
    isLoading,
    error,
  };
}
