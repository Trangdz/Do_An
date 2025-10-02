import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getReserveAPRData } from '../lib/aprCalculations';

interface ReserveAPRData {
  supplyAPR: number;
  borrowAPR: number;
  utilization: number;
  totalSupplied: string;
  totalBorrowed: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * React hook to fetch and update reserve APR data
 * 
 * @param provider - Ethers provider
 * @param poolAddress - LendingPool contract address
 * @param assetAddress - Token address
 * @param refreshInterval - Optional refresh interval in milliseconds (default: 30000ms = 30s)
 * @returns Reserve APR data and loading state
 */
export function useReserveAPR(
  provider: ethers.Provider | null,
  poolAddress: string,
  assetAddress: string,
  refreshInterval: number = 30000
): ReserveAPRData {
  const [data, setData] = useState<ReserveAPRData>({
    supplyAPR: 0,
    borrowAPR: 0,
    utilization: 0,
    totalSupplied: '0',
    totalBorrowed: '0',
    isLoading: true,
    error: null
  });

  useEffect(() => {
    if (!provider || !poolAddress || !assetAddress) {
      setData(prev => ({ ...prev, isLoading: false, error: 'Missing required parameters' }));
      return;
    }

    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        setData(prev => ({ ...prev, isLoading: true, error: null }));
        
        const aprData = await getReserveAPRData(provider, poolAddress, assetAddress);
        
        if (isMounted) {
          setData({
            ...aprData,
            isLoading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('Error fetching reserve APR:', error);
        if (isMounted) {
          setData(prev => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch APR data'
          }));
        }
      }
    };

    // Initial fetch
    fetchData();

    // Set up periodic refresh
    if (refreshInterval > 0) {
      intervalId = setInterval(fetchData, refreshInterval);
    }

    // Cleanup
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [provider, poolAddress, assetAddress, refreshInterval]);

  return data;
}

