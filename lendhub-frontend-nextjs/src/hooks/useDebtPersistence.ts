/**
 * useDebtPersistence Hook
 * 
 * Manages user debt and interest data persistence
 * Loads from database and provides real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import {
  loadUserPositions,
  getRealtimeBalance,
  getUserPositionForAsset,
  type UserPositionsData,
  type UserPosition
} from '../lib/debtPersistence';

interface UseDebtPersistenceOptions {
  userAddress: string | null;
  refreshInterval?: number; // Refresh from DB every N ms
  realtimeUpdateInterval?: number; // Client-side simulation update every N ms
}

interface DebtPersistenceData {
  positionsData: UserPositionsData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdate: number;
  refreshPositions: () => Promise<void>;
  getPositionForAsset: (assetAddress: string) => UserPosition | null;
  getRealtimeSupplyBalance: (assetAddress: string) => bigint;
  getRealtimeDebtBalance: (assetAddress: string) => bigint;
}

export function useDebtPersistence({
  userAddress,
  refreshInterval = 60000, // 1 minute
  realtimeUpdateInterval = 1000 // 1 second
}: UseDebtPersistenceOptions): DebtPersistenceData {
  const [positionsData, setPositionsData] = useState<UserPositionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load positions from database
  const loadPositions = useCallback(async () => {
    if (!userAddress) {
      setPositionsData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const data = await loadUserPositions(userAddress, true);
      setPositionsData(data);
      setLastUpdate(Date.now());
    } catch (err: any) {
      console.error('❌ Error loading positions:', err);
      setError(err.message || 'Failed to load positions');
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  // Initial load
  useEffect(() => {
    loadPositions();
  }, [loadPositions, refreshTrigger]);

  // Periodic refresh from database
  useEffect(() => {
    if (!userAddress || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      loadPositions();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [userAddress, refreshInterval, loadPositions]);

  // Real-time client-side updates (faster than DB refresh)
  useEffect(() => {
    if (!positionsData || realtimeUpdateInterval <= 0) return;

    const interval = setInterval(() => {
      // Trigger a re-render to recalculate balances
      setLastUpdate(Date.now());
    }, realtimeUpdateInterval);

    return () => clearInterval(interval);
  }, [positionsData, realtimeUpdateInterval]);

  // Get position for specific asset
  const getPositionForAsset = useCallback((assetAddress: string): UserPosition | null => {
    return getUserPositionForAsset(positionsData, assetAddress);
  }, [positionsData]);

  // Get real-time supply balance with interest
  const getRealtimeSupplyBalance = useCallback((assetAddress: string): bigint => {
    const position = getPositionForAsset(assetAddress);
    return getRealtimeBalance(position, true);
  }, [getPositionForAsset]);

  // Get real-time debt balance with interest
  const getRealtimeDebtBalance = useCallback((assetAddress: string): bigint => {
    const position = getPositionForAsset(assetAddress);
    return getRealtimeBalance(position, false);
  }, [getPositionForAsset]);

  // Manual refresh function
  const refreshPositions = useCallback(async () => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return {
    positionsData,
    isLoading,
    error,
    lastUpdate,
    refreshPositions,
    getPositionForAsset,
    getRealtimeSupplyBalance,
    getRealtimeDebtBalance
  };
}

