/**
 * Debug component for deposit interest calculation
 * Shows real-time state of interest calculation
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface DebugInfo {
  displayBalance: number;
  suppliedPrincipal: number;
  suppliedBalance: number;
  interestEarned: number;
  principalWad: string;
  snapshotIndexRay: string;
  oldIndexRay: string;
  rateRayPerSec: string;
  supplyAPR: number;
  isLoadingSnapshot: boolean;
  isRealtimeRunning: boolean;
}

interface DepositInterestDebugProps {
  debugInfo: DebugInfo | null;
}

export function DepositInterestDebug({ debugInfo }: DepositInterestDebugProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!debugInfo) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Interest Calculation Debug</span>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {isOpen ? '▼' : '▶'}
          </button>
        </CardTitle>
      </CardHeader>
      {isOpen && (
        <CardContent className="space-y-4">
          {/* Balance Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted rounded">
              <div className="text-sm text-muted-foreground">Display Balance</div>
              <div className="font-mono text-lg">{debugInfo.displayBalance.toFixed(18)}</div>
            </div>
            <div className="p-3 bg-muted rounded">
              <div className="text-sm text-muted-foreground">Supplied Principal</div>
              <div className="font-mono text-lg">{debugInfo.suppliedPrincipal.toFixed(18)}</div>
            </div>
            <div className="p-3 bg-muted rounded">
              <div className="text-sm text-muted-foreground">Supplied Balance</div>
              <div className="font-mono text-lg">{debugInfo.suppliedBalance.toFixed(18)}</div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
              <div className="text-sm text-muted-foreground">Interest Earned</div>
              <div className="font-mono text-lg text-green-600">
                {debugInfo.interestEarned.toFixed(18)}
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <details className="mt-4">
            <summary className="cursor-pointer font-medium">Technical Details</summary>
            <div className="mt-2 space-y-2 text-sm font-mono bg-muted p-4 rounded">
              <div>
                <span className="text-muted-foreground">Principal (WAD):</span>{' '}
                {debugInfo.principalWad}
              </div>
              <div>
                <span className="text-muted-foreground">Snapshot Index (RAY):</span>{' '}
                {debugInfo.snapshotIndexRay}
              </div>
              <div>
                <span className="text-muted-foreground">Old Index (RAY):</span>{' '}
                {debugInfo.oldIndexRay}
              </div>
              <div>
                <span className="text-muted-foreground">Rate (RAY/sec):</span>{' '}
                {debugInfo.rateRayPerSec}
              </div>
              <div>
                <span className="text-muted-foreground">Supply APR:</span> {debugInfo.supplyAPR}%
              </div>
              <div>
                <span className="text-muted-foreground">Index Ratio:</span>{' '}
                {debugInfo.oldIndexRay && debugInfo.snapshotIndexRay
                  ? (Number(debugInfo.oldIndexRay) / Number(debugInfo.snapshotIndexRay)).toFixed(18)
                  : 'N/A'}
              </div>
            </div>
          </details>

          {/* Status */}
          <div className="flex gap-4">
            <div className={`px-3 py-1 rounded ${debugInfo.isLoadingSnapshot ? 'bg-yellow-100 dark:bg-yellow-900/20' : 'bg-green-100 dark:bg-green-900/20'}`}>
              <span className="text-sm">
                {debugInfo.isLoadingSnapshot ? '⏳ Loading Snapshot' : '✅ Snapshot Loaded'}
              </span>
            </div>
            <div className={`px-3 py-1 rounded ${debugInfo.isRealtimeRunning ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-900/20'}`}>
              <span className="text-sm">
                {debugInfo.isRealtimeRunning ? '🟢 Realtime Running' : '⚪ Realtime Stopped'}
              </span>
            </div>
          </div>

          {/* Warnings */}
          {debugInfo.rateRayPerSec === '0' && debugInfo.supplyAPR === 0 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
              <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                ⚠️ Warning: No rate available
              </div>
              <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Both rate from chain and APR are 0. Interest calculation cannot proceed.
              </div>
            </div>
          )}

          {debugInfo.principalWad === '0' && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
              <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                ⚠️ Warning: Principal is 0
              </div>
              <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                No principal found. Make sure you have deposited assets.
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

