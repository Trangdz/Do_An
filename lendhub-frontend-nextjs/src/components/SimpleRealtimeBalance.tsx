/**
 * Simple Realtime Balance - Logic đơn giản, chắc chắn hoạt động
 */

import React, { useState, useEffect, useRef } from 'react';

const SECONDS_PER_YEAR = 31536000;

interface SimpleRealtimeBalanceProps {
  tokenSymbol: string;
  priceUSD: number;
}

export function SimpleRealtimeBalance({ tokenSymbol, priceUSD }: SimpleRealtimeBalanceProps) {
  // Dữ liệu giả lập
  const principal = 100; // $100
  const apr = 5; // 5% APY
  
  // Load từ localStorage nếu có
  const getStoredData = () => {
    try {
      const stored = localStorage.getItem(`simple_realtime_${tokenSymbol}`);
      if (stored) {
        const data = JSON.parse(stored);
        console.log('📱 Loaded from localStorage:', data);
        return data;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load from localStorage:', error);
    }
    return null;
  };
  
  const storedData = getStoredData();
  const initialBalance = storedData ? storedData.balance : principal;
  const initialStartTime = storedData ? storedData.startTime : Date.now();
  
  const [displayBalance, setDisplayBalance] = useState<number>(initialBalance);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(initialStartTime);
  
  // Save to localStorage
  const saveToStorage = (balance: number) => {
    try {
      const data = {
        balance,
        startTime: startTimeRef.current,
        timestamp: Date.now()
      };
      localStorage.setItem(`simple_realtime_${tokenSymbol}`, JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ Failed to save to localStorage:', error);
    }
  };
  
  useEffect(() => {
    console.log('💰 SimpleRealtimeBalance mounted');
    
    // Clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    startTimeRef.current = Date.now();
    setIsRunning(true);
    
    console.log('💰 Starting simple real-time updates:', {
      principal,
      apr,
      ratePerSecond: apr / 100 / SECONDS_PER_YEAR
    });
    
    const updateBalance = () => {
      const now = Date.now();
      const timeElapsed = (now - startTimeRef.current) / 1000; // seconds
      
      // Simple compound interest: balance = principal * (1 + rate)^time
      // rate per second = APR / 100 / SECONDS_PER_YEAR
      const ratePerSecond = apr / 100 / SECONDS_PER_YEAR;
      const multiplier = Math.pow(1 + ratePerSecond, timeElapsed);
      const currentBalance = principal * multiplier;
      
      console.log('💰 Simple balance update:', {
        timeElapsed: timeElapsed.toFixed(2) + 's',
        ratePerSecond: ratePerSecond.toExponential(6),
        multiplier: multiplier.toFixed(12),
        currentBalance: currentBalance.toFixed(8),
        principal,
        interest: (currentBalance - principal).toFixed(8),
        apr: apr + '%'
      });
      
      setDisplayBalance(currentBalance);
    };
    
    // Initial update
    updateBalance();
    
    // Update every 1 second
    intervalRef.current = setInterval(updateBalance, 1000);
    
    return () => {
      console.log('💰 SimpleRealtimeBalance unmounted');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setIsRunning(false);
    };
  }, []); // Empty dependency array
  
  const interestAccrued = displayBalance - principal;
  const valueUSD = displayBalance * priceUSD;
  const interestUSD = interestAccrued * priceUSD;
  
  return (
    <div className="text-center border-2 border-purple-300 p-4 rounded-lg bg-purple-50">
      <div className="text-sm text-purple-600 mb-2">
        💰 SIMPLE REALTIME {isRunning ? '🟢' : '🔴'}
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
      <div className="text-xs mt-1 text-purple-500">
        APY: {apr}%
      </div>
      <div className="text-xs mt-1 text-gray-500">
        Running: {isRunning ? 'Yes' : 'No'} | Restored: {storedData ? 'Yes' : 'No'}
      </div>
    </div>
  );
}