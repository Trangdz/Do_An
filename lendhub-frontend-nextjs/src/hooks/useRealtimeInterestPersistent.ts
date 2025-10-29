/**
 * useRealtimeInterestPersistent Hook
 * 
 * Aave-style real-time interest accrual with cross-device persistence
 * 
 * Features:
 * - Real-time interest calculation using Aave formula
 * - Auto-save snapshot on tab close/reload
 * - Restore and continue from any device
 * - Sync with backend every 60 seconds
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Constants
const SECONDS_PER_YEAR = 31536000;
const SYNC_INTERVAL = 60000; // Sync with backend every 60 seconds
const UPDATE_INTERVAL = 1000; // Update UI every 1 second

// Types
interface InterestSnapshot {
  user: string;
  asset: string;
  scaledBalance: number; // User's balance at deposit time
  liquidityIndex: number; // Global index at last update
  liquidityRate: number; // APR as decimal (0.05 = 5%)
  lastUpdateTimestamp: number; // Unix timestamp in seconds
}

interface UseRealtimeInterestOptions {
  userAddress: string | null;
  assetSymbol: string;
  scaledBalance: number; // Initial balance at deposit
  initialLiquidityIndex: number; // Index at deposit time
  currentLiquidityRate: number; // Current APR (0-1)
}

interface InterestData {
  displayBalance: number; // Current balance with interest
  interestEarned: number; // Total interest earned
  liquidityIndex: number; // Current index
  lastUpdateTimestamp: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Save snapshot to localStorage and backend
 */
async function saveSnapshot(snapshot: InterestSnapshot): Promise<void> {
  // Save to localStorage immediately (fast, always works)
  try {
    const key = `interest_${snapshot.user}_${snapshot.asset}`;
    localStorage.setItem(key, JSON.stringify(snapshot));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }

  // Save to backend API (can fail, but we try)
  try {
    const response = await fetch('/api/snapshot/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot)
    });

    if (!response.ok) {
      console.warn('Failed to save snapshot to backend:', response.status);
    }
  } catch (error) {
    // Network errors are OK - localStorage is the fallback
    console.warn('Network error saving snapshot:', error);
  }
}

/**
 * Load snapshot from backend or localStorage
 */
async function loadSnapshot(
  userAddress: string,
  assetSymbol: string
): Promise<InterestSnapshot | null> {
  // Try backend first
  try {
    const response = await fetch(
      `/api/snapshot/get?user=${userAddress}&asset=${assetSymbol}`
    );

    if (response.ok) {
      const data = await response.json();
      if (data && data.liquidityIndex) {
        return data;
      }
    }
  } catch (error) {
    console.warn('Failed to load from backend:', error);
  }

  // Fallback to localStorage
  try {
    const key = `interest_${userAddress}_${assetSymbol}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
  }

  return null;
}

/**
 * Calculate current balance using Aave formula
 * 
 * Formula:
 *   liquidityIndex = liquidityIndex * (1 + liquidityRate * delta / SECONDS_PER_YEAR)
 *   balance = scaledBalance * liquidityIndex
 */
function calculateCurrentBalance(
  scaledBalance: number,
  liquidityIndex: number,
  liquidityRate: number,
  timeDelta: number
): { balance: number; newIndex: number } {
  // Calculate new index using Aave formula
  // newIndex = oldIndex * (1 + rate * time / SECONDS_PER_YEAR)
  const rateMultiplier = 1 + (liquidityRate * timeDelta) / SECONDS_PER_YEAR;
  const newIndex = liquidityIndex * rateMultiplier;

  // Calculate balance: balance = scaledBalance * newIndex
  const balance = scaledBalance * newIndex;

  return { balance, newIndex };
}

/**
 * Main Hook
 */
export function useRealtimeInterestPersistent({
  userAddress,
  assetSymbol,
  scaledBalance: initialScaledBalance,
  initialLiquidityIndex,
  currentLiquidityRate
}: UseRealtimeInterestOptions): InterestData {
  // State
  const [data, setData] = useState<InterestData>({
    displayBalance: initialScaledBalance,
    interestEarned: 0,
    liquidityIndex: initialLiquidityIndex,
    lastUpdateTimestamp: Math.floor(Date.now() / 1000),
    isLoading: true,
    error: null
  });

  // State to track initialization (triggers re-renders)
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs to persist across renders
  const liquidityIndexRef = useRef<number>(initialLiquidityIndex);
  const scaledBalanceRef = useRef<number>(initialScaledBalance);
  const lastUpdateRef = useRef<number>(Math.floor(Date.now() / 1000));
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Initialize from snapshot (called once on mount)
   */
  const initializeFromSnapshot = useCallback(async () => {
    if (!userAddress || isInitialized) return;

    try {
      // Load saved snapshot
      const snapshot = await loadSnapshot(userAddress, assetSymbol);

      if (snapshot) {
        // Calculate time delta since last update
        const now = Math.floor(Date.now() / 1000);
        const delta = now - snapshot.lastUpdateTimestamp;

        // Calculate current balance using Aave formula
        const { balance, newIndex } = calculateCurrentBalance(
          snapshot.scaledBalance,
          snapshot.liquidityIndex,
          snapshot.liquidityRate,
          delta
        );

        // Update refs and state
        scaledBalanceRef.current = snapshot.scaledBalance;
        liquidityIndexRef.current = newIndex;
        lastUpdateRef.current = now;

        const interestEarned = balance - (snapshot.scaledBalance * initialLiquidityIndex);

        setData({
          displayBalance: balance,
          interestEarned,
          liquidityIndex: newIndex,
          lastUpdateTimestamp: now,
          isLoading: false,
          error: null
        });

        console.log('✅ Restored from snapshot:', {
          snapshotTime: new Date(snapshot.lastUpdateTimestamp * 1000).toLocaleString(),
          deltaHours: (delta / 3600).toFixed(2),
          balance,
          interestEarned
        });
      } else {
        // No snapshot - use initial values
        liquidityIndexRef.current = initialLiquidityIndex;
        scaledBalanceRef.current = initialScaledBalance;
        lastUpdateRef.current = Math.floor(Date.now() / 1000);

        setData(prev => ({
          ...prev,
          displayBalance: initialScaledBalance,
          liquidityIndex: initialLiquidityIndex,
          lastUpdateTimestamp: lastUpdateRef.current,
          isLoading: false
        }));

        console.log('✅ Initialized without snapshot:', {
          scaledBalance: initialScaledBalance,
          liquidityIndex: initialLiquidityIndex,
          rate: currentLiquidityRate
        });
      }

      setIsInitialized(true);
    } catch (error: any) {
      console.error('Failed to initialize from snapshot:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
      setIsInitialized(true); // Mark as initialized even on error
    }
  }, [userAddress, assetSymbol, initialLiquidityIndex, initialScaledBalance, isInitialized]);

  /**
   * Save current state as snapshot
   */
  const saveCurrentSnapshot = useCallback(async () => {
    if (!userAddress || !isInitialized) return;

    const snapshot: InterestSnapshot = {
      user: userAddress,
      asset: assetSymbol,
      scaledBalance: scaledBalanceRef.current,
      liquidityIndex: liquidityIndexRef.current,
      liquidityRate: currentLiquidityRate,
      lastUpdateTimestamp: lastUpdateRef.current
    };

    await saveSnapshot(snapshot);
  }, [userAddress, assetSymbol, currentLiquidityRate, isInitialized]);

  /**
   * Real-time interest calculation (called every second)
   */
  const updateInterest = useCallback(() => {
    if (!isInitialized) {
      console.log('⏸️ Skipping update: not initialized');
      return;
    }

    if (currentLiquidityRate <= 0) {
      console.log('⏸️ Skipping update: rate is 0');
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const delta = now - lastUpdateRef.current;

    if (delta <= 0) {
      console.log('⏸️ Skipping update: delta <= 0', delta);
      return;
    }

    // Calculate new balance using Aave formula
    const { balance, newIndex } = calculateCurrentBalance(
      scaledBalanceRef.current,
      liquidityIndexRef.current,
      currentLiquidityRate,
      delta
    );

    // Update refs
    liquidityIndexRef.current = newIndex;
    lastUpdateRef.current = now;

    // Calculate interest earned
    const interestEarned = balance - (scaledBalanceRef.current * initialLiquidityIndex);

    console.log('💰 Interest update:', {
      delta,
      oldBalance: scaledBalanceRef.current * liquidityIndexRef.current,
      newBalance: balance,
      interest: interestEarned,
      newIndex
    });

    // Update state
    setData({
      displayBalance: balance,
      interestEarned,
      liquidityIndex: newIndex,
      lastUpdateTimestamp: now,
      isLoading: false,
      error: null
    });
  }, [currentLiquidityRate, initialLiquidityIndex, isInitialized]);

  // Initialize on mount
  useEffect(() => {
    initializeFromSnapshot();
  }, [initializeFromSnapshot]);

  // Set up real-time interval
  useEffect(() => {
    // Wait for initialization
    if (!isInitialized) {
      console.log('⏳ Waiting for initialization...');
      return;
    }

    console.log('🚀 Starting interest update interval', {
      rate: currentLiquidityRate,
      scaledBalance: scaledBalanceRef.current,
      liquidityIndex: liquidityIndexRef.current
    });

    // Update every second
    intervalRef.current = setInterval(() => {
      updateInterest();
    }, UPDATE_INTERVAL);

    // Initial update
    updateInterest();

    return () => {
      if (intervalRef.current) {
        console.log('🛑 Clearing interval');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [updateInterest, isInitialized]);

  // Sync with backend every 60 seconds
  useEffect(() => {
    if (!userAddress || !isInitialized) return;

    syncIntervalRef.current = setInterval(() => {
      saveCurrentSnapshot();
    }, SYNC_INTERVAL);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [userAddress, saveCurrentSnapshot, isInitialized]);

  // Save snapshot on page unload/reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveCurrentSnapshot();
    };

    const handlePageHide = () => {
      saveCurrentSnapshot();
    };

    // Desktop browsers
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Mobile browsers
    window.addEventListener('pagehide', handlePageHide);

    // Also save when user switches tabs (visibility change)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        saveCurrentSnapshot();
      }
    });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [saveCurrentSnapshot]);

  // Update when liquidity rate changes
  useEffect(() => {
    if (currentLiquidityRate > 0 && isInitialized) {
      // Rate changed - save current state and continue
      saveCurrentSnapshot();
    }
  }, [currentLiquidityRate, saveCurrentSnapshot, isInitialized]);

  return data;
}

