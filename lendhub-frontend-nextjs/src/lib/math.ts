// Mathematical constants and utilities for DeFi calculations

// Constants
export const WAD = 1e18;
export const RAY = 1e27;
export const SECONDS_PER_YEAR = 365 * 24 * 3600;

// Type definitions
export type BigNumberish = string | number | bigint;

/**
 * Convert BigNumberish to number with proper decimal handling
 */
export function toNumber(value: BigNumberish, decimals: number = 18): number {
  if (typeof value === 'bigint') {
    return Number(value) / Math.pow(10, decimals);
  }
  if (typeof value === 'string') {
    return Number(value) / Math.pow(10, decimals);
  }
  return value / Math.pow(10, decimals);
}

/**
 * Convert number to BigNumberish with proper decimal handling
 */
export function toBigNumber(value: number | string, decimals: number = 18): bigint {
  const num = typeof value === 'string' ? Number(value) : value;
  return BigInt(Math.floor(num * Math.pow(10, decimals)));
}

/**
 * Convert rate per second (RAY) to APR percentage
 */
export function aprFromPerSecRay(rateRayPerSec: BigNumberish): number {
  const rate = toNumber(rateRayPerSec, 27); // RAY has 27 decimals
  return (rate * SECONDS_PER_YEAR) / 1e27 * 100;
}

/**
 * Calculate utilization: U = totalDebt / (reserveCash + totalDebt)
 */
export function utilization(reserveCash: BigNumberish, totalDebt: BigNumberish): number {
  const cash = toNumber(reserveCash);
  const debt = toNumber(totalDebt);
  
  if (debt === 0) return 0;
  if (cash === 0) return 1;
  
  return debt / (cash + debt);
}

/**
 * Calculate current balance using index: value = principal * currentIndex / snapshotIndex
 */
export function valueByIndex(
  principal: BigNumberish,
  currentIndex: BigNumberish,
  snapshotIndex: BigNumberish
): bigint {
  const principalBN = BigInt(principal);
  const currentIndexBN = BigInt(currentIndex);
  const snapshotIndexBN = BigInt(snapshotIndex);
  
  if (snapshotIndexBN === BigInt(0)) return principalBN;
  
  return (principalBN * currentIndexBN) / snapshotIndexBN;
}

/**
 * Calculate supply rate: supplyRate ≈ borrowRate * U * (1 - reserveFactor)
 */
export function calculateSupplyRate(
  borrowRateRayPerSec: BigNumberish,
  utilizationRate: number,
  reserveFactor: number
): number {
  const borrowRate = toNumber(borrowRateRayPerSec, 27);
  const supplyRate = borrowRate * utilizationRate * (1 - reserveFactor / 10000);
  return (supplyRate * SECONDS_PER_YEAR) / 1e27 * 100;
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
  
  // For very large numbers, show more precision
  if (value >= 1000000) {
    const millions = value / 1000000;
    if (millions >= 100) {
      return `${millions.toFixed(0)}M`;
    } else if (millions >= 10) {
      return `${millions.toFixed(1)}M`;
    } else {
      return `${millions.toFixed(2)}M`;
    }
  }
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  
  return value.toFixed(decimals);
}

/**
 * Format balance with more precision for large numbers
 */
export function formatBalance(value: number, decimals: number = 4): string {
  if (value === 0) return '0';
  if (value < 0.0001) return '< 0.0001';
  
  // For very large numbers, show more precision
  if (value >= 1000000) {
    const millions = value / 1000000;
    if (millions >= 100) {
      return `${millions.toFixed(0)}M`;
    } else if (millions >= 10) {
      return `${millions.toFixed(1)}M`;
    } else {
      // Show 4 decimal places for numbers < 10M to see the difference
      return `${millions.toFixed(4)}M`;
    }
  }
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  
  return value.toFixed(decimals);
} 

/**
 * Format balance for WETH (subtract initial supply of 1M)
 */
export function formatWETHBalance(value: number, decimals: number = 4): string {
  // WETH contract has 1M initial supply, so subtract it to show actual user balance
  const actualBalance = Math.max(0, value - 1000000);
  return formatBalance(actualBalance, decimals);
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

/**
 * Parse units to BigInt
 */
export function parseUnits(value: string, decimals: number = 18): bigint {
  const num = Number(value);
  return BigInt(Math.floor(num * Math.pow(10, decimals)));
}

/**
 * Format units from BigInt
 */
export function formatUnits(value: BigNumberish, decimals: number = 18): string {
  const num = toNumber(value, decimals);
  return num.toFixed(decimals);
}

/**
 * Parse WAD (18 decimals)
 */
export function parseWad(value: string): bigint {
  return parseUnits(value, 18);
}

/**
 * Format WAD (18 decimals)
 */
export function formatWad(value: BigNumberish): string {
  return formatUnits(value, 18);
}
