/**
 * Hook to fetch and cache on-chain data for interest calculation
 * Fetch từ blockchain và lưu vào localStorage, sau đó tính real-time
 */

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  OnChainSnapshot,
  saveSnapshotToLocalStorage,
  loadSnapshotFromLocalStorage,
  getSnapshotKey,
  calculateActualBalance
} from '../lib/onChainInterestCalculator';

const RAY = 1e27;
const SECONDS_PER_YEAR = 31536000;

interface UseOnChainSnapshotOptions {
  provider: ethers.Provider | null;
  poolAddress: string;
  userAddress: string | null;
  assetAddress: string;
  isSupply?: boolean;
  refreshInterval?: number; // Refresh from chain (ms)
  autoRefresh?: boolean;
}

interface UseOnChainSnapshotReturn {
  snapshot: OnChainSnapshot | null;
  actualBalance: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastFetchTime: number;
}

/**
 * Fetch on-chain data and create snapshot
 */
async function fetchOnChainSnapshot(
  provider: ethers.Provider,
  poolAddress: string,
  userAddress: string,
  assetAddress: string,
  isSupply: boolean = true
): Promise<OnChainSnapshot> {
  const abi = [
    'function userReserves(address user, address asset) view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)',
    'function reserves(address asset) view returns (tuple(uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate))'
  ];

  const pool = new ethers.Contract(poolAddress, abi, provider);
  
  // Fetch user reserve data
  const userReserve = await pool.userReserves(userAddress, assetAddress);
  const principal = userReserve[isSupply ? 'supply' : 'borrow'].principal;
  const snapshotIndex = userReserve[isSupply ? 'supply' : 'borrow'].index; // ⭐ Index khi user supply
  
  // Fetch reserve data (needed regardless of user balance)
  const reserve = await pool.reserves(assetAddress);
  
  // Get current liquidityIndex and rate
  const currentLiquidityIndex = Number(
    isSupply 
      ? reserve.liquidityIndex 
      : reserve.variableBorrowIndex
  );
  const liquidityRate = Number(
    isSupply 
      ? reserve.liquidityRateRayPerSec 
      : reserve.variableBorrowRateRayPerSec
  );
  const lastUpdateTimestamp = Number(reserve.lastUpdate);
  
  // Get block number for tracking
  const blockNumber = await provider.getBlockNumber();
  
  // Early return when user has no position
  if (principal === BigInt(0)) {
    console.log('ℹ️ User has no position for', { userAddress, assetAddress, isSupply });
    return {
      scaledBalance: 0,
      liquidityIndex: currentLiquidityIndex,
      liquidityRate,
      lastUpdateTimestamp,
      blockNumber,
      snapshotIndex: Number(snapshotIndex) || 0
    };
  }
  
  // Calculate scaledBalance
  // scaledBalance = principal (already normalized)
  const scaledBalance = Number(principal) / 1e18;
  const snapshotIndexNum = Number(snapshotIndex);
  
  // Calculate current balance using Aave formula: balance = principal × (currentIndex / snapshotIndex)
  const currentBalance = scaledBalance * (currentLiquidityIndex / snapshotIndexNum);
  
  const snapshot: OnChainSnapshot = {
    scaledBalance,
    liquidityIndex: currentLiquidityIndex, // Current index from pool
    liquidityRate,  // Already in RAY per second format
    lastUpdateTimestamp,
    blockNumber,
    snapshotIndex: snapshotIndexNum // ⭐ Save snapshot index for calculation
  } as OnChainSnapshot & { snapshotIndex: number };
  
  console.log('📊 Fetched on-chain snapshot:', {
    scaledBalance,
    currentLiquidityIndex,
    snapshotIndex: snapshotIndexNum,
    liquidityRate,
    lastUpdateTimestamp,
    liquidityRateDecimal: liquidityRate / RAY,
    APY: (liquidityRate / RAY) * SECONDS_PER_YEAR * 100,
    currentBalance
  });
  
  return snapshot;
}

export function useOnChainSnapshot({
  provider,
  poolAddress,
  userAddress,
  assetAddress,
  isSupply = true,
  refreshInterval = 30000, // 30 seconds
  autoRefresh = true
}: UseOnChainSnapshotOptions): UseOnChainSnapshotReturn {
  
  const storageKey = getSnapshotKey(userAddress || '', assetAddress, isSupply);
  
  // Load from localStorage first
  const cachedSnapshot = userAddress ? loadSnapshotFromLocalStorage(storageKey) : null;
  
  const [snapshot, setSnapshot] = useState<OnChainSnapshot | null>(cachedSnapshot);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  // Fetch from blockchain
  const refresh = useCallback(async () => {
    if (!provider || !poolAddress || !userAddress || !assetAddress) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const newSnapshot = await fetchOnChainSnapshot(
        provider,
        poolAddress,
        userAddress,
        assetAddress,
        isSupply
      );
      
      setSnapshot(newSnapshot);
      setLastFetchTime(Date.now());
      
      // Save to localStorage
      saveSnapshotToLocalStorage(storageKey, newSnapshot);
      
      console.log('✅ Fetched on-chain snapshot:', newSnapshot);
    } catch (err: any) {
      console.error('❌ Failed to fetch on-chain snapshot:', err);
      setError(err.message || 'Failed to fetch snapshot');
    } finally {
      setIsLoading(false);
    }
  }, [provider, poolAddress, userAddress, assetAddress, isSupply, storageKey]);
  
  // Initial fetch
  useEffect(() => {
    if (cachedSnapshot) {
      // If we have cached data, use it but still fetch fresh data
      setIsLoading(false);
      refresh();
    } else {
      // No cache, fetch immediately
      refresh();
    }
  }, []); // Only run once on mount
  
  // Auto refresh from chain
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;
    
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refresh, autoRefresh, refreshInterval]);
  
  // Calculate actual balance in real-time
  const actualBalance = snapshot ? calculateActualBalance(snapshot) : 0;
  
  return {
    snapshot,
    actualBalance,
    isLoading,
    error,
    refresh,
    lastFetchTime
  };
}

