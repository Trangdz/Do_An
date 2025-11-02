import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface ChainlinkPriceData {
  price: number;
  roundId: number;
  updatedAt: Date;
  isLoading: boolean;
  error: string | null;
}

const AGGREGATOR_ABI = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function latestAnswer() external view returns (int256)",
  "function decimals() external view returns (uint8)",
  "function description() external view returns (string)"
];

/**
 * Hook để đọc giá từ Chainlink PriceAggregator (tuân chuẩn AggregatorV3Interface)
 * @param aggregatorAddress - Địa chỉ PriceAggregator contract
 * @param updateInterval - Tần suất cập nhật (ms), mặc định 30s
 */
export function useChainlinkPrice(
  aggregatorAddress: string,
  updateInterval: number = 30000
): ChainlinkPriceData {
  const [data, setData] = useState<ChainlinkPriceData>({
    price: 0,
    roundId: 0,
    updatedAt: new Date(),
    isLoading: true,
    error: null
  });

  useEffect(() => {
    if (!aggregatorAddress || aggregatorAddress === ethers.ZeroAddress) {
      setData(prev => ({ ...prev, isLoading: false, error: 'Invalid aggregator address' }));
      return;
    }

    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const fetchPrice = async () => {
      try {
        // Kết nối trực tiếp với ganache (không qua MetaMask)
        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
        const aggregator = new ethers.Contract(aggregatorAddress, AGGREGATOR_ABI, provider);

        // Lấy decimals và giá - thử latestRoundData trước, fallback to latestAnswer
        let decimalsValue, answer, roundId, updatedAt;
        
        try {
          const [decimalsVal, roundDataResult] = await Promise.all([
            aggregator.decimals(),
            aggregator.latestRoundData()
          ]);
          
          decimalsValue = decimalsVal;
          [roundId, answer, , updatedAt, ] = roundDataResult;
        } catch (error) {
          // Fallback to latestAnswer if latestRoundData fails
          console.warn(`latestRoundData failed, trying latestAnswer:`, error);
          const [decimalsVal, answerVal] = await Promise.all([
            aggregator.decimals(),
            aggregator.latestAnswer()
          ]);
          decimalsValue = decimalsVal;
          answer = answerVal;
          roundId = 0n;
          updatedAt = BigInt(Math.floor(Date.now() / 1000));
        }

        // Chuyển đổi giá từ int256 với decimals về số thập phân
        const priceUSD = parseFloat(ethers.formatUnits(answer, decimalsValue));

        if (isMounted) {
          setData({
            price: priceUSD,
            roundId: Number(roundId),
            updatedAt: new Date(Number(updatedAt) * 1000),
            isLoading: false,
            error: null
          });
        }
      } catch (error: any) {
        console.error('Error fetching Chainlink price:', error);
        if (isMounted) {
          setData(prev => ({
            ...prev,
            isLoading: false,
            error: error.message || 'Failed to fetch price'
          }));
        }
      }
    };

    // Fetch ngay lập tức
    fetchPrice();

    // Polling định kỳ
    intervalId = setInterval(fetchPrice, updateInterval);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [aggregatorAddress, updateInterval]);

  return data;
}






