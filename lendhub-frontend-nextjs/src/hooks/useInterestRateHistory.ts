import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getReserveAPRData } from '../lib/aprCalculations';

export interface RateDataPoint {
  timestamp: number;
  time: string; // HH:MM:SS format
  supplyAPR: number;
  borrowAPR: number;
  utilization: number;
}

export interface AssetRateHistory {
  [assetAddress: string]: {
    symbol: string;
    history: RateDataPoint[];
  };
}

interface UseInterestRateHistoryReturn {
  history: AssetRateHistory;
  isLoading: boolean;
  error: string | null;
  clearHistory: () => void;
}

const MAX_DATA_POINTS = 50; // Keep last 50 data points per asset
const STORAGE_KEY = 'lendhub_rate_history';
const STORAGE_VERSION = '2.0'; // Version 2.0: Fixed duplicate legend issue

/**
 * Hook to track interest rate history over time for multiple assets
 * Stores data in localStorage for persistence
 */
export function useInterestRateHistory(
  provider: ethers.Provider | null,
  poolAddress: string,
  assets: { address: string; symbol: string }[],
  updateInterval: number = 5000 // Update every 5 seconds
): UseInterestRateHistoryReturn {
  const [history, setHistory] = useState<AssetRateHistory>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedVersion = localStorage.getItem(STORAGE_KEY + '_version');
      
      // Only load if version matches (clear old data from different deploys)
      if (stored && storedVersion === STORAGE_VERSION) {
        const parsed = JSON.parse(stored);
        
        // Check for duplicate addresses (data corruption)
        const addresses = Object.keys(parsed);
        const symbols = Object.values(parsed).map((d: any) => d.symbol);
        const hasDuplicates = symbols.length !== new Set(symbols).size;
        
        if (hasDuplicates) {
          console.warn('⚠️  Detected duplicate data in localStorage, clearing...');
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(STORAGE_KEY + '_version');
          setHistory({});
        } else {
          setHistory(parsed);
          console.log('📊 Loaded rate history from localStorage (v' + STORAGE_VERSION + ')');
        }
      } else {
        // Clear old data
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_KEY + '_version');
        console.log('🧹 Cleared old rate history (version mismatch)');
      }
    } catch (err) {
      console.error('Failed to load rate history from localStorage:', err);
      // Clear on error
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY + '_version');
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (Object.keys(history).length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        localStorage.setItem(STORAGE_KEY + '_version', STORAGE_VERSION);
      } catch (err) {
        console.error('Failed to save rate history to localStorage:', err);
      }
    }
  }, [history]);

  // Fetch rates for all assets
  const fetchAllRates = useCallback(async () => {
    if (!provider || !poolAddress || assets.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const timestamp = Date.now();
    const time = new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    try {
      // Fetch rates for all assets in parallel
      const results = await Promise.allSettled(
        assets.map(asset => 
          getReserveAPRData(provider, poolAddress, asset.address)
            .then(data => ({ asset, data }))
        )
      );

      // Process results and update history
      setHistory(prevHistory => {
        const newHistory: AssetRateHistory = { ...prevHistory };

        results.forEach((result, index) => {
          const asset = assets[index];
          
          if (result.status === 'fulfilled') {
            const { data } = result.value;
            
            // Initialize history for this asset if needed
            if (!newHistory[asset.address]) {
              newHistory[asset.address] = {
                symbol: asset.symbol,
                history: []
              };
            }

            // Add new data point
            const dataPoint: RateDataPoint = {
              timestamp,
              time,
              supplyAPR: data.supplyAPR,
              borrowAPR: data.borrowAPR,
              utilization: data.utilization
            };

            newHistory[asset.address].history.push(dataPoint);

            // Keep only last MAX_DATA_POINTS
            if (newHistory[asset.address].history.length > MAX_DATA_POINTS) {
              newHistory[asset.address].history = newHistory[asset.address].history.slice(-MAX_DATA_POINTS);
            }
          } else {
            console.warn(`Failed to fetch rates for ${asset.symbol}:`, result.reason);
          }
        });

        return newHistory;
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch rate history';
      console.error('Error fetching rate history:', err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [provider, poolAddress, assets]); // Removed 'history' from dependencies!

  // Set up periodic polling
  useEffect(() => {
    if (!provider || !poolAddress || assets.length === 0) {
      setIsLoading(false);
      return;
    }

    // Initial fetch
    fetchAllRates();

    // Set up interval
    const intervalId = setInterval(fetchAllRates, updateInterval);

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [provider, poolAddress, assets.length, updateInterval]); // Don't include fetchAllRates to avoid infinite loop

  const clearHistory = useCallback(() => {
    setHistory({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    history,
    isLoading,
    error,
    clearHistory
  };
}

