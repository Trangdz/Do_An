/**
 * Debug OnChain Component - Kiểm tra tại sao OnChainRealtimeBalance không hoạt động
 */

import React, { useState, useEffect } from 'react';
import { useOnChainSnapshot } from '../hooks/useOnChainSnapshot';

interface DebugOnChainProps {
  provider: any;
  poolAddress: string;
  userAddress: string;
  assetAddress: string;
  tokenSymbol: string;
  isSupply?: boolean;
}

export function DebugOnChain({
  provider,
  poolAddress,
  userAddress,
  assetAddress,
  tokenSymbol,
  isSupply = true
}: DebugOnChainProps) {
  
  const {
    snapshot,
    actualBalance,
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
    refreshInterval: 10000,
    autoRefresh: true
  });

  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    console.log('🔍 DebugOnChain mounted for', tokenSymbol);
    
    const info = {
      tokenSymbol,
      hasProvider: !!provider,
      hasPoolAddress: !!poolAddress,
      hasUserAddress: !!userAddress,
      hasAssetAddress: !!assetAddress,
      isLoading,
      error: error || null,
      hasSnapshot: !!snapshot,
      snapshotData: snapshot ? {
        scaledBalance: snapshot.scaledBalance,
        liquidityIndex: snapshot.liquidityIndex,
        liquidityRate: snapshot.liquidityRate,
        lastUpdateTimestamp: snapshot.lastUpdateTimestamp,
        snapshotIndex: snapshot.snapshotIndex
      } : null,
      actualBalance,
      lastFetchTime
    };
    
    setDebugInfo(info);
    console.log('🔍 DebugOnChain info:', info);
  }, [snapshot, isLoading, error, tokenSymbol]);

  if (isLoading) {
    return (
      <div className="text-center border-2 border-yellow-300 p-2 rounded bg-yellow-50">
        <div className="text-xs text-yellow-600">🔍 Loading {tokenSymbol}...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center border-2 border-red-300 p-2 rounded bg-red-50">
        <div className="text-xs text-red-600">🔍 Error {tokenSymbol}: {error}</div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="text-center border-2 border-gray-300 p-2 rounded bg-gray-50">
        <div className="text-xs text-gray-600">🔍 No snapshot {tokenSymbol}</div>
      </div>
    );
  }

  const hasBalance = snapshot.scaledBalance > 0;
  const hasRate = snapshot.liquidityRate > 0;

  return (
    <div className="text-center border-2 border-purple-300 p-2 rounded bg-purple-50">
      <div className="text-xs text-purple-600 mb-1">
        🔍 DEBUG {tokenSymbol}
      </div>
      <div className="text-xs text-gray-700">
        Balance: {hasBalance ? '✅' : '❌'} | Rate: {hasRate ? '✅' : '❌'}
      </div>
      {hasBalance && hasRate && (
        <div className="text-xs text-green-600 mt-1">
          Should work! Check console logs
        </div>
      )}
      {(!hasBalance || !hasRate) && (
        <div className="text-xs text-red-600 mt-1">
          Issue: {!hasBalance ? 'No balance' : 'No rate'}
        </div>
      )}
    </div>
  );
}

