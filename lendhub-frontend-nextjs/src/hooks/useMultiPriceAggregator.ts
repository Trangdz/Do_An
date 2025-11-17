import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

interface MultiPriceData {
  price: number;
  roundId: number;
  updatedAt: Date;
  isLoading: boolean;
  error: string | null;
}

/**
 * Read price from MultiPriceAggregator by symbol
 * Contract method: getPrice(string) → (int256 price, uint80 roundId, uint256 updatedAt)
 * Assumes 8 decimals
 */
export function useMultiPriceAggregator(
  aggregatorAddress: string,
  symbol: string,
  updateInterval: number = 10000
): MultiPriceData {
  const [data, setData] = useState<MultiPriceData>({
    price: 0,
    roundId: 0,
    updatedAt: new Date(0),
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!aggregatorAddress || !symbol) {
      setData(prev => ({ ...prev, isLoading: false, error: 'Missing aggregator or symbol' }));
      return;
    }

    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const ABI = [
      'function getPrice(string symbol) external view returns (int256 price, uint80 roundId, uint256 updatedAt)'
    ];

    const fetchPrice = async () => {
      try {
        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
        const aggregator = new ethers.Contract(aggregatorAddress, ABI, provider);

        const [rawPrice, roundId, updatedAt] = await aggregator.getPrice(symbol);
        
        // Check if price data exists (roundId > 0 means price was updated at least once)
        if (Number(roundId) === 0 || Number(rawPrice) === 0) {
          if (isMounted) {
            setData(prev => ({
              ...prev,
              isLoading: false,
              error: 'No price data yet',
            }));
          }
          return;
        }
        
        // Convert from int256 (8 decimals) to USD
        // rawPrice is int256, need to handle negative values
        const priceBigInt = BigInt(rawPrice.toString());
        const price = parseFloat(ethers.formatUnits(priceBigInt < 0n ? -priceBigInt : priceBigInt, 8));

        if (isMounted) {
          setData({
            price,
            roundId: Number(roundId),
            updatedAt: new Date(Number(updatedAt) * 1000),
            isLoading: false,
            error: null,
          });
        }
      } catch (error: any) {
        if (isMounted) {
          setData(prev => ({
            ...prev,
            isLoading: false,
            error: error?.message || 'Failed to fetch multi price',
          }));
        }
      }
    };

    fetchPrice();
    intervalId = setInterval(fetchPrice, updateInterval);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [aggregatorAddress, symbol, updateInterval]);

  return data;
}

export default useMultiPriceAggregator;















