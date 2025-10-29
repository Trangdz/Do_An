/**
 * Simple Counter Test - Kiểm tra React state update có hoạt động không
 */

import React, { useState, useEffect } from 'react';

export function SimpleCounterTest() {
  const [count, setCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  
  useEffect(() => {
    console.log('🔢 SimpleCounterTest mounted');
    setIsRunning(true);
    
    const interval = setInterval(() => {
      setCount(prev => {
        const newCount = prev + 1;
        console.log('🔢 Counter update:', newCount);
        return newCount;
      });
    }, 1000);
    
    return () => {
      console.log('🔢 SimpleCounterTest unmounted');
      clearInterval(interval);
      setIsRunning(false);
    };
  }, []);
  
  return (
    <div className="text-center border-2 border-green-300 p-4 rounded-lg bg-green-50">
      <div className="text-sm text-green-600 mb-2">
        🔢 SIMPLE COUNTER {isRunning ? '🟢' : '🔴'}
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {count}
      </div>
      <div className="text-xs mt-1 text-gray-500">
        Updates every 1 second
      </div>
    </div>
  );
}