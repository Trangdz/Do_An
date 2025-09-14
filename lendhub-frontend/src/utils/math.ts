import { type BigNumberish, formatUnits, parseUnits } from 'ethers';
import { WAD, RAY, SECONDS_PER_YEAR } from '../types';

/**
 * Convert BigNumberish to number with proper decimal handling
 */
export function toNumber(value: BigNumberish, decimals: number = 18): number {
  return Number(formatUnits(value, decimals));
}

/**
 * Convert number to BigNumberish with proper decimal handling
 */
export function toBigNumber(value: number | string, decimals: number = 18): bigint {
  return parseUnits(value.toString(), decimals);
}

/**
 * Calculate utilization: U = totalDebt / (reserveCash + totalDebt)
 */
export function calculateUtilization(
  totalDebt: BigNumberish,
  reserveCash: BigNumberish
): number {
  const debt = toNumber(totalDebt);
  const cash = toNumber(reserveCash);
  
  if (debt === 0) return 0;
  if (cash === 0) return 1;
  
  return debt / (cash + debt);
}

/**
 * Convert rate per second (RAY) to APR percentage
 */
export function rateRayToAPR(rateRayPerSec: BigNumberish): number {
  const rate = toNumber(rateRayPerSec, 27); // RAY has 27 decimals
  return (rate * SECONDS_PER_YEAR) / 1e27 * 100;
}

/**
 * Calculate supply rate: supplyRate ≈ borrowRate * U * (1 - reserveFactor)
 */
export function calculateSupplyRate(
  borrowRateRayPerSec: BigNumberish,
  utilization: number,
  reserveFactor: number
): number {
  const borrowRate = toNumber(borrowRateRayPerSec, 27);
  const supplyRate = borrowRate * utilization * (1 - reserveFactor / 10000);
  return (supplyRate * SECONDS_PER_YEAR) / 1e27 * 100;
}

/**
 * Calculate current supply balance: SupplyNow = principal * liquidityIndexNow / snapshotIndex
 */
export function calculateCurrentSupplyBalance(
  principal: BigNumberish,
  currentIndex: BigNumberish,
  snapshotIndex: BigNumberish
): bigint {
  const principalBN = BigInt(principal);
  const currentIndexBN = BigInt(currentIndex);
  const snapshotIndexBN = BigInt(snapshotIndex);
  
  if (snapshotIndexBN === 0n) return principalBN;
  
  return (principalBN * currentIndexBN) / snapshotIndexBN;
}

/**
 * Calculate current debt balance: DebtNow = principal * variableBorrowIndexNow / snapshotIndex
 */
export function calculateCurrentDebtBalance(
  principal: BigNumberish,
  currentIndex: BigNumberish,
  snapshotIndex: BigNumberish
): bigint {
  return calculateCurrentSupplyBalance(principal, currentIndex, snapshotIndex);
}

/**
 * Calculate Health Factor: HF = Σ(supply_i * price_i * liqThreshold_i) / Σ(debt_j * price_j)
 */
export function calculateHealthFactor(
  collateralValue: BigNumberish,
  debtValue: BigNumberish
): number {
  const collateral = toNumber(collateralValue);
  const debt = toNumber(debtValue);
  
  if (debt === 0) return Number.MAX_SAFE_INTEGER;
  
  return collateral / debt;
}

/**
 * Calculate max withdraw amount with HF constraint
 * x_max = ((CollateralUSD - DebtUSD) * 10000) / (Price(asset) * liqThresholdBps_asset)
 */
export function calculateMaxWithdraw(
  collateralValue: BigNumberish,
  debtValue: BigNumberish,
  assetPrice: number,
  liquidationThreshold: number
): number {
  const collateral = toNumber(collateralValue);
  const debt = toNumber(debtValue);
  
  if (collateral <= debt) return 0;
  
  const netCollateral = collateral - debt;
  const maxWithdrawUSD = (netCollateral * 10000) / (assetPrice * liquidationThreshold);
  
  return maxWithdrawUSD / assetPrice; // Convert back to token amount
}

/**
 * Format number with appropriate decimal places
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (value === 0) return '0';
  if (value < 0.01) return '< 0.01';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  
  return value.toFixed(decimals);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Format currency
 */
export function formatCurrency(value: number, symbol: string = '$', decimals: number = 2): string {
  return `${symbol}${formatNumber(value, decimals)}`;
}

/**
 * Format token amount
 */
export function formatTokenAmount(value: number, symbol: string, decimals: number = 4): string {
  return `${formatNumber(value, decimals)} ${symbol}`;
}

/**
 * Calculate utilization color based on risk level
 */
export function getUtilizationColor(utilization: number): string {
  if (utilization < 0.5) return 'text-green-600';
  if (utilization < 0.8) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Calculate health factor color based on risk level
 */
export function getHealthFactorColor(healthFactor: number): string {
  if (healthFactor >= 2) return 'text-green-600';
  if (healthFactor >= 1.5) return 'text-yellow-600';
  if (healthFactor >= 1) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Check if health factor is safe
 */
export function isHealthFactorSafe(healthFactor: number): boolean {
  return healthFactor >= 1;
}

/**
 * Check if position can be liquidated
 */
export function canLiquidate(healthFactor: number): boolean {
  return healthFactor < 1;
}
