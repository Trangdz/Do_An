/**
 * InterestDisplay Component
 * 
 * Example usage of useRealtimeInterestPersistent hook
 * Displays real-time interest with persistence
 */

import React from 'react';
import { useRealtimeInterestPersistent } from '../hooks/useRealtimeInterestPersistent';

interface InterestDisplayProps {
  userAddress: string | null;
  assetSymbol: string;
  scaledBalance: number; // Initial balance at deposit
  initialLiquidityIndex: number; // Index at deposit time (usually 1.0)
  currentLiquidityRate: number; // Current APR as decimal (0.05 = 5%)
}

export function InterestDisplay({
  userAddress,
  assetSymbol,
  scaledBalance,
  initialLiquidityIndex,
  currentLiquidityRate
}: InterestDisplayProps) {
  const {
    displayBalance,
    interestEarned,
    liquidityIndex,
    lastUpdateTimestamp,
    isLoading,
    error
  } = useRealtimeInterestPersistent({
    userAddress,
    assetSymbol,
    scaledBalance,
    initialLiquidityIndex,
    currentLiquidityRate
  });

  // Format currency
  const formatCurrency = (value: number, decimals: number = 4): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  };

  // Format percentage
  const formatPercentage = (rate: number): string => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="text-gray-500">Loading interest data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg bg-white shadow-sm">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {assetSymbol} Interest
        </h3>
        <div className="text-sm text-gray-500">
          Current APR: {formatPercentage(currentLiquidityRate)}
        </div>
      </div>

      {/* Balance Display */}
      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-1">Current Balance</div>
        <div className="text-3xl font-bold text-green-600">
          {formatCurrency(displayBalance)} {assetSymbol}
        </div>
      </div>

      {/* Interest Earned */}
      <div className="mb-4 p-3 bg-green-50 rounded">
        <div className="text-sm text-gray-600 mb-1">Interest Earned</div>
        <div className="text-xl font-semibold text-green-700">
          +{formatCurrency(interestEarned)} {assetSymbol}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Liquidity Index</div>
          <div className="font-mono text-gray-900">
            {formatCurrency(liquidityIndex, 6)}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Last Updated</div>
          <div className="text-gray-900">
            {formatTimestamp(lastUpdateTimestamp)}
          </div>
        </div>
      </div>

      {/* Info Badge */}
      <div className="mt-4 p-2 bg-blue-50 rounded text-xs text-blue-700">
        💡 Interest updates every second and persists across devices
      </div>
    </div>
  );
}

/**
 * Example usage:
 * 
 * <InterestDisplay
 *   userAddress="0x1234..."
 *   assetSymbol="USDC"
 *   scaledBalance={100.0}
 *   initialLiquidityIndex={1.0}
 *   currentLiquidityRate={0.05} // 5% APR
 * />
 */


