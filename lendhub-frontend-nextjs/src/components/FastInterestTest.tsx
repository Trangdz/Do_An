/**
 * Fast Interest Test - Lãi suất cao để dễ thấy
 */

import React, { useState, useEffect } from 'react';

export function FastInterestTest() {
  const [balance, setBalance] = useState(100);
  const [isRunning, setIsRunning] = useState(false);
  
  useEffect(() => {
    console.log('🚀 FastInterestTest mounted');
    setIsRunning(true);
    
    const interval = setInterval(() => {
      setBalance(prev => {
        // Tăng 0.01 mỗi giây (1% mỗi 100 giây)
        const newBalance = prev + 0.01;
        console.log('🚀 Fast interest update:', newBalance.toFixed(2));
        return newBalance;
      });
    }, 1000);
    
    return () => {
      console.log('🚀 FastInterestTest unmounted');
      clearInterval(interval);
      setIsRunning(false);
    };
  }, []);
  
  const interest = balance - 100;
  
  return (
    <div className="text-center border-2 border-red-300 p-4 rounded-lg bg-red-50">
      <div className="text-sm text-red-600 mb-2">
        🚀 FAST INTEREST {isRunning ? '🟢' : '🔴'}
      </div>
      <div className="text-xl font-bold text-gray-900">
        {balance.toFixed(2)} USDC
      </div>
      {interest > 0 && (
        <div className="text-green-600 text-sm mt-1 font-bold">
          +{interest.toFixed(2)} USDC earned
        </div>
      )}
      <div className="text-xs mt-1 text-gray-500">
        Increases 0.01 per second (1% per 100s)
      </div>
    </div>
  );
}
