/**
 * Simple Interest Test - Tính lãi đơn giản nhất
 */

import React, { useState, useEffect } from 'react';

export function SimpleInterestTest() {
  const [balance, setBalance] = useState(100);
  const [isRunning, setIsRunning] = useState(false);
  
  useEffect(() => {
    console.log('💰 SimpleInterestTest mounted');
    setIsRunning(true);
    
    const interval = setInterval(() => {
      setBalance(prev => {
        // Tăng 0.000001 mỗi giây (đơn giản)
        const newBalance = prev + 0.000001;
        console.log('💰 Interest update:', newBalance.toFixed(8));
        return newBalance;
      });
    }, 1000);
    
    return () => {
      console.log('💰 SimpleInterestTest unmounted');
      clearInterval(interval);
      setIsRunning(false);
    };
  }, []);
  
  const interest = balance - 100;
  
  return (
    <div className="text-center border-2 border-blue-300 p-4 rounded-lg bg-blue-50">
      <div className="text-sm text-blue-600 mb-2">
        💰 SIMPLE INTEREST {isRunning ? '🟢' : '🔴'}
      </div>
      <div className="text-xl font-bold text-gray-900">
        {balance.toFixed(8)} USDC
      </div>
      {interest > 0 && (
        <div className="text-green-600 text-xs mt-1">
          +{interest.toFixed(8)} USDC earned
        </div>
      )}
      <div className="text-xs mt-1 text-gray-500">
        Increases 0.000001 per second
      </div>
    </div>
  );
}

