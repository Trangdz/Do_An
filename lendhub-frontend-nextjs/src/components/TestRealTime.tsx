/**
 * Test Component để kiểm tra công thức với dữ liệu giả lập có liquidityRate > 0
 */

import React, { useState, useEffect, useRef } from 'react';

const SECONDS_PER_YEAR = 31536000;
const RAY = 1e27;

interface TestRealTimeProps {
  tokenSymbol: string;
  priceUSD: number;
}

export function TestRealTime({ tokenSymbol, priceUSD }: TestRealTimeProps) {
  // Dữ liệu giả lập với liquidityRate > 0
  const mockSnapshot = {
    scaledBalance: 100, // $100
    liquidityIndex: 1e27, // RAY
    liquidityRate: 100000000000000000, // 0.1 RAY per second ≈ 3.15% APY
    lastUpdateTimestamp: Math.floor(Date.now() / 1000) - 10 // 10 giây trước
  };
  
  const [displayBalance, setDisplayBalance] = useState<number>(mockSnapshot.scaledBalance);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    console.log('🧪 TestRealTime mounted');
    
    // Clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    setIsRunning(true);
    
    console.log('🧪 Starting test real-time updates:', {
      scaledBalance: mockSnapshot.scaledBalance,
      liquidityIndex: mockSnapshot.liquidityIndex,
      liquidityRate: mockSnapshot.liquidityRate,
      liquidityRateDecimal: mockSnapshot.liquidityRate / RAY,
      APY: (mockSnapshot.liquidityRate / RAY) * SECONDS_PER_YEAR * 100,
      lastUpdateTimestamp: mockSnapshot.lastUpdateTimestamp
    });
    
    const updateBalance = () => {
      const now = Math.floor(Date.now() / 1000);
      const deltaTime = now - mockSnapshot.lastUpdateTimestamp;
      
      if (deltaTime <= 0) {
        setDisplayBalance(mockSnapshot.scaledBalance);
        return;
      }
      
      // ⭐ CÔNG THỨC ĐÚNG THEO YÊU CẦU:
      // deltaTime = currentTimestamp - lastUpdateTimestamp
      // newLiquidityIndex = oldLiquidityIndex * (1 + liquidityRate * deltaTime / SECONDS_PER_YEAR)
      // actualBalance = (scaledBalance * newLiquidityIndex) / RAY
      
      const rateDecimal = mockSnapshot.liquidityRate / RAY;
      const multiplier = 1 + (rateDecimal * deltaTime) / SECONDS_PER_YEAR;
      const newLiquidityIndex = mockSnapshot.liquidityIndex * multiplier;
      const actualBalance = (mockSnapshot.scaledBalance * newLiquidityIndex) / RAY;
      
      console.log('🧪 Test balance update:', {
        deltaTime,
        rateDecimal: rateDecimal.toFixed(12),
        multiplier: multiplier.toFixed(12),
        oldLiquidityIndex: mockSnapshot.liquidityIndex.toFixed(0),
        newLiquidityIndex: newLiquidityIndex.toFixed(0),
        scaledBalance: mockSnapshot.scaledBalance,
        actualBalance: actualBalance.toFixed(8),
        interest: (actualBalance - mockSnapshot.scaledBalance).toFixed(8),
        APY: (rateDecimal * SECONDS_PER_YEAR * 100).toFixed(4) + '%',
        formula: 'actualBalance = (scaledBalance × newLiquidityIndex) / RAY'
      });
      
      setDisplayBalance(actualBalance);
    };
    
    // Initial update
    updateBalance();
    
    // Update every 1 second
    intervalRef.current = setInterval(updateBalance, 1000);
    
    return () => {
      console.log('🧪 TestRealTime unmounted');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setIsRunning(false);
    };
  }, []);
  
  const principalNum = mockSnapshot.scaledBalance;
  const interestAccrued = displayBalance - principalNum;
  const valueUSD = displayBalance * priceUSD;
  const interestUSD = interestAccrued * priceUSD;
  
  return (
    <div className="text-center border-2 border-yellow-300 p-4 rounded-lg bg-yellow-50">
      <div className="text-sm text-yellow-600 mb-2">
        🧪 TEST REALTIME {isRunning ? '🟢' : '🔴'}
      </div>
      <div className="font-semibold text-gray-900">
        {displayBalance.toFixed(8)} {tokenSymbol}
      </div>
      {interestAccrued > 0 && (
        <div className="text-green-600 text-xs mt-1">
          +{interestAccrued.toFixed(8)} {tokenSymbol} earned
        </div>
      )}
      <div className="text-xs mt-1 text-gray-400">
        ${valueUSD.toFixed(2)} (+${interestUSD.toFixed(6)})
      </div>
      <div className="text-xs mt-1 text-yellow-500">
        APY: {((mockSnapshot.liquidityRate / RAY) * SECONDS_PER_YEAR * 100).toFixed(4)}%
      </div>
      <div className="text-xs mt-1 text-gray-500">
        Formula: actualBalance = (scaledBalance × newLiquidityIndex) / RAY
      </div>
    </div>
  );
}

