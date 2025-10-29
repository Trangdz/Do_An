/**
 * On-Chain Realtime Balance Component - Đơn giản hóa
 * Chỉ tính lãi real-time từ onchain_snapshot, không lưu onchain_realtime
 */

import React, { useState, useEffect, useRef } from 'react';
import { useOnChainSnapshot } from '../hooks/useOnChainSnapshot';

const SECONDS_PER_YEAR = 31536000;

interface OnChainRealtimeBalanceProps {
  provider: any;
  poolAddress: string;
  userAddress: string;
  assetAddress: string;
  tokenSymbol: string;
  priceUSD: number;
  isSupply?: boolean;
  onTransactionSuccess?: () => void;
  // Optional: platform-computed APY to display (preferred over deriving from liquidityRate)
  displayAPY?: number; // decimal, e.g. 0.005 = 0.5%
  decimals?: number; // token decimals for dust clamp
}

export function OnChainRealtimeBalance({
  provider,
  poolAddress,
  userAddress,
  assetAddress,
  tokenSymbol,
  priceUSD,
  isSupply = true,
  onTransactionSuccess,
  displayAPY,
  decimals
}: OnChainRealtimeBalanceProps) {
  
  // Fetch và cache on-chain data
  const {
    snapshot,
    actualBalance: initialBalance,
    isLoading,
    error,
    refresh,
    lastFetchTime
  } = useOnChainSnapshot({
    provider,
    poolAddress,
    userAddress,
    assetAddress,
    isSupply,
    refreshInterval: 10000, // Refresh từ chain mỗi 10s
    autoRefresh: true
  });
  
  // Real-time balance (cập nhật mỗi giây)
  const [displayBalance, setDisplayBalance] = useState<number>(initialBalance);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update display balance real-time mỗi giây
  useEffect(() => {
    if (!snapshot || isLoading) {
      console.log('⏸️ Skipping real-time update:', { hasSnapshot: !!snapshot, isLoading });
      return;
    }
    
    if (snapshot.scaledBalance === 0) {
      console.log('⏸️ No balance to update');
      setDisplayBalance(0);
      return;
    }
    
    // Clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Capture snapshot reference in closure
    const savedSnapshot = snapshot;
    const savedTimestamp = savedSnapshot.lastUpdateTimestamp;
    
    console.log('🔄 Starting real-time updates:', {
      scaledBalance: savedSnapshot.scaledBalance,
      liquidityIndex: savedSnapshot.liquidityIndex,
      liquidityRate: savedSnapshot.liquidityRate,
      liquidityRateDecimal: savedSnapshot.liquidityRate / 1e27,
      APY: (savedSnapshot.liquidityRate / 1e27) * SECONDS_PER_YEAR * 100,
      lastUpdateTimestamp: savedTimestamp,
      currentTime: Math.floor(Date.now() / 1000),
      formula: 'actualBalance = (scaledBalance × newLiquidityIndex) / RAY'
    });
    
    // Recalculate balance every second using real-time timestamp
    const updateBalance = () => {
      const now = Math.floor(Date.now() / 1000);
      const deltaTime = now - savedTimestamp;
      
      if (deltaTime <= 0) {
        setDisplayBalance(savedSnapshot.scaledBalance);
        return;
      }
      
      // Nếu liquidityRate = 0, vẫn hiển thị balance hiện tại
      if (savedSnapshot.liquidityRate === 0) {
        console.log('ℹ️ liquidityRate is 0, showing current balance without interest');
        setDisplayBalance(savedSnapshot.scaledBalance);
        return;
      }
      
      // Calculate new liquidity index from lastUpdateTimestamp to now
      const RAY = 1e27;
      // liquidityRate here is Ray PER SECOND (per ABI: liquidityRateRayPerSec)
      // So we should NOT divide by SECONDS_PER_YEAR again.
      const rateDecimal = savedSnapshot.liquidityRate / RAY; // per-second decimal
      const multiplier = 1 + rateDecimal * deltaTime; // linearized per-second accrual
      const newLiquidityIndex = savedSnapshot.liquidityIndex * multiplier;
      
      // Chia theo snapshotIndex nếu có (chuẩn Aave): balance = principal * (newIndex / snapshotIndex)
      // Fallback: chia theo RAY nếu không có snapshotIndex
      const divisor = (savedSnapshot as any).snapshotIndex && (savedSnapshot as any).snapshotIndex > 0
        ? (savedSnapshot as any).snapshotIndex as number
        : RAY;
      let currentBalance = (savedSnapshot.scaledBalance * newLiquidityIndex) / divisor;
      // Clamp dust to zero if below 1 wei
      if (typeof decimals === 'number' && decimals > 0) {
        const dust = 1 / Math.pow(10, decimals);
        if (currentBalance < dust) currentBalance = 0;
      }
      
      // Log every 2 seconds để debug
      const logInterval = 2;
      if (deltaTime % logInterval === 0 || deltaTime <= 3) {
        console.log('💰 Real-time balance update:', {
          deltaTime,
          rateDecimal: rateDecimal.toFixed(12),
          multiplier: multiplier.toFixed(12),
          oldLiquidityIndex: savedSnapshot.liquidityIndex.toFixed(0),
          newLiquidityIndex: newLiquidityIndex.toFixed(0),
          divisor: divisor.toString(),
          scaledBalance: savedSnapshot.scaledBalance,
          currentBalance: currentBalance.toFixed(8),
          interest: (currentBalance - savedSnapshot.scaledBalance).toFixed(8),
          APY: (rateDecimal * SECONDS_PER_YEAR * 100).toFixed(4) + '%',
          formula: `balance = principal × (newIndex / ${((savedSnapshot as any).snapshotIndex && (savedSnapshot as any).snapshotIndex > 0) ? 'snapshotIndex' : 'RAY'})`
        });
      }
      
      setDisplayBalance(currentBalance);
    };
    
    // Initial update
    updateBalance();
    
    // Update every 1-2 seconds để real-time mượt mà
    intervalRef.current = setInterval(updateBalance, 1500);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [snapshot, isLoading]);
  
  // Avoid resetting display on periodic refresh; only bootstrap once
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (!bootstrappedRef.current && initialBalance > 0) {
      setDisplayBalance(initialBalance);
      bootstrappedRef.current = true;
    }
  }, [initialBalance]);
  
  // Listen for transaction success to refresh
  useEffect(() => {
    if (onTransactionSuccess) {
      // Refresh after a short delay to let blockchain update
      const timer = setTimeout(() => {
        refresh();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [onTransactionSuccess, refresh]);
  
  if (isLoading && !snapshot) {
    return (
      <div className="text-center text-gray-500">
        Loading balance...
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center text-red-500">
        Error: {error}
      </div>
    );
  }
  
  if (!snapshot || snapshot.scaledBalance === 0) {
    return (
      <div className="text-center">
        <span className="text-gray-500">0.00 {tokenSymbol}</span>
      </div>
    );
  }
  
  const principalNum = snapshot.scaledBalance;
  const interestAccrued = displayBalance - principalNum;
  const valueUSD = displayBalance * priceUSD;
  const interestUSD = interestAccrued * priceUSD;
  
  return (
    <div className="text-center">
      <div className="font-semibold text-gray-900">
        {displayBalance.toFixed(8)} {tokenSymbol}
      </div>
      {interestAccrued > 0 && (
        <div className="text-green-600 text-xs mt-1">
          +{interestAccrued.toFixed(8)} {tokenSymbol} earned
        </div>
      )}
      <div className="text-xs mt-1 text-gray-400">
        ${valueUSD.toFixed(2)} (+${interestUSD.toFixed(6)})
      </div>
      {snapshot && (
        <div className="text-xs mt-1 text-gray-500">
          Last sync: {snapshot.blockNumber ? `Block #${snapshot.blockNumber}` : 'Pending'}
          {(() => {
            if (typeof displayAPY === 'number' && !Number.isNaN(displayAPY as number)) {
              return ` | Rate: ${(displayAPY as number).toFixed(4)}% ${isSupply ? 'APY' : 'APR'}`;
            }
            const percent = (snapshot.liquidityRate / 1e27) * SECONDS_PER_YEAR * 100;
            return ` | Rate: ${percent.toFixed(4)}% ${isSupply ? 'APY' : 'APR'}`;
          })()}
        </div>
      )}
    </div>
  );
}