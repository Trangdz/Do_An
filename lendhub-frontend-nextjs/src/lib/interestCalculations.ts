// Real-time Interest Calculation Utilities
// Simulates interest accrual client-side for smooth real-time display

import { RAY, SECONDS_PER_YEAR, toNumber, type BigNumberish } from './math';

export interface InterestData {
  principal: bigint;
  indexSnapshot: bigint;
  currentIndex: bigint;
  lastUpdateTimestamp: number;
  ratePerSecond: bigint; // in RAY
}

/**
 * Calculate current balance with interest accrued
 * Uses compound interest formula: balance = principal × (currentIndex / snapshotIndex)
 * 
 * @param principal - User's principal amount (1e18)
 * @param snapshotIndex - Index when user supplied (1e27)
 * @param currentIndex - Current liquidity/borrow index (1e27)
 * @returns Current balance with interest (1e18)
 */
export function calculateInterestAccrued(
  principal: BigNumberish,
  snapshotIndex: BigNumberish,
  currentIndex: BigNumberish
): bigint {
  const principalBN = BigInt(principal);
  const snapshotBN = BigInt(snapshotIndex);
  const currentBN = BigInt(currentIndex);
  
  if (snapshotBN === 0n || principalBN === 0n) {
    return principalBN;
  }
  
  // balance = principal × (currentIndex / snapshotIndex)
  return (principalBN * currentBN) / snapshotBN;
}

/**
 * Estimate current index based on last known index and time passed
 * Client-side simulation: index(t) = index(0) × (1 + rate × t / SECONDS_PER_YEAR)
 * 
 * @param lastIndex - Last known index (1e27)
 * @param lastUpdateTimestamp - Timestamp of last update
 * @param ratePerSecond - Interest rate per second in RAY
 * @returns Estimated current index
 */
export function estimateCurrentIndex(
  lastIndex: BigNumberish,
  lastUpdateTimestamp: number,
  ratePerSecond: BigNumberish
): bigint {
  const lastIndexBN = BigInt(lastIndex);
  const rateBN = BigInt(ratePerSecond);
  
  if (rateBN === 0n) return lastIndexBN;
  
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = currentTime - lastUpdateTimestamp;
  
  if (timeDiff <= 0) return lastIndexBN;
  
  // Use EXACT contract formula
  // Contract: borIndex = RayMath.rayMul(borIndex, 1e27 + uint256(r.variableBorrowRateRayPerSec) * dt)
  // RayMath.rayMul(a, b) = (a * b) / 1e27
  
  // Contract formula: multiplier = 1e27 + (rateRayPerSec × timeDiff)
  const multiplier = RAY + (rateBN * BigInt(timeDiff));
  
  // Contract formula: newIndex = rayMul(lastIndex, multiplier)
  // rayMul(a, b) = (a * b) / 1e27
  return (lastIndexBN * multiplier) / RAY;
}

/**
 * Calculate real-time balance with simulated interest
 * Combines blockchain data with client-side estimation
 * 
 * @param interestData - Interest data from contract
 * @returns Current balance with interest
 */
export function calculateRealtimeBalance(interestData: InterestData): bigint {
  const principal = interestData.principal;
  const snapshotIndex = interestData.indexSnapshot;
  
  // Estimate current index if we don't have it
  const currentIndex = interestData.currentIndex || estimateCurrentIndex(
    snapshotIndex,
    interestData.lastUpdateTimestamp,
    interestData.ratePerSecond
  );
  
  return calculateInterestAccrued(principal, snapshotIndex, currentIndex);
}

/**
 * Calculate APY from rate per second in RAY
 * APY = (1 + rate)⁽³⁶⁵ˣ²⁴ˣ³⁶⁰⁰⁾ - 1
 * Simplifies to: APY ≈ rate × SECONDS_PER_YEAR
 * 
 * @param ratePerSecond - Rate in RAY per second
 * @returns APY as percentage (e.g., 5.25 for 5.25% APY)
 */
export function rateToAPY(ratePerSecond: BigNumberish): number {
  const rate = toNumber(ratePerSecond, 27);
  const apy = (rate * SECONDS_PER_YEAR * 100) / 1e27;
  return apy;
}

/**
 * Calculate APR from rate per second in RAY
 * APR = rate × SECONDS_PER_YEAR × 100
 * 
 * @param ratePerSecond - Rate in RAY per second
 * @returns APR as percentage
 */
export function rateToAPR(ratePerSecond: BigNumberish): number {
  return rateToAPY(ratePerSecond);
}

/**
 * Calculate interest accrued in USD
 * 
 * @param balanceWithInterest - Current balance including interest
 * @param principalAmount - Original principal
 * @param priceUSD - Token price in USD
 * @returns Interest amount in USD
 */
export function calculateInterestUSD(
  balanceWithInterest: bigint,
  principalAmount: bigint,
  priceUSD: number
): number {
  const interest = balanceWithInterest - principalAmount;
  const interestNum = Number(interest) / 1e18;
  return interestNum * priceUSD;
}

/**
 * Format balance with interest for display
 * 
 * @param value - Balance in 1e18
 * @param decimals - Token decimals
 * @returns Formatted string
 */
export function formatBalanceWithInterest(value: bigint, decimals: number = 4): string {
  const numValue = Number(value) / 1e18;
  
  if (numValue === 0) return '0.00';
  if (numValue < 0.0001) return '< 0.0001';
  
  // Use Intl.NumberFormat for proper formatting
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Math.min(decimals, 6),
    maximumFractionDigits: Math.max(decimals, 6)
  });
  
  return formatter.format(numValue);
}

/**
 * Calculate time-weighted interest for display
 * Shows how much interest has accrued since last update
 * 
 * @param principal - Principal amount
 * @param ratePerSecond - Rate in RAY per second
 * @param timeDiffSeconds - Time difference in seconds
 * @returns Interest accrued during this period
 */
export function calculateInterestForPeriod(
  principal: bigint,
  ratePerSecond: bigint,
  timeDiffSeconds: number
): bigint {
  if (ratePerSecond === 0n || principal === 0n || timeDiffSeconds <= 0) {
    return 0n;
  }
  
  // Interest = principal × rate × time
  const interest = (principal * ratePerSecond * BigInt(timeDiffSeconds)) / BigInt(SECONDS_PER_YEAR) / RAY;
  return interest;
}

