import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONFIG } from '../config/contracts';
import { ORACLE_ABI } from '../config/abis';
import { toNumber } from '../lib/math';

export interface PriceDataPoint {
  timestamp: number;
  time: string;
  [key: string]: number | string; // Dynamic keys for each token
}

export interface PriceChartData {
  data: PriceDataPoint[];
  isLoading: boolean;
  error: string | null;
}

export function usePriceChart(
  provider: ethers.Provider | null,
  maxDataPoints: number = 20
): PriceChartData {
  const [data, setData] = useState<PriceDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrices = useCallback(async () => {
    if (!provider) return;

    setIsLoading(true);
    setError(null);

    try {
      const oracle = new ethers.Contract(CONFIG.PRICE_ORACLE, ORACLE_ABI, provider);
      
      // Load prices for all tokens
      const pricePromises = CONFIG.TOKENS.map(async (token) => {
        try {
          const price = await oracle.getAssetPrice1e18(token.address);
          return { symbol: token.symbol, price: toNumber(price) };
        } catch (err) {
          console.warn(`Failed to load price for ${token.symbol}:`, err);
          return { symbol: token.symbol, price: 0 };
        }
      });

      const prices = await Promise.all(pricePromises);
      
      const now = new Date();
      const newDataPoint: PriceDataPoint = {
        timestamp: now.getTime(),
        time: now.toLocaleTimeString(),
      };

      // Add price for each token
      prices.forEach(({ symbol, price }) => {
        newDataPoint[symbol] = price;
      });

      setData(prev => {
        const newData = [...prev, newDataPoint];
        // Keep only the last maxDataPoints
        return newData.slice(-maxDataPoints);
      });
    } catch (err: any) {
      console.error('Error loading prices:', err);
      setError(err.message || 'Failed to load prices');
    } finally {
      setIsLoading(false);
    }
  }, [provider, maxDataPoints]);

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  // Poll prices every 3 seconds
  useEffect(() => {
    if (!provider) return;

    const interval = setInterval(loadPrices, 3000);
    return () => clearInterval(interval);
  }, [loadPrices, provider]);

  return {
    data,
    isLoading,
    error,
  };
}
