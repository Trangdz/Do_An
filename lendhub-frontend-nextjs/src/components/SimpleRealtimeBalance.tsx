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
  lastUpdateTimestamp?: number; // Timestamp của lần update cuối từ database/blockchain
}

export function SimpleRealtimeBalance({
  principal,
  tokenSymbol,
  priceUSD,
  decimals = 2,
  currentAPR = 0, // Default 0% - dùng APR từ blockchain
  initialInterestAccrued = BigInt(0), // Lãi đã tích lũy từ blockchain
  lastUpdateTimestamp // Timestamp từ database/blockchain
}: SimpleRealtimeBalanceProps) {
  // Create unique storage key based on principal (unique per position)
  const storageKey = `balance_${principal.toString()}_${tokenSymbol}`;
  
  // Load last balance from localStorage
  const getLastBalance = (): number => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        const storedTime = data.timestamp || 0;
        const now = Math.floor(Date.now() / 1000);
        const timeDiff = now - storedTime;
        
        // Only use stored balance if it's recent (less than 5 minutes old)
        if (timeDiff < 300) {
          return data.balance || 0;
        }
      }
    } catch (e) {
      // Ignore errors
    }
    return 0;
  };
  
  // Save balance to localStorage
  const saveBalance = (balance: number) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        balance,
        timestamp: Math.floor(Date.now() / 1000)
      }));
    } catch (e) {
      // Ignore errors
    }
  };
  
  const principalNum = Number(principal) / 1e18;
  const initialInterestNum = Number(initialInterestAccrued) / 1e18;
  const baseBalance = principalNum + initialInterestNum;
  
  // Initialize with last balance or calculate from scratch
  const [displayBalance, setDisplayBalance] = useState<number>(() => {
    const lastBalance = getLastBalance();
    if (lastBalance > baseBalance) {
      // Use stored balance if it's higher (more interest accrued)
      return lastBalance;
    }
    // Otherwise calculate from current data
    const now = Math.floor(Date.now() / 1000);
    const dbTimestamp = lastUpdateTimestamp || now;
    if (dbTimestamp < now && currentAPR > 0) {
      const timeSinceUpdate = now - dbTimestamp;
      const SECONDS_PER_YEAR = 31536000;
      const ratePerSec = currentAPR / 100 / SECONDS_PER_YEAR;
      const additionalInterest = baseBalance * ratePerSec * timeSinceUpdate;
      return baseBalance + additionalInterest;
    }
    return baseBalance;
  });
  
  const principalRef = useRef<bigint>(BigInt(0));
  const initialInterestRef = useRef<bigint>(BigInt(0));
  const lastTimestampRef = useRef<number>(0);
  const lastUpdateTimestampRef = useRef<number>(Math.floor(Date.now() / 1000));
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to calculate balance from current state
  const calculateBalanceFromTimestamp = (principalNum: number, initialInterestNum: number, timestamp: number, now: number, apr: number): number => {
    let balance = principalNum + initialInterestNum;
    
    // If we have a timestamp in the past, calculate additional interest
    if (timestamp < now && apr > 0 && principalNum > 0) {
      const timeSinceUpdate = now - timestamp;
      const SECONDS_PER_YEAR = 31536000;
      const ratePerSec = apr / 100 / SECONDS_PER_YEAR;
      // Use compound interest: balance × (1 + rate × time)
      const additionalInterest = balance * ratePerSec * timeSinceUpdate;
      balance = balance + additionalInterest;
    }
    
    return balance;
  };

  useEffect(() => {
    // Update refs when props change
    const principalNumEffect = Number(principal) / 1e18;
    const initialInterestNumEffect = Number(initialInterestAccrued) / 1e18;
    const now = Math.floor(Date.now() / 1000);
    
    // Use provided lastUpdateTimestamp if available, otherwise use current time
    const dbTimestamp = lastUpdateTimestamp || now;
    
    // Check if we need to update base values
    const principalChanged = principal !== principalRef.current;
    const interestChanged = initialInterestAccrued !== initialInterestRef.current;
    const timestampChanged = dbTimestamp !== lastTimestampRef.current;
    
    // Update if any relevant value changed
    if (principalChanged || interestChanged || timestampChanged) {
      console.log('🔄 SimpleRealtimeBalance updating:', {
        principalChanged,
        interestChanged,
        timestampChanged,
        principal: principalNumEffect,
        initialInterest: initialInterestNumEffect,
        dbTimestamp,
        now,
        timeDiff: now - dbTimestamp,
        currentAPR
      });
      
      principalRef.current = principal;
      initialInterestRef.current = initialInterestAccrued;
      lastTimestampRef.current = dbTimestamp;
      
      // Index calculation removed - using simple interest instead
      
      // Use database timestamp
      lastUpdateTimestampRef.current = dbTimestamp;
      
      // Calculate initial display balance
      const displayBalanceNum = calculateBalanceFromTimestamp(
        principalNum, 
        initialInterestNum, 
        dbTimestamp, 
        now, 
        currentAPR
      );
      
      console.log('💰 Calculated balance:', {
        baseBalance: principalNum + initialInterestNum,
        displayBalance: displayBalanceNum,
        additionalInterest: displayBalanceNum - (principalNum + initialInterestNum)
      });
      
      // Only update if new balance is higher (more interest)
      if (displayBalanceNum >= displayBalance) {
        setDisplayBalance(displayBalanceNum);
        saveBalance(displayBalanceNum);
      }
    }

    // Simulate interest growth continuously using simple interest formula
    const simulateInterest = () => {
      if (currentAPR <= 0 || principalRef.current === BigInt(0)) {
        return;
      }
      
      const now = Math.floor(Date.now() / 1000);
      const timeDiff = now - lastUpdateTimestampRef.current;
      
      if (timeDiff <= 0) return;
      
      const principalNumSim = Number(principalRef.current) / 1e18;
      const initialInterestNumSim = Number(initialInterestRef.current) / 1e18;
      const baseBalanceCurrent = principalNumSim + initialInterestNumSim;
      
      // Simple interest: additional = base × rate × time
      const SECONDS_PER_YEAR = 31536000;
      const ratePerSec = currentAPR / 100 / SECONDS_PER_YEAR;
      const additionalInterest = baseBalanceCurrent * ratePerSec * timeDiff;
      const newBalance = baseBalanceCurrent + additionalInterest;
      
      if (isFinite(newBalance) && newBalance >= principalNumSim) {
        setDisplayBalance(newBalance);
        saveBalance(newBalance);
      }
    };

    // Update every second
    intervalRef.current = setInterval(simulateInterest, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [principal, currentAPR, initialInterestAccrued, lastUpdateTimestamp]);

  // Show more decimal places to see tiny interest amounts accurately
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 10,
    maximumFractionDigits: 12
  }).format(displayBalance);

  const principalNumDisplay = Number(principal) / 1e18;
  const interestAccrued = displayBalance - principalNumDisplay;
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

