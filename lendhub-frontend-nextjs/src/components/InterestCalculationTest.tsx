/**
 * Test component for real-time interest calculation
 * This component tests the interest calculation logic in isolation
 */

import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const RAY = BigInt('1000000000000000000000000000'); // 1e27
const SECONDS_PER_YEAR = 31536000;

interface TestState {
  principal: number;
  snapshotIndex: bigint;
  currentIndex: bigint;
  rateRayPerSec: bigint;
  apr: number;
  balance: number;
  interest: number;
  timeElapsed: number;
  isRunning: boolean;
}

export function InterestCalculationTest() {
  const [state, setState] = useState<TestState>({
    principal: 1200,
    snapshotIndex: RAY,
    currentIndex: RAY,
    rateRayPerSec: BigInt('110998000000000'), // ~0.35% APY
    apr: 0.35,
    balance: 1200,
    interest: 0,
    timeElapsed: 0,
    isRunning: false
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const lastUpdateRef = useRef<number>(Date.now());

  // Calculate balance from principal and indices
  const calculateBalance = (principal: bigint, snapshotIndex: bigint, currentIndex: bigint): number => {
    const actualWad = (principal * currentIndex) / snapshotIndex;
    return Number(ethers.formatUnits(actualWad, 18));
  };

  // Update index based on rate and time
  const updateIndex = (oldIndex: bigint, rateRayPerSec: bigint, deltaSec: number): bigint => {
    if (deltaSec <= 0) return oldIndex;
    const increment = (oldIndex * rateRayPerSec * BigInt(deltaSec)) / RAY;
    return oldIndex + increment;
  };

  // Start real-time calculation
  const startTest = () => {
    const principalWad = ethers.parseEther(state.principal.toString());
    const snapshotIndex = RAY;
    const currentIndex = RAY;
    const apr = state.apr;
    const aprDecimal = apr / 100;
    const ratePerSecond = aprDecimal / SECONDS_PER_YEAR;
    const rateRayPerSec = BigInt(Math.floor(ratePerSecond * 1e27));

    setState(prev => ({
      ...prev,
      snapshotIndex,
      currentIndex,
      rateRayPerSec,
      balance: state.principal,
      interest: 0,
      timeElapsed: 0,
      isRunning: true
    }));

    startTimeRef.current = Date.now();
    lastUpdateRef.current = Date.now();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setState(prev => {
        const now = Date.now();
        const deltaMs = now - lastUpdateRef.current;
        const deltaSec = Math.floor(deltaMs / 1000);

        if (deltaSec <= 0) return prev;

        const newIndex = updateIndex(prev.currentIndex, prev.rateRayPerSec, deltaSec);
        const principalWad = ethers.parseEther(prev.principal.toString());
        const newBalance = calculateBalance(principalWad, prev.snapshotIndex, newIndex);
        const interest = newBalance - prev.principal;
        const totalTimeElapsed = Math.floor((now - startTimeRef.current) / 1000);

        lastUpdateRef.current = now;

        return {
          ...prev,
          currentIndex: newIndex,
          balance: newBalance,
          interest,
          timeElapsed: totalTimeElapsed
        };
      });
    }, 1000);
  };

  // Stop test
  const stopTest = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(prev => ({ ...prev, isRunning: false }));
  };

  // Reset test
  const resetTest = () => {
    stopTest();
    setState(prev => ({
      ...prev,
      snapshotIndex: RAY,
      currentIndex: RAY,
      balance: prev.principal,
      interest: 0,
      timeElapsed: 0
    }));
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Format number with precision
  const formatNumber = (num: number, decimals: number = 18): string => {
    return num.toFixed(decimals);
  };

  // Format BigInt
  const formatBigInt = (value: bigint): string => {
    return value.toString();
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Interest Calculation Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Principal Amount</label>
            <input
              type="number"
              value={state.principal}
              onChange={(e) => setState(prev => ({ ...prev, principal: parseFloat(e.target.value) || 0 }))}
              disabled={state.isRunning}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">APR (%)</label>
            <input
              type="number"
              step="0.01"
              value={state.apr}
              onChange={(e) => setState(prev => ({ ...prev, apr: parseFloat(e.target.value) || 0 }))}
              disabled={state.isRunning}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button onClick={startTest} disabled={state.isRunning}>
            Start Test
          </Button>
          <Button onClick={stopTest} disabled={!state.isRunning} variant="outline">
            Stop
          </Button>
          <Button onClick={resetTest} variant="outline">
            Reset
          </Button>
        </div>

        {/* Status */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="font-medium">{state.isRunning ? '🟢 Running' : '⚪ Stopped'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Time Elapsed</div>
              <div className="font-medium">{state.timeElapsed}s</div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded">
              <div className="text-sm text-muted-foreground mb-1">Principal</div>
              <div className="text-2xl font-mono">{formatNumber(state.principal)}</div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-sm text-muted-foreground mb-1">Current Balance</div>
              <div className="text-2xl font-mono text-green-600">{formatNumber(state.balance)}</div>
            </div>
          </div>

          <div className="p-4 border rounded bg-green-50 dark:bg-green-900/20">
            <div className="text-sm text-muted-foreground mb-1">Interest Earned</div>
            <div className="text-3xl font-mono font-bold text-green-600">
              {formatNumber(state.interest)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {state.principal > 0 ? ((state.interest / state.principal) * 100).toFixed(6) : '0'}% of principal
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <details className="p-4 border rounded">
          <summary className="cursor-pointer font-medium">Technical Details</summary>
          <div className="mt-4 space-y-2 text-sm font-mono">
            <div>
              <span className="text-muted-foreground">Snapshot Index:</span>{' '}
              {formatBigInt(state.snapshotIndex)}
            </div>
            <div>
              <span className="text-muted-foreground">Current Index:</span>{' '}
              {formatBigInt(state.currentIndex)}
            </div>
            <div>
              <span className="text-muted-foreground">Rate (RAY/sec):</span>{' '}
              {formatBigInt(state.rateRayPerSec)}
            </div>
            <div>
              <span className="text-muted-foreground">Index Ratio:</span>{' '}
              {Number(state.currentIndex) / Number(state.snapshotIndex)}
            </div>
            <div>
              <span className="text-muted-foreground">APR:</span> {state.apr}%
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

