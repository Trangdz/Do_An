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
    if (!poolAddress || !assetAddress) {
      setData(prev => ({ ...prev, isLoading: false, error: 'Missing required parameters' }));
      return;
    }

    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        setData(prev => ({ ...prev, isLoading: true, error: null }));
        
        // Use RPC provider directly to avoid MetaMask circuit breaker
        const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        const aprData = await getReserveAPRData(rpcProvider, poolAddress, assetAddress);
        
        if (isMounted) {
          setData({
            ...aprData,
            isLoading: false,
            error: null
          });
        }
      } catch (error: any) {
        // Check if it's a circuit breaker error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isCircuitBreakerError = 
          errorMessage.includes('circuit breaker is open') ||
          error?.code === 'CALL_EXCEPTION' ||
          error?.code === -32603;
        
        const isReserveNotInitialized = errorMessage.includes('Reserve not initialized') || 
                                        errorMessage.includes('could not decode result data');
        
        // Only log non-circuit breaker errors
        if (!isCircuitBreakerError && !isReserveNotInitialized) {
          console.error('Error fetching reserve APR:', error);
        }
        
        if (isMounted) {
          if (isReserveNotInitialized) {
            // Silently fail with zero values (reserve not yet initialized)
            setData({
              supplyAPR: 0,
              borrowAPR: 0,
              utilization: 0,
              totalSupplied: '0',
              totalBorrowed: '0',
              isLoading: false,
              error: null // Don't show error, just zeros
            });
          } else if (isCircuitBreakerError) {
            // Don't update error state for circuit breaker - just keep previous data
            // This prevents spamming the console
          } else {
            // Real error - show it
            setData(prev => ({
              ...prev,
              isLoading: false,
              error: errorMessage
            }));
          }
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
  }, [poolAddress, assetAddress, refreshInterval]);

  return data;
}

