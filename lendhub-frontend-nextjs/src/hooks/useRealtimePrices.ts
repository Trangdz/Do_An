import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface TokenPrice {
  address: string;
  price: number;
  lastUpdate: number;
}

interface RealtimePricesData {
  prices: { [address: string]: TokenPrice };
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch real-time prices from oracle
 * Automatically updates every interval without page reload
 */
export function useRealtimePrices(
  provider: ethers.Provider | null,
  oracleAddress: string,
  tokenAddresses: string[],
  updateInterval: number = 10000 // 10 seconds default
): RealtimePricesData {
  const [data, setData] = useState<RealtimePricesData>({
    prices: {},
    isLoading: true,
    error: null
  });

  useEffect(() => {
    if (!oracleAddress || tokenAddresses.length === 0) {
      setData({ prices: {}, isLoading: false, error: 'Missing parameters' });
      return;
    }

    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const oracleABI = [
      'function getAssetPrice1e18(address) external view returns (uint256)'
    ];

    const fetchPrices = async () => {
      try {
        // Use JsonRpcProvider directly instead of MetaMask provider
        const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        const oracle = new ethers.Contract(oracleAddress, oracleABI, rpcProvider);
        const newPrices: { [address: string]: TokenPrice } = {};

        // Fetch all prices in parallel
        const pricePromises = tokenAddresses.map(async (address) => {
          try {
            const price1e18 = await oracle.getAssetPrice1e18(address);
            const priceUSD = parseFloat(ethers.formatUnits(price1e18, 18));
            
            newPrices[address] = {
              address,
              price: priceUSD,
              lastUpdate: Date.now()
            };
          } catch (error) {
            // Silently skip if oracle fails - use price from LendState context
            console.debug(`Skipping realtime price for ${address}: oracle not available`);
            // Don't add to newPrices - let LendState handle it
          }
        });

        // Wait for all promises to complete (even if some fail)
        await Promise.allSettled(pricePromises);

        if (isMounted) {
          setData({
            prices: newPrices,
            isLoading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('Error fetching prices:', error);
        if (isMounted) {
          setData(prev => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch prices'
          }));
        }
      }
    };

    // Initial fetch
    fetchPrices();

    // Set up polling
    intervalId = setInterval(fetchPrices, updateInterval);

    // Cleanup
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [provider, oracleAddress, tokenAddresses.join(','), updateInterval]);

  return data;
}

