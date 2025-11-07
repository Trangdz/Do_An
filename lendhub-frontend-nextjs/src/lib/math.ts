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
 * Matches smart contract logic in _maxWithdrawAllowed()
 * 
 * Smart contract logic:
 * 1. If no debt -> can withdraw all
 * 2. Calculate weightedCollateral = supply * price * LTV / 10000
 * 3. Check if removing full asset would make HF < 1
 * 4. If yes: calculate partial withdraw using maxCollateralToRemove
 */
export function calculateMaxWithdraw(
  totalCollateralUSD: number,  // Total collateral value (already weighted by LTV)
  totalDebtUSD: number,         // Total debt value
  userSupply: number,           // User's supply balance of this asset (in tokens)
  assetPrice: number,           // Price of asset (USD per token)
  ltvBps: number                // LTV in bps (NOT liquidation threshold!)
): number {
  console.log('🔍 calculateMaxWithdraw inputs:', {
    totalCollateralUSD,
    totalDebtUSD,
    userSupply,
    assetPrice,
    ltvBps
  });
  
  // If no supply, cannot withdraw
  if (userSupply <= 0) {
    console.log('❌ No supply');
    return 0;
  }
  
  // If no debt, can withdraw all (matching smart contract line 228-230)
  if (totalDebtUSD <= 0) {
    console.log('✅ No debt, can withdraw all:', userSupply);
    return userSupply;
  }
  
  if (assetPrice === 0 || ltvBps === 0) {
    console.log('❌ Price or LTV is 0');
    return 0;
  }
  
  // Calculate weighted collateral of this asset (matching smart contract line 237)
  // weightedCollateral = supply * price * LTV / 10000
  const supplyValueUSD = userSupply * assetPrice;
  const weightedCollateral = (supplyValueUSD * ltvBps) / 10000;
  
  console.log('📊 Weighted collateral:', {
    supplyValueUSD,
    weightedCollateral,
    formula: `(${userSupply} × ${assetPrice} × ${ltvBps}) / 10000`
  });
  
  // Check if removing this collateral would make HF < 1 (matching smart contract line 240-241)
  const collateralAfter = totalCollateralUSD - weightedCollateral;
  
  console.log('📊 HF check:', {
    totalCollateralUSD,
    weightedCollateral,
    collateralAfter,
    totalDebtUSD
  });
  
  if (collateralAfter >= totalDebtUSD) {
    // Can withdraw all - removing this asset won't make HF < 1 (matching smart contract line 258-259)
    console.log('✅ Can withdraw all, HF still safe:', userSupply);
    return userSupply;
  }
  
  // Need to calculate partial withdraw (matching smart contract line 242-254)
  const maxCollateralToRemove = totalCollateralUSD - totalDebtUSD;
  
  console.log('📊 Partial withdraw calculation:', {
    maxCollateralToRemove,
    weightedCollateral
  });
  
  if (maxCollateralToRemove <= 0) {
    console.log('❌ Cannot withdraw - would make HF < 1');
    return 0;
  }
  
  if (maxCollateralToRemove >= weightedCollateral) {
    // Can still withdraw all (matching smart contract line 247-249)
    console.log('✅ Can withdraw all despite debt:', userSupply);
    return userSupply;
  }
  
  // Calculate partial amount (matching smart contract line 253)
  // Formula: (supply × maxCollateralToRemove) / weightedCollateral
  const maxWithdrawTokens = (userSupply * maxCollateralToRemove) / weightedCollateral;
  
  console.log('✅ Partial withdraw result:', {
    maxWithdrawTokens,
    formula: `(${userSupply} × ${maxCollateralToRemove}) / ${weightedCollateral} = ${maxWithdrawTokens}`
  });
  
  return maxWithdrawTokens;
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
  if (!value || value === 0) return '0.00';
  if (value < 0.0001) return '< 0.0001';
  
  // For very large numbers, use compact notation
  if (value >= 1000000000) {
    const billions = value / 1000000000;
    return `${billions.toFixed(2)}B`;
  }
  
  if (value >= 1000000) {
    const millions = value / 1000000;
    return `${millions.toFixed(2)}M`;
  }
  
  if (value >= 1000) {
    const thousands = value / 1000;
    return `${thousands.toFixed(2)}K`;
  }
  
  // For smaller numbers, use specified decimals
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
  // Handle very large numbers that might be incorrectly formatted
  if (value > 1000000000000) {
    // If value is suspiciously large, it might be a formatting error
    // Check if it's actually a small number with wrong decimals
    const billions = value / 1000000000000;
    if (billions < 1000) {
      // Likely a formatting error - return formatted with proper decimals
      return `${symbol}${value.toFixed(decimals)}`;
    }
  }
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
