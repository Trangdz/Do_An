/**
 * Test Component với công thức đúng theo yêu cầu
 */

import React, { useState, useEffect, useRef } from 'react';

const SECONDS_PER_YEAR = 31536000;
const RAY = 1e27;

interface TestFormulaProps {
  tokenSymbol: string;
  priceUSD: number;
}

export function TestFormula({ tokenSymbol, priceUSD }: TestFormulaProps) {
  // Dữ liệu giả lập theo yêu cầu
  const mockData = {
    scaledBalance: 100, // Số dư gốc
    liquidityIndex: 1e27, // LiquidityIndex ban đầu (RAY)
    liquidityRate: 100000000000000000, // liquidityRate (RAY per second) = 0.1 RAY/s ≈ 3.15% APY
    lastUpdateTimestamp: Math.floor(Date.now() / 1000) - 10 // 10 giây trước
  };
  
  const [displayBalance, setDisplayBalance] = useState<number>(mockData.scaledBalance);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    console.log('🧮 TestFormula mounted');
    
    // Clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    setIsRunning(true);
    
    console.log('🧮 Starting formula test:', {
      scaledBalance: mockData.scaledBalance,
      liquidityIndex: mockData.liquidityIndex,
      liquidityRate: mockData.liquidityRate,
      liquidityRateDecimal: mockData.liquidityRate / RAY,
      APY: (mockData.liquidityRate / RAY) * SECONDS_PER_YEAR * 100,
      lastUpdateTimestamp: mockData.lastUpdateTimestamp
    });
    
    const updateBalance = () => {
      const now = Math.floor(Date.now() / 1000);
      const deltaTime = now - mockData.lastUpdateTimestamp;
      
      if (deltaTime <= 0) {
        setDisplayBalance(mockData.scaledBalance);
        return;
      }
      
      // Công thức theo yêu cầu:
      // deltaTime = currentTimestamp - lastUpdateTimestamp
      // newLiquidityIndex = oldLiquidityIndex * (1 + liquidityRate * deltaTime / SECONDS_PER_YEAR)
      // actualBalance = scaledBalance * newLiquidityIndex
      
      const rateDecimal = mockData.liquidityRate / RAY;
      const multiplier = 1 + (rateDecimal * deltaTime) / SECONDS_PER_YEAR;
      const newLiquidityIndex = mockData.liquidityIndex * multiplier;
      
      // ⭐ QUAN TRỌNG: scaledBalance phải chia cho RAY để có đơn vị đúng
      // scaledBalance từ blockchain đã được chuẩn hóa (chia cho 1e18)
      // Nhưng liquidityIndex là RAY (1e27), nên phải chia thêm cho RAY
      const actualBalance = (mockData.scaledBalance * newLiquidityIndex) / RAY;
      
      console.log('🧮 Formula test update:', {
        deltaTime,
        rateDecimal: rateDecimal.toFixed(12),
        multiplier: multiplier.toFixed(12),
        oldLiquidityIndex: mockData.liquidityIndex.toFixed(0),
        newLiquidityIndex: newLiquidityIndex.toFixed(0),
        scaledBalance: mockData.scaledBalance,
        actualBalance: actualBalance.toFixed(8),
        interest: (actualBalance - mockData.scaledBalance).toFixed(8),
        APY: (rateDecimal * SECONDS_PER_YEAR * 100).toFixed(4) + '%',
        formula: 'actualBalance = scaledBalance × newLiquidityIndex'
      });
      
      setDisplayBalance(actualBalance);
    };
    
    // Initial update
    updateBalance();
    
    // Update every 1 second
    intervalRef.current = setInterval(updateBalance, 1000);
    
    return () => {
      console.log('🧮 TestFormula unmounted');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setIsRunning(false);
    };
  }, []);
  
  const principalNum = mockData.scaledBalance;
  const interestAccrued = displayBalance - principalNum;
  const valueUSD = displayBalance * priceUSD;
  const interestUSD = interestAccrued * priceUSD;
  
  return (
    <div className="text-center border-2 border-orange-300 p-4 rounded-lg bg-orange-50">
      <div className="text-sm text-orange-600 mb-2">
        🧮 FORMULA TEST {isRunning ? '🟢' : '🔴'}
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
      <div className="text-xs mt-1 text-orange-500">
        APY: {((mockData.liquidityRate / RAY) * SECONDS_PER_YEAR * 100).toFixed(4)}%
      </div>
      <div className="text-xs mt-1 text-gray-500">
        Formula: actualBalance = (scaledBalance × newLiquidityIndex) / RAY
      </div>
    </div>
  );
}
