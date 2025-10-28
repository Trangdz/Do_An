/**
 * RealtimeInterestBalance Component
 * 
 * Hiển thị số dư với lãi suất tăng dần real-time, giống Aave
 * Tự động cập nhật mỗi giây với animation mượt
 * 
 * @example
 * <RealtimeInterestBalance
 *   principal={1000n * BigInt(1e18)} // 1000 tokens
 *   snapshotIndex={BigInt(1e27)}
 *   currentIndex={BigInt(1e27) * BigInt(10001) / 10000n}
 *   lastUpdateTimestamp={Date.now() / 1000}
 *   ratePerSecond={BigInt(126911})} // RAY per second
 *   tokenSymbol="USDC"
 *   priceUSD={1}
 * />
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  calculateRealtimeBalance, 
  calculateInterestForPeriod,
  formatBalanceWithInterest,
  formatCurrency,
  rateToAPR,
  type InterestData
} from '../lib/interestCalculations';

interface RealtimeInterestBalanceProps {
  principal: bigint;
  snapshotIndex: bigint;
  currentIndex: bigint;
  lastUpdateTimestamp: number;
  ratePerSecond: bigint;
  tokenSymbol: string;
  priceUSD: number;
  decimals?: number;
}

export function RealtimeInterestBalance({
  principal,
  snapshotIndex,
  currentIndex: initialCurrentIndex,
  lastUpdateTimestamp,
  ratePerSecond,
  tokenSymbol,
  priceUSD,
  decimals = 4
}: RealtimeInterestBalanceProps) {
  const [displayBalance, setDisplayBalance] = useState<number>(0);
  const [interestAccrued, setInterestAccrued] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    // Calculate initial balance
    const initialBalance = calculateRealtimeBalance({
      principal,
      indexSnapshot: snapshotIndex,
      currentIndex: initialCurrentIndex,
      lastUpdateTimestamp,
      ratePerSecond
    });
    
    const initialBalanceNum = Number(initialBalance) / 1e18;
    setDisplayBalance(initialBalanceNum);
    
    const interestNum = initialBalanceNum - (Number(principal) / 1e18);
    setInterestAccrued(interestNum);

    // Update every second for smooth real-time effect
    const intervalId = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const timeDiff = now - lastUpdateTimestamp;
      
      if (timeDiff > 0 && ratePerSecond > 0n) {
        // Calculate interest accrued during this period
        const interestForPeriod = calculateInterestForPeriod(
          principal,
          ratePerSecond,
          timeDiff
        );
        
        const interestNum = Number(interestForPeriod) / 1e18;
        const newBalance = (Number(principal) / 1e18) + interestNum;
        
        // Animate balance change
        animateBalanceChange(displayBalance, newBalance);
        setDisplayBalance(newBalance);
        setInterestAccrued(interestNum);
        
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 500);
      }
    }, 1000); // Update every 1 second

    return () => {
      clearInterval(intervalId);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [principal, snapshotIndex, initialCurrentIndex, lastUpdateTimestamp, ratePerSecond]);

  // Smooth animation helper
  const animateBalanceChange = (from: number, to: number) => {
    const duration = 1000; // 1 second
    const start = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic function for smooth animation
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = from + (to - from) * easedProgress;
      
      setDisplayBalance(currentValue);
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const formattedBalance = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals
  }).format(displayBalance);

  const formattedInterest = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals
  }).format(interestAccrued);

  const apr = rateToAPR(ratePerSecond);
  const interestUSD = interestAccrued * priceUSD;

  return (
    <div className="realtime-interest-balance">
      {/* Main Balance Display */}
      <div className={`flex items-center gap-2 ${isAnimating ? 'animate-pulse' : ''}`}>
        <span className="text-2xl font-bold text-gray-900">
          {formattedBalance}
        </span>
        <span className="text-lg text-gray-600">{tokenSymbol}</span>
        
        {/* Interest Indicator */}
        {interestAccrued > 0 && (
          <span className="text-sm text-green-600 font-medium">
            (+{formattedInterest})
          </span>
        )}
      </div>

      {/* USD Value */}
      <div className="text-sm text-gray-500 mt-1">
        {formatCurrency(displayBalance * priceUSD)}
        {interestUSD > 0 && (
          <span className="text-green-600 ml-2">
            (+{formatCurrency(interestUSD)})
          </span>
        )}
      </div>

      {/* APR Display */}
      {apr > 0 && (
        <div className="text-xs text-gray-400 mt-1">
          APR: {apr.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for token cards
 */
export function RealtimeBalanceCompact({
  principal,
  snapshotIndex,
  currentIndex,
  lastUpdateTimestamp,
  ratePerSecond,
  tokenSymbol,
  priceUSD
}: RealtimeInterestBalanceProps) {
  const [displayBalance, setDisplayBalance] = useState<number>(0);
  const lastBalanceRef = useRef<number>(0);
  
  useEffect(() => {
    // Initialize
    const calculateBalance = () => {
      const now = Math.floor(Date.now() / 1000);
      const timeDiff = now - lastUpdateTimestamp;
      
      if (timeDiff > 0 && ratePerSecond > 0n) {
        // Calculate interest accrued
        const interestForPeriod = calculateInterestForPeriod(
          principal,
          ratePerSecond,
          timeDiff
        );
        
        const principalNum = Number(principal) / 1e18;
        const interestNum = Number(interestForPeriod) / 1e18;
        const newBalance = principalNum + interestNum;
        
        // Only update if changed
        if (newBalance !== lastBalanceRef.current) {
          lastBalanceRef.current = newBalance;
          return newBalance;
        }
      }
      
      return lastBalanceRef.current;
    };
    
    // Initial update
    const initialBalance = calculateBalance();
    setDisplayBalance(initialBalance);
    
    // Update every second
    const intervalId = setInterval(() => {
      const newBalance = calculateBalance();
      setDisplayBalance(newBalance);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [principal, snapshotIndex, currentIndex, lastUpdateTimestamp, ratePerSecond]);

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(displayBalance);

  return (
    <span className="font-semibold text-gray-900">
      {formatted} {tokenSymbol}
    </span>
  );
}

