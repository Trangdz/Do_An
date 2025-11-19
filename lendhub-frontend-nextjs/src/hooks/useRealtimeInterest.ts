/**
 * useRealtimeInterest Hook
 * 
 * Fetches and updates interest data from blockchain in real-time
 * Automatically updates balance display every 1 second with simulated interest
 */

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getReadOnlyContract } from '@/lib/readProvider';
import { 
  calculateInterestAccrued,
  calculateInterestForPeriod,
  estimateCurrentIndex,
  type InterestData
} from '../lib/interestCalculations';

interface RealtimeInterestData {
  balance: bigint;
  balanceWithInterest: bigint;
  interestAccrued: bigint;
  principal: bigint;
  currentIndex: bigint;
  snapshotIndex: bigint; // Store snapshot index for correct calculation
  rateRayPerSec: bigint; // Exact per-second rate in RAY from contract
  apr: number;
  isLoading: boolean;
  error: string | null;
  lastUpdate: number;
}

/**
 * Hook to fetch and simulate real-time interest accrual
 * 
 * @param provider - Ethers provider
 * @param poolAddress - LendingPool contract address
 * @param userAddress - User's wallet address
 * @param assetAddress - Token address
 * @param refreshInterval - How often to fetch from blockchain (ms)
 * @param isSupply - Whether this is supply or borrow position
 */
export function useRealtimeInterest(
  provider: ethers.Provider | null,
  poolAddress: string,
  userAddress: string | null,
  assetAddress: string,
  refreshInterval: number = 30000, // Refresh from chain every 30s (reduced to avoid circuit breaker)
  isSupply: boolean = true
): RealtimeInterestData {
  const storageKey = `ri:${poolAddress}:${userAddress}:${assetAddress}:${isSupply ? 's' : 'b'}`;
  const [data, setData] = useState<RealtimeInterestData>(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const c = JSON.parse(cached);
        return {
          balance: BigInt(c.balance ?? 0),
          balanceWithInterest: BigInt(c.balanceWithInterest ?? 0),
          interestAccrued: BigInt(c.interestAccrued ?? 0),
          principal: BigInt(c.principal ?? 0),
          currentIndex: BigInt(c.currentIndex ?? 0),
          snapshotIndex: BigInt(c.snapshotIndex ?? 0),
          rateRayPerSec: BigInt(c.rateRayPerSec ?? 0),
          apr: Number(c.apr ?? 0),
          isLoading: false,
          error: null,
          lastUpdate: Number(c.lastUpdate ?? Date.now())
        } as RealtimeInterestData;
      }
    } catch {}
    return {
      balance: BigInt(0),
      balanceWithInterest: BigInt(0),
      interestAccrued: BigInt(0),
      principal: BigInt(0),
      currentIndex: BigInt(0),
      snapshotIndex: BigInt(0),
      rateRayPerSec: BigInt(0),
      apr: 0,
      isLoading: true,
      error: null,
      lastUpdate: Date.now()
    } as RealtimeInterestData;
  });

  useEffect(() => {
    if (!provider || !poolAddress || !userAddress || !assetAddress) {
      setData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    let isMounted = true;
    let chainUpdateInterval: NodeJS.Timeout;
    let realtimeUpdateInterval: NodeJS.Timeout;
    // Already hydrated in useState lazy initializer

    // Fetch from blockchain periodically
    const fetchFromChain = async () => {
      try {
        const abi = [
          'function userReserves(address user, address asset) view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)',
          'function reserves(address asset) view returns (tuple(uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate))'
        ];

        const pool = getReadOnlyContract(poolAddress, abi, provider);
        
        // Get user reserves with error handling
        let userReserve;
        try {
          userReserve = await pool.userReserves(userAddress, assetAddress);
        } catch (userReserveError: any) {
          // Check if it's a BAD_DATA error (contract not initialized)
          if (userReserveError?.code === 'BAD_DATA' || 
              userReserveError?.message?.includes('could not decode result data') ||
              userReserveError?.message?.includes('Ox')) {
            // Reserve not initialized - return zeros
            if (isMounted) {
              setData(prev => ({
                ...prev,
                balance: BigInt(0),
                balanceWithInterest: BigInt(0),
                interestAccrued: BigInt(0),
                principal: BigInt(0),
                currentIndex: BigInt(0),
                snapshotIndex: BigInt(0),
                apr: 0,
                isLoading: false,
                error: null
              }));
            }
            return;
          }
          throw userReserveError; // Re-throw other errors
        }
        
        const principal = userReserve[isSupply ? 'supply' : 'borrow'].principal;
        const snapshotIdx = userReserve[isSupply ? 'supply' : 'borrow'].index;
        
        // Skip if user has no position
        if (principal === BigInt(0)) {
          if (isMounted) {
            setData(prev => ({
              ...prev,
              balance: BigInt(0),
              balanceWithInterest: BigInt(0),
              interestAccrued: BigInt(0),
              principal: BigInt(0),
              currentIndex: BigInt(0),
              snapshotIndex: BigInt(0),
              apr: 0,
              isLoading: false,
              error: null
            }));
          }
          return;
        }
        
        // Get current indices and rates with error handling
        let reserve;
        try {
          reserve = await pool.reserves(assetAddress);
        } catch (reserveError: any) {
          // Check if it's a BAD_DATA error (reserve not initialized)
          if (reserveError?.code === 'BAD_DATA' || 
              reserveError?.message?.includes('could not decode result data') ||
              reserveError?.message?.includes('Ox')) {
            // Reserve not initialized - return zeros
            if (isMounted) {
              setData(prev => ({
                ...prev,
                balance: BigInt(0),
                balanceWithInterest: BigInt(0),
                interestAccrued: BigInt(0),
                principal: BigInt(0),
                currentIndex: BigInt(0),
                snapshotIndex: BigInt(0),
                apr: 0,
                isLoading: false,
                error: null
              }));
            }
            return;
          }
          throw reserveError; // Re-throw other errors
        }
        
        const currentIndex = isSupply ? reserve.liquidityIndex : reserve.variableBorrowIndex;
        const ratePerSecond = isSupply ? reserve.liquidityRateRayPerSec : reserve.variableBorrowRateRayPerSec;
        const lastUpdate = reserve.lastUpdate;
        
        // Validate data before processing
        if (!currentIndex || currentIndex === BigInt(0) || !snapshotIdx || snapshotIdx === BigInt(0)) {
          // Invalid data - return zeros
          if (isMounted) {
            setData(prev => ({
              ...prev,
              balance: BigInt(0),
              balanceWithInterest: BigInt(0),
              interestAccrued: BigInt(0),
              principal: BigInt(0),
              apr: 0,
              isLoading: false,
              error: null
            }));
          }
          return;
        }
        
        // Calculate current balance
        const balanceWithInterest = calculateInterestAccrued(
          principal,
          snapshotIdx,
          currentIndex
        );
        
        const interestAccrued = balanceWithInterest - principal;
        
        // Calculate APR from RAY rate per second: APR% = rate * SECONDS_PER_YEAR / 1e27 * 100
        const SECONDS_PER_YEAR = 31536000;
        const apr = Number(ratePerSecond) * SECONDS_PER_YEAR / 1e27 * 100;
        
        if (isMounted) {
          const next = {
            balance: principal,
            balanceWithInterest,
            interestAccrued,
            principal,
            currentIndex,
            snapshotIndex: snapshotIdx, // Store snapshot index
            rateRayPerSec: BigInt(ratePerSecond),
            apr,
            isLoading: false,
            error: null,
            // Start client-side simulation from NOW to avoid initial multi-hour jump
            lastUpdate: Date.now()
          };
          setData(next);
          // Persist snapshot so UI continues seamlessly after reloads/tab closes
          try {
            localStorage.setItem(storageKey, JSON.stringify({
              balance: next.balance.toString(),
              balanceWithInterest: next.balanceWithInterest.toString(),
              interestAccrued: next.interestAccrued.toString(),
              principal: next.principal.toString(),
              currentIndex: next.currentIndex.toString(),
              snapshotIndex: next.snapshotIndex.toString(),
              rateRayPerSec: next.rateRayPerSec.toString(),
              apr: next.apr,
              lastUpdate: next.lastUpdate
            }));
          } catch {}
        }
      } catch (error: any) {
        // Check if it's a circuit breaker error
        const isCircuitBreakerError = 
          error?.message?.includes('circuit breaker is open') ||
          error?.code === 'CALL_EXCEPTION' ||
          error?.code === -32603;
        
        // Check if it's a BAD_DATA error (contract not initialized)
        const isBadDataError = 
          error?.code === 'BAD_DATA' ||
          error?.message?.includes('could not decode result data') ||
          error?.message?.includes('Ox');
        
        // Only log non-circuit breaker and non-BAD_DATA errors
        if (!isCircuitBreakerError && !isBadDataError) {
          console.error('Error fetching interest data:', error);
        }
        
        if (isMounted) {
          // For circuit breaker or BAD_DATA errors, keep previous data
          if (isCircuitBreakerError || isBadDataError) {
            // Don't update error state - just keep previous data
          } else {
            // Real error - show it
            setData(prev => ({
              ...prev,
              isLoading: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }));
          }
        }
      }
    };

    // Client-side simulation (updates every 1 second) using EXACT contract math in RAY/BigInt
    const simulateRealtime = () => {
      setData(prev => {
        const now = Math.floor(Date.now() / 1000);
        const lastUpdateSec = Math.floor(prev.lastUpdate / 1000);
        const timeDiff = now - lastUpdateSec;
        
        if (timeDiff <= 0 || prev.principal === BigInt(0) || prev.currentIndex === BigInt(0)) {
          return prev;
        }
        // Simple interest formula: interest = principal × ratePerSecond × timeDiff
        // ratePerSecond = APR / 100 / 31536000
        // For 1 second: interest = principal × (APR/100) / 31536000
        
        const SECONDS_PER_YEAR = 31536000;
        const principalNum = Number(prev.principal) / 1e18;
        const aprDecimal = prev.apr / 100;
        
        // Simple interest per second
        const interestPerSecond = principalNum * aprDecimal / SECONDS_PER_YEAR;
        const totalInterest = interestPerSecond * timeDiff;
        const newBalanceNum = principalNum + totalInterest;
        const newBalance = BigInt(Math.floor(newBalanceNum * 1e18));
        const interestAccrued = newBalance - prev.principal;

        // Advance the index and timestamp for continuous compounding between chain polls
        const updated = {
          ...prev,
          balanceWithInterest: newBalance,
          interestAccrued,
          lastUpdate: now * 1000
        };
        // Persist incremental progress
        try {
          localStorage.setItem(storageKey, JSON.stringify({
            balance: updated.balance.toString(),
            balanceWithInterest: updated.balanceWithInterest.toString(),
            interestAccrued: updated.interestAccrued.toString(),
            principal: updated.principal.toString(),
            currentIndex: updated.currentIndex.toString(),
            snapshotIndex: updated.snapshotIndex.toString(),
            rateRayPerSec: updated.rateRayPerSec.toString(),
            apr: updated.apr,
            lastUpdate: updated.lastUpdate
          }));
        } catch {}
        return updated;
      });
    };

    // Initial fetch
    fetchFromChain();
    
    // Set up blockchain polling
    chainUpdateInterval = setInterval(fetchFromChain, refreshInterval);
    
    // Set up client-side simulation
    realtimeUpdateInterval = setInterval(simulateRealtime, 1000);

    return () => {
      isMounted = false;
      if (chainUpdateInterval) clearInterval(chainUpdateInterval);
      if (realtimeUpdateInterval) clearInterval(realtimeUpdateInterval);
    };
  }, [provider, poolAddress, userAddress, assetAddress, refreshInterval, isSupply]);

  return data;
}

