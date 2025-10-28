/**
 * SimpleRealtimeBalance Component
 * Tăng dần số dư mỗi giây cho mượt mà
 */
import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { formatCurrency } from '../lib/math';

interface SimpleRealtimeBalanceProps {
  principal: bigint;
  tokenSymbol: string;
  priceUSD: number;
  decimals?: number;
  currentAPR?: number; // ✅ APR biến động từ blockchain
  initialInterestAccrued?: bigint; // Lãi đã tích lũy từ blockchain
}

export function SimpleRealtimeBalance({
  principal,
  tokenSymbol,
  priceUSD,
  decimals = 2,
  currentAPR = 0, // Default 0% - dùng APR từ blockchain
  initialInterestAccrued = BigInt(0) // Lãi đã tích lũy từ blockchain
}: SimpleRealtimeBalanceProps) {
  const [displayBalance, setDisplayBalance] = useState<number>(0);
  const lastRateRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const principalNum = Number(principal) / 1e18;
    const initialInterestNum = Number(initialInterestAccrued) / 1e18;
    const baseBalance = principalNum + initialInterestNum; // Principal + lãi đã tích lũy từ blockchain
    setDisplayBalance(baseBalance);
    startTimeRef.current = Date.now();
    lastRateRef.current = currentAPR / 100 / 31536000; // Rate per second

    // Simulate SIMPLE interest accrual from base balance (principal + initial interest)
    const simulateInterest = () => {
      const now = Date.now();
      const elapsedSec = (now - startTimeRef.current) / 1000; // seconds since mount/reset
      const SECONDS_PER_YEAR = 31536000;
      const newRatePerSec = currentAPR / 100 / SECONDS_PER_YEAR;
      if (newRatePerSec !== lastRateRef.current) {
        lastRateRef.current = newRatePerSec;
      }
      const additionalInterest = principalNum * newRatePerSec * elapsedSec; // Chỉ tính trên principal
      const newBalance = baseBalance + additionalInterest;
      setDisplayBalance(newBalance);
    };

    // Update every second
    intervalRef.current = setInterval(simulateInterest, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [principal, currentAPR, initialInterestAccrued]);

  // Show more decimal places to see tiny interest amounts accurately
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 10,
    maximumFractionDigits: 12
  }).format(displayBalance);

  const principalNum = Number(principal) / 1e18;
  const interestAccrued = displayBalance - principalNum;
  const valueUSD = displayBalance * priceUSD;
  const interestUSD = interestAccrued * priceUSD;

  return (
    <div className="text-center">
      <div className="font-semibold text-gray-900">
        {formatted} {tokenSymbol}
      </div>
      {interestAccrued > 0 && (
        <div className="text-green-600 text-xs mt-1">
          +{interestAccrued.toFixed(12)} {tokenSymbol} earned
        </div>
      )}
         {/* Debug: Show APR and rate info */}
         <div className="text-xs mt-1">
           <div className="text-green-600">
           APR: {currentAPR.toFixed(3)}% | Rate/s: {(currentAPR / 100 / 31536000).toExponential(2)}
           </div>
        <div className="text-gray-400 text-xs mt-1">
          Interest earned: {interestAccrued.toFixed(12)} {tokenSymbol} ≈ ${(interestAccrued * priceUSD).toFixed(6)}
        </div>
      </div>
    </div>
  );
}

