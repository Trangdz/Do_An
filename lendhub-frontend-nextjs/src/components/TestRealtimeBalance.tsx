/**
 * Test Component để kiểm tra real-time interest với dữ liệu giả lập
 */

import React, { useState, useEffect, useRef } from 'react';

const SECONDS_PER_YEAR = 31536000;
const RAY = 1e27;

interface TestRealtimeBalanceProps {
  tokenSymbol: string;
  priceUSD: number;
}

export function TestRealtimeBalance({ tokenSymbol, priceUSD }: TestRealtimeBalanceProps) {
  // Dữ liệu giả lập với liquidityRate > 0
  const mockSnapshot = {
    scaledBalance: 100, // $100
    liquidityIndex: 1e27, // RAY
    liquidityRate: 100000000000000000, // 0.1 RAY per second = ~3.15% APY
    lastUpdateTimestamp: Math.floor(Date.now() / 1000) - 10, // 10 giây trước
    snapshotIndex: 1e27
  };
  
  const [displayBalance, setDisplayBalance] = useState<number>(mockSnapshot.scaledBalance);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  
  useEffect(() => {
    console.log('🧪 TestRealtimeBalance mounted');
    
    // Clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    const savedSnapshot = mockSnapshot;
    const savedTimestamp = savedSnapshot.lastUpdateTimestamp;
    startTimeRef.current = Date.now();
    
    console.log('🧪 Starting test real-time updates:', {
      scaledBalance: savedSnapshot.scaledBalance,
      liquidityRate: savedSnapshot.liquidityRate,
      liquidityRateDecimal: savedSnapshot.liquidityRate / RAY,
      APY: (savedSnapshot.liquidityRate / RAY) * SECONDS_PER_YEAR * 100,
      lastUpdateTimestamp: savedTimestamp,
      currentTime: Math.floor(Date.now() / 1000)
    });
    
    setIsRunning(true);
    
    const updateBalance = () => {
      const now = Math.floor(Date.now() / 1000);
      const deltaTime = now - savedTimestamp;
      
      if (deltaTime <= 0) {
        setDisplayBalance(savedSnapshot.scaledBalance);
        return;
      }
      
      // Calculate new liquidity index
      const rateDecimal = savedSnapshot.liquidityRate / RAY;
      const multiplier = 1 + (rateDecimal * deltaTime) / SECONDS_PER_YEAR;
      const newLiquidityIndex = savedSnapshot.liquidityIndex * multiplier;
      
      // Calculate balance using Aave formula
      const currentBalance = savedSnapshot.scaledBalance * (newLiquidityIndex / savedSnapshot.snapshotIndex);
      
      console.log('🧪 Test balance update:', {
        deltaTime,
        rateDecimal: rateDecimal.toFixed(12),
        multiplier: multiplier.toFixed(12),
        currentBalance: currentBalance.toFixed(8),
        principal: savedSnapshot.scaledBalance,
        interest: (currentBalance - savedSnapshot.scaledBalance).toFixed(8),
        APY: (rateDecimal * SECONDS_PER_YEAR * 100).toFixed(4) + '%',
        timeElapsed: Math.floor((Date.now() - startTimeRef.current) / 1000) + 's'
      });
      
      setDisplayBalance(currentBalance);
    };
    
    // Initial update
    updateBalance();
    
    // Update every 1 second
    intervalRef.current = setInterval(updateBalance, 1000);
    
    return () => {
      console.log('🧪 TestRealtimeBalance unmounted');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setIsRunning(false);
    };
  }, []); // Empty dependency array để chỉ chạy một lần
  
  const principalNum = mockSnapshot.scaledBalance;
  const interestAccrued = displayBalance - principalNum;
  const valueUSD = displayBalance * priceUSD;
  const interestUSD = interestAccrued * priceUSD;
  
  return (
    <div className="text-center border-2 border-blue-300 p-4 rounded-lg bg-blue-50">
      <div className="text-sm text-blue-600 mb-2">
        🧪 TEST COMPONENT {isRunning ? '🟢' : '🔴'}
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
      <div className="text-xs mt-1 text-blue-500">
        APY: {((mockSnapshot.liquidityRate / RAY) * SECONDS_PER_YEAR * 100).toFixed(4)}%
      </div>
      <div className="text-xs mt-1 text-gray-500">
        Running: {isRunning ? 'Yes' : 'No'}
      </div>
    </div>
  );
}
