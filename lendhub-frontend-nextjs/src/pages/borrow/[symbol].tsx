import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { AppLayout } from '@/components/layout/AppLayout';
import useLendContext from '@/context/useLendContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { repay, parseTokenAmount } from '@/lib/tx';
import { CONFIG } from '@/config/contracts';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatPercentage, formatNumber } from '@/lib/math';
import { useSharedAPR } from '@/hooks/useSharedAPR';
import { ethers } from 'ethers';
import Image from 'next/image';
import { getReadOnlyContract } from '@/lib/readProvider';

export default function BorrowDetailPage() {
  const router = useRouter();
  const { symbol } = router.query;
  const { userAssets, yourBorrows, metamaskDetails, accountData, refresh } = useLendContext();
  const [repayAmount, setRepayAmount] = useState('');
  const { showToast } = useToast();

  const isConnected = !!metamaskDetails.currentAccount;
  const provider = metamaskDetails.provider;
  const signer = metamaskDetails.signer;

  // Find asset by symbol
  const asset = userAssets.find((a: any) => a.symbol === symbol) || 
                (CONFIG.TOKENS || []).find((t: any) => t.symbol === symbol);
  
  const borrowAsset = yourBorrows.find((b: any) => 
    b.address?.toLowerCase() === asset?.address?.toLowerCase()
  );

  // Get reserve data from contract
  const assetAddress = asset?.address && asset.address !== '0x0000000000000000000000000000000000000000' 
    ? asset.address 
    : '';
  const shouldFetchAPR = asset && asset.symbol !== 'ETH' && isConnected && provider !== null && assetAddress;
  const aprData = useSharedAPR(
    shouldFetchAPR ? provider : null,
    CONFIG.LENDING_POOL,
    assetAddress || '',
    30000
  );

  // Calculate APY from APR
  const SECONDS_PER_YEAR = 31536000;
  const calculateAPY = (apr: number): number => {
    if (apr <= 0) return 0;
    const aprDecimal = apr / 100;
    const apy = Math.pow(1 + aprDecimal / SECONDS_PER_YEAR, SECONDS_PER_YEAR) - 1;
    return apy * 100;
  };
  const borrowAPR = aprData?.borrowAPR || 0;
  const borrowAPY = calculateAPY(borrowAPR);

  // Real-time interest calculation using Aave formula for borrow
  const userAddress = metamaskDetails.currentAccount;
  const storageKey = `borrow_realtime_${userAddress}_${asset?.symbol}_${asset?.address}`;
  const RAY = BigInt('1000000000000000000000000000'); // 1e27 as BigInt
  const WAD = BigInt('1000000000000000000'); // 1e18 as BigInt
  
  // State for realtime calculation
  const [displayBalance, setDisplayBalance] = useState<number>(0);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState<boolean>(true);
  
  // Track if real-time is running to prevent resets
  // IMPORTANT: Once set to true, never reset to false unless principal is 0
  // This prevents race conditions where cleanup sets it to false and fetchChainSnapshot resets balance
  const isRealtimeRunningRef = useRef<boolean>(false);
  // Track current displayBalance to avoid stale closure
  const displayBalanceRef = useRef<number>(0);
  
  // Track if initial sync has been done to prevent repeated resets
  const hasInitialSyncedRef = useRef<boolean>(false);
  
  // Refs for Aave formula calculation (BigInt precision) - for borrow, debt grows
  const principalWadRef = useRef<bigint>(BigInt(0)); // debt principal in WAD
  const snapshotIndexRayRef = useRef<bigint>(RAY); // variableBorrowIndex when user borrowed
  const oldIndexRayRef = useRef<bigint>(RAY); // variableBorrowIndex at last update
  const rateRayPerSecRef = useRef<bigint>(BigInt(0)); // variableBorrowRateRayPerSec
  const lastUpdateMsRef = useRef<number>(Date.now()); // milliseconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load snapshot from localStorage
  const loadStoredSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || !userAddress || !asset?.symbol) return null;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        console.log('📱 Loaded borrow snapshot from localStorage:', data);
        return data;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load from localStorage:', error);
    }
    return null;
  }, [storageKey, userAddress, asset?.symbol]);
  
  // Save snapshot to localStorage
  const saveSnapshot = useCallback((principalWad: bigint, snapshotIndexRay: bigint, oldIndexRay: bigint, rateRayPerSec: bigint, lastUpdateMs: number) => {
    if (typeof window === 'undefined') return;
    try {
      const data = {
        principalWad: principalWad.toString(),
        snapshotIndexRay: snapshotIndexRay.toString(),
        oldIndexRay: oldIndexRay.toString(),
        rateRayPerSec: rateRayPerSec.toString(),
        lastUpdateMs
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
      console.log('💾 Saved borrow snapshot:', data);
    } catch (error) {
      console.warn('⚠️ Failed to save to localStorage:', error);
    }
  }, [storageKey]);
  
  // Fetch latest transaction data from chain
  const fetchChainSnapshot = useCallback(async () => {
    if (!provider || !userAddress || !assetAddress || asset?.symbol === 'ETH') {
      setIsLoadingSnapshot(false);
      return null;
    }
    
    try {
      const abi = [
        'function userReserves(address user, address asset) view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)',
        'function reserves(address asset) view returns (tuple(uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate))'
      ];
      
      const pool = getReadOnlyContract(CONFIG.LENDING_POOL, abi, provider);
      
      const [userReserve, reserve] = await Promise.all([
        pool.userReserves(userAddress, assetAddress),
        pool.reserves(assetAddress)
      ]);
      
      const principalWad = userReserve.borrow.principal as bigint;
      if (principalWad === BigInt(0)) {
        // Balance is 0, reset all refs and display
        console.log('📊 Borrow balance is 0, resetting display');
        principalWadRef.current = BigInt(0);
        snapshotIndexRayRef.current = RAY;
        oldIndexRayRef.current = RAY;
        rateRayPerSecRef.current = BigInt(0);
        lastUpdateMsRef.current = Date.now();
        setDisplayBalance(0);
        displayBalanceRef.current = 0;
        isRealtimeRunningRef.current = false;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsLoadingSnapshot(false);
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem(storageKey);
        }
        return null;
      }
      
      // Get data from chain (raw BigInt for precision) - using variableBorrowIndex for borrow
      const snapshotIndexRay = userReserve.borrow.index as bigint; // snapshot index when borrowed
      const variableBorrowIndexRay = reserve.variableBorrowIndex as bigint; // current variableBorrowIndex
      const variableBorrowRateRayPerSec = reserve.variableBorrowRateRayPerSec as bigint; // RAY per second
      const lastUpdate = Number(reserve.lastUpdate); // seconds
      
      // Validate snapshotIndex - if it's 0 or invalid, use RAY as default
      const validSnapshotIndex = snapshotIndexRay > BigInt(0) ? snapshotIndexRay : RAY;
      
      // Calculate expected APR from rate for verification
      // variableBorrowRateRayPerSec is already rate per second in RAY
      // To get APR: multiply by SECONDS_PER_YEAR and convert to percentage
      const ratePerSecondNum = Number(variableBorrowRateRayPerSec) / Number(RAY); // Convert RAY to decimal
      const expectedAPRFromRate = ratePerSecondNum * SECONDS_PER_YEAR * 100; // Multiply by seconds per year and convert to %
      
      console.log('📊 Fetched borrow chain snapshot:', {
        principalWad: principalWad.toString(),
        snapshotIndexRay: snapshotIndexRay.toString(),
        validSnapshotIndex: validSnapshotIndex.toString(),
        variableBorrowIndexRay: variableBorrowIndexRay.toString(),
        variableBorrowRateRayPerSec: variableBorrowRateRayPerSec.toString(),
        ratePerSecond: ratePerSecondNum.toFixed(12),
        expectedAPRFromRate: expectedAPRFromRate.toFixed(4) + '%',
        lastUpdate: new Date(lastUpdate * 1000).toLocaleString()
      });
      
      // IMPORTANT: Check if real-time is running before updating refs
      // If real-time is running, we should NOT update oldIndexRayRef or lastUpdateMsRef as it will reset progress
      const isRealtimeCurrentlyActive = isRealtimeRunningRef.current && intervalRef.current !== null;
      
      // Save to localStorage (always save latest data)
      saveSnapshot(principalWad, validSnapshotIndex, variableBorrowIndexRay, variableBorrowRateRayPerSec, lastUpdate * 1000);
      
      // Always update principal and snapshotIndex (these don't affect real-time calculation)
      principalWadRef.current = principalWad;
      snapshotIndexRayRef.current = validSnapshotIndex;
      rateRayPerSecRef.current = variableBorrowRateRayPerSec; // Update rate for future calculations
      
      // CRITICAL: Only update oldIndexRayRef and lastUpdateMsRef if real-time is NOT running
      // If real-time is running, these refs are being actively used and updating them will reset progress
      if (!isRealtimeCurrentlyActive) {
        // Real-time not running, safe to update all refs
        oldIndexRayRef.current = variableBorrowIndexRay;
        
        const chainTimestampMs = lastUpdate * 1000;
        const nowMs = Date.now();
        
        // Validate timestamp from chain - if it's in the future or too old, use current time
        const oneYearMs = 365 * 24 * 60 * 60 * 1000;
        if (chainTimestampMs > nowMs || chainTimestampMs < (nowMs - oneYearMs)) {
          console.warn('⚠️ Invalid timestamp from chain, using current time:', {
            chainTimestamp: new Date(chainTimestampMs).toLocaleString(),
            now: new Date(nowMs).toLocaleString(),
            diff: (chainTimestampMs - nowMs) / 1000 + 's'
          });
          lastUpdateMsRef.current = nowMs;
        } else {
          lastUpdateMsRef.current = chainTimestampMs;
          console.log('✅ Updated refs from chain (realtime not active):', {
            oldIndexRay: oldIndexRayRef.current.toString(),
            lastUpdateMs: new Date(chainTimestampMs).toLocaleString()
          });
        }
      } else {
        // Real-time is running - preserve oldIndexRayRef and lastUpdateMsRef to avoid resetting progress
        console.log('⏸️ Skipping oldIndexRayRef and lastUpdateMsRef update (realtime active, preserving progress):', {
          chainOldIndex: variableBorrowIndexRay.toString(),
          currentOldIndex: oldIndexRayRef.current.toString(),
          chainTimestamp: new Date(lastUpdate * 1000).toLocaleString(),
          currentLastUpdate: new Date(lastUpdateMsRef.current).toLocaleString(),
          reason: 'Real-time is running, updating would reset progress'
        });
      }
      
      // Calculate current debt using Aave formula: actualDebt = scaledDebt * (currentIndex / snapshotIndex)
      const actualWad = (principalWad * variableBorrowIndexRay) / validSnapshotIndex;
      const actualBalance = Number(ethers.formatUnits(actualWad, 18));
      const principalNum = Number(ethers.formatUnits(principalWad, 18));
      const interestEarned = actualBalance - principalNum;
      
      // Get current APR for logging
      const currentAPR = aprData?.borrowAPR || 0;
      
      // IMPORTANT: Only update displayBalance if real-time is NOT running
      // OR if balance from chain is significantly higher (new borrow/repay detected)
      // This prevents resetting real-time progress when auto-refreshing
      // Check both flag AND interval to ensure real-time is actually running
      const isRealtimeActive = isRealtimeRunningRef.current && intervalRef.current !== null;
      // Use ref to get current value (avoid stale closure)
      const currentDisplayBalance = displayBalanceRef.current || 0;
      
      // Calculate balance difference
      const balanceDiff = actualBalance - currentDisplayBalance;
      const absBalanceDiff = Math.abs(balanceDiff);
      
      // Only update if:
      // 1. Real-time is not running AND (balance is 0 OR significant increase), OR
      // 2. Real-time is running BUT chain balance is significantly HIGHER (new borrow), OR
      // 3. Current balance is 0 (initial state)
      // NEVER update if real-time balance is higher than chain (real-time has more interest)
      const isSignificantIncrease = balanceDiff > Math.max(principalNum * 0.01, 0.1); // 1% or 0.1 tokens increase
      
      // If real-time is active, only update if chain balance is significantly HIGHER (new borrow)
      // Never update if chain balance is lower (would reset real-time progress)
      const shouldUpdateDisplayBalance = 
        currentDisplayBalance === 0 || // Initial state
        (!isRealtimeActive && (actualBalance > 0 || isSignificantIncrease)) || // Not running, allow update
        (isRealtimeActive && isSignificantIncrease); // Running, only if significant increase (new borrow)
      
      console.log('✅ Calculated borrow balance from chain:', {
        principal: principalNum,
        snapshotIndexRay: validSnapshotIndex.toString(),
        variableBorrowIndexRay: variableBorrowIndexRay.toString(),
        actualBalance,
        interestEarned,
        rateRayPerSec: variableBorrowRateRayPerSec.toString(),
        borrowAPR: currentAPR,
        currentDisplayBalance,
        isRealtimeActive,
        balanceDiff,
        absBalanceDiff: absBalanceDiff,
        isSignificantIncrease,
        shouldUpdateDisplayBalance,
        reason: !shouldUpdateDisplayBalance ? 
          (isRealtimeActive ? 'Real-time active, preserving progress' : 'No significant change') :
          (currentDisplayBalance === 0 ? 'Initial state' : 
           isSignificantIncrease ? 'Significant increase (new borrow)' : 
           'Real-time not active')
      });
      
      if (shouldUpdateDisplayBalance) {
        setDisplayBalance(actualBalance);
        displayBalanceRef.current = actualBalance;
        console.log('✅ Updated displayBalance from chain:', actualBalance, 'Interest:', interestEarned);
      } else {
        console.log('⏸️ Keeping real-time displayBalance (real-time active):', {
          realtime: currentDisplayBalance,
          chain: actualBalance,
          difference: balanceDiff,
          reason: 'Real-time is running, preserving progress'
        });
      }
      
      setIsLoadingSnapshot(false);
      
      return { actualBalance };
    } catch (error) {
      console.error('❌ Failed to fetch chain snapshot:', error);
      setIsLoadingSnapshot(false);
      return null;
    }
  }, [provider, userAddress, assetAddress, asset?.symbol, saveSnapshot, storageKey]);
  
  // Initialize: Load from localStorage first, then fetch from chain
  useEffect(() => {
    if (!userAddress || !asset?.symbol || !assetAddress) return;
    
    const storedSnapshot = loadStoredSnapshot();
    
    if (storedSnapshot && (storedSnapshot.principalWad || storedSnapshot.scaledBalance)) {
      // Restore from localStorage
      principalWadRef.current = storedSnapshot.principalWad ? BigInt(storedSnapshot.principalWad) : BigInt(0);
      snapshotIndexRayRef.current = storedSnapshot.snapshotIndexRay ? BigInt(storedSnapshot.snapshotIndexRay) : RAY;
      oldIndexRayRef.current = storedSnapshot.oldIndexRay ? BigInt(storedSnapshot.oldIndexRay) : RAY;
      rateRayPerSecRef.current = storedSnapshot.rateRayPerSec ? BigInt(storedSnapshot.rateRayPerSec) : BigInt(0);
      
      // Validate lastUpdateMs - if it's in the future or too old (> 1 year), reset to now
      const nowMs = Date.now();
      const storedLastUpdateMs = storedSnapshot.lastUpdateMs || nowMs;
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      if (storedLastUpdateMs > nowMs || storedLastUpdateMs < (nowMs - oneYearMs)) {
        console.warn('⚠️ Invalid lastUpdateMs from localStorage, resetting to now:', {
          stored: new Date(storedLastUpdateMs).toLocaleString(),
          now: new Date(nowMs).toLocaleString(),
          diff: (storedLastUpdateMs - nowMs) / 1000 + 's'
        });
        lastUpdateMsRef.current = nowMs;
      } else {
        lastUpdateMsRef.current = storedLastUpdateMs;
      }
      
      // Track current displayBalance to avoid stale closure
      displayBalanceRef.current = displayBalance || 0;
      
      console.log('📦 Restored borrow snapshot from localStorage:', {
        principalWad: principalWadRef.current.toString(),
        snapshotIndexRay: snapshotIndexRayRef.current.toString(),
        oldIndexRay: oldIndexRayRef.current.toString(),
        rateRayPerSec: rateRayPerSecRef.current.toString(),
        lastUpdateMs: new Date(lastUpdateMsRef.current).toLocaleString()
      });
      
      // If principal is 0, reset display to 0 and stop real-time
      if (principalWadRef.current === BigInt(0)) {
        console.log('📦 Principal is 0, setting display to 0 and stopping real-time');
        setDisplayBalance(0);
        displayBalanceRef.current = 0;
        isRealtimeRunningRef.current = false;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsLoadingSnapshot(false);
        return;
      }
      
      // Calculate current balance using Aave formula
      const currentTimeMs = Date.now();
      const deltaTimeMs = currentTimeMs - lastUpdateMsRef.current;
      let deltaSec = Math.max(0, Math.floor(deltaTimeMs / 1000));
      
      // Validate deltaSec - if negative (future timestamp), reset lastUpdateMs
      if (deltaSec < 0) {
        console.warn('⚠️ Negative deltaSec when restoring snapshot, resetting lastUpdateMs:', {
          deltaSec,
          deltaTimeMs,
          lastUpdateMs: new Date(lastUpdateMsRef.current).toLocaleString(),
          now: new Date(currentTimeMs).toLocaleString()
        });
        lastUpdateMsRef.current = currentTimeMs;
        deltaSec = 0;
      }
      
      if (deltaSec > 0 && rateRayPerSecRef.current > BigInt(0)) {
        // newIndex = oldIndex * (1 + rate * deltaTime / SECONDS_PER_YEAR)
        const increment = (oldIndexRayRef.current * rateRayPerSecRef.current * BigInt(deltaSec)) / RAY;
        const newIndex = oldIndexRayRef.current + increment;
        
        // actualBalance = scaledBalance * (newIndex / snapshotIndex)
        const actualWad = (principalWadRef.current * newIndex) / snapshotIndexRayRef.current;
        const actualBalance = Number(ethers.formatUnits(actualWad, 18));
        
        const interestEarned = actualBalance - Number(ethers.formatUnits(principalWadRef.current, 18));
        console.log('📦 Calculated from restored borrow snapshot:', {
          deltaTime: deltaSec + 's',
          oldIndex: oldIndexRayRef.current.toString(),
          newIndex: newIndex.toString(),
          actualBalance: actualBalance.toFixed(6),
          interestEarned: interestEarned.toFixed(6),
          rateRayPerSec: rateRayPerSecRef.current.toString()
        });
        
        // Only update if real-time is not running yet (check both flag and interval)
        const isRealtimeActive = isRealtimeRunningRef.current && intervalRef.current !== null;
        if (!isRealtimeActive) {
          setDisplayBalance(actualBalance);
          displayBalanceRef.current = actualBalance;
          console.log('📦 Updated displayBalance from restored snapshot (no realtime):', actualBalance);
        } else {
          console.log('⏸️ Skipping displayBalance update (realtime active):', {
            calculated: actualBalance,
            current: displayBalanceRef.current
          });
        }
        setIsLoadingSnapshot(false);
      } else {
        // No time elapsed or no rate, use current balance
        const actualWad = (principalWadRef.current * oldIndexRayRef.current) / snapshotIndexRayRef.current;
        const actualBalance = Number(ethers.formatUnits(actualWad, 18));
        // Only update if real-time is not running yet (check both flag and interval)
        const isRealtimeActive = isRealtimeRunningRef.current && intervalRef.current !== null;
        if (!isRealtimeActive) {
          setDisplayBalance(actualBalance);
          displayBalanceRef.current = actualBalance;
          console.log('📦 Updated displayBalance from restored snapshot (no rate, no realtime):', actualBalance);
        } else {
          console.log('⏸️ Skipping displayBalance update (realtime active, no rate):', {
            calculated: actualBalance,
            current: displayBalanceRef.current
          });
        }
        setIsLoadingSnapshot(false);
      }
    } else {
      // No stored data, fetch from chain
      fetchChainSnapshot();
    }
  }, [userAddress, asset?.symbol, assetAddress, loadStoredSnapshot, fetchChainSnapshot]);
  
  // Calculate real-time balance using Aave formula (updates every 1 second for borrow)
  useEffect(() => {
    // Check if we should skip realtime update
    const shouldSkip = isLoadingSnapshot || 
                      principalWadRef.current === BigInt(0) || 
                      snapshotIndexRayRef.current === BigInt(0) || 
                      asset?.symbol === 'ETH';
    
    if (shouldSkip) {
      console.log('⏸️ Skipping borrow realtime update:', {
        isLoadingSnapshot,
        principalWad: principalWadRef.current.toString(),
        snapshotIndexRay: snapshotIndexRayRef.current.toString(),
        oldIndexRay: oldIndexRayRef.current.toString(),
        rateRayPerSec: rateRayPerSecRef.current.toString(),
        symbol: asset?.symbol,
        reason: isLoadingSnapshot ? 'Loading snapshot' : 
                principalWadRef.current === BigInt(0) ? 'Principal is 0' :
                snapshotIndexRayRef.current === BigInt(0) ? 'Snapshot index is 0' :
                asset?.symbol === 'ETH' ? 'ETH not supported' : 'Unknown'
      });
      // Still set displayBalance if available (from current index, no real-time update)
      // But only if real-time is not running (check both flag and interval)
      const isRealtimeActive = isRealtimeRunningRef.current && intervalRef.current !== null;
      if (principalWadRef.current > BigInt(0) && snapshotIndexRayRef.current > BigInt(0) && !isRealtimeActive) {
        const actualWad = (principalWadRef.current * oldIndexRayRef.current) / snapshotIndexRayRef.current;
        const staticBalance = Number(ethers.formatUnits(actualWad, 18));
        setDisplayBalance(staticBalance);
        displayBalanceRef.current = staticBalance;
        console.log('📊 Set static borrow balance (no realtime):', staticBalance);
      } else if (isRealtimeActive) {
        console.log('⏸️ Skipping static balance update (realtime active)');
      }
      return;
    }
    
    // Clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Use rate from chain, fallback to APR if rate is 0
    let rateRayPerSec = rateRayPerSecRef.current;
    const rateFromChain = rateRayPerSec;
    
    console.log('🔍 Checking rate before borrow realtime update:', {
      rateFromChain: rateFromChain.toString(),
      borrowAPR,
      principal: principalWadRef.current.toString(),
      snapshotIndex: snapshotIndexRayRef.current.toString(),
      borrowIndex: oldIndexRayRef.current.toString()
    });
    
    if (rateRayPerSec === BigInt(0) && borrowAPR > 0) {
      // Convert APR (annual percentage rate) to rate per second
      // APR is yearly rate, so we divide by SECONDS_PER_YEAR to get per-second rate
      // Formula: ratePerSecond = (APR / 100) / SECONDS_PER_YEAR
      // Then convert to RAY (1e27) for BigInt precision
      const aprDecimal = borrowAPR / 100; // Convert percentage to decimal (e.g., 5% -> 0.05)
      const ratePerSecond = aprDecimal / SECONDS_PER_YEAR; // Divide by seconds in year to get per-second rate
      rateRayPerSec = BigInt(Math.floor(ratePerSecond * 1e27)); // Convert to RAY (1e27) for BigInt
      
      console.log('📊 Using APR fallback for borrow rate:', {
        borrowAPR: borrowAPR + '%',
        aprDecimal,
        SECONDS_PER_YEAR,
        ratePerSecond,
        rateRayPerSec: rateRayPerSec.toString(),
        rateRayPerSecNum: Number(rateRayPerSec),
        verification: `Expected APR from rate: ${(ratePerSecond * SECONDS_PER_YEAR * 100).toFixed(4)}%`
      });
    }
    
    if (rateRayPerSec === BigInt(0)) {
      console.warn('⏸️ No rate available, skipping borrow realtime update', {
        rateFromChain: rateFromChain.toString(),
        borrowAPR,
        snapshotIndex: snapshotIndexRayRef.current.toString(),
        borrowIndex: oldIndexRayRef.current.toString(),
        principal: principalWadRef.current.toString()
      });
      // Still calculate balance from current index even if rate is 0
      const actualWad = (principalWadRef.current * oldIndexRayRef.current) / snapshotIndexRayRef.current;
      const currentBalance = Number(ethers.formatUnits(actualWad, 18));
      const principalNum = Number(ethers.formatUnits(principalWadRef.current, 18));
      console.log('📊 Current borrow balance (no rate):', {
        currentBalance,
        principal: principalNum,
        interest: currentBalance - principalNum
      });
      // Only update if real-time is not running (check both flag and interval)
      const isRealtimeActive = isRealtimeRunningRef.current && intervalRef.current !== null;
      if (!isRealtimeActive) {
        setDisplayBalance(currentBalance);
        displayBalanceRef.current = currentBalance;
        console.log('📊 Updated displayBalance (no rate, no realtime):', currentBalance);
      } else {
        console.log('⏸️ Skipping displayBalance update (realtime active, no rate):', {
          calculated: currentBalance,
          current: displayBalanceRef.current
        });
      }
      return;
    }
    
    console.log('💰 Starting borrow realtime updates (BigInt):', {
      principal: Number(ethers.formatUnits(principalWadRef.current, 18)),
      snapshotIndexRay: snapshotIndexRayRef.current.toString(),
      oldIndexRay: oldIndexRayRef.current.toString(),
      rateRayPerSec: rateRayPerSec.toString(),
      lastUpdateMs: new Date(lastUpdateMsRef.current).toLocaleString()
    });
    
    // Mark real-time as running
    isRealtimeRunningRef.current = true;
    
    const updateBalance = () => {
      const nowMs = Date.now();
      const deltaMs = nowMs - lastUpdateMsRef.current;
      let deltaSec = Math.floor(deltaMs / 1000);
      
      // Handle edge cases:
      // 1. If deltaSec is negative (lastUpdateMs in future), reset
      // 2. If deltaSec is 0 but deltaMs is close to 1000ms (> 500ms), use 1 second
      // 3. If deltaSec is 0 and deltaMs is small (< 500ms), skip this update
      if (deltaSec < 0) {
        console.warn('⚠️ Negative deltaSec in updateBalance, resetting lastUpdateMs:', {
          deltaSec,
          deltaMs,
          lastUpdateMs: new Date(lastUpdateMsRef.current).toLocaleString(),
          now: new Date(nowMs).toLocaleString()
        });
        // Reset lastUpdateMs to now and use 1 second as delta for initial calculation
        lastUpdateMsRef.current = nowMs - 1000; // Set to 1 second ago to allow calculation
        deltaSec = 1;
      } else if (deltaSec === 0 && deltaMs < 500) {
        // Too soon, skip this update (setInterval may fire early)
        return;
      } else if (deltaSec === 0 && deltaMs >= 500) {
        // Close enough to 1 second, use 1 second
        deltaSec = 1;
      }
      
      // Store old values for logging
      const oldIndexBeforeUpdate = oldIndexRayRef.current;
      
      // newIndexRay = oldIndexRay + oldIndexRay * rateRayPerSec * deltaSec / RAY
      const incr = (oldIndexRayRef.current * rateRayPerSec * BigInt(deltaSec)) / RAY;
      const newIndexRay = oldIndexRayRef.current + incr;
      const actualWad = (principalWadRef.current * newIndexRay) / snapshotIndexRayRef.current;
      const newBalance = Number(ethers.formatUnits(actualWad, 18));
      const principalNum = Number(ethers.formatUnits(principalWadRef.current, 18));
      const interest = newBalance - principalNum;
      
      // Update refs for next calculation
      oldIndexRayRef.current = newIndexRay;
      lastUpdateMsRef.current = nowMs;
      
      // Log every 10 seconds or first update to avoid spam
      if (deltaSec % 10 === 0 || deltaSec === 1 || deltaSec < 10) {
        // Calculate expected APR from rate for verification
        // rateRayPerSec is rate per second in RAY
        // To get APR: multiply by SECONDS_PER_YEAR and convert to percentage
        const ratePerSecondNum = Number(rateRayPerSec) / Number(RAY); // Convert RAY to decimal
        const expectedAPR = ratePerSecondNum * SECONDS_PER_YEAR * 100; // Multiply by seconds per year and convert to %
        
        console.log('💰 Borrow realtime update:', {
          deltaSec,
          deltaMs,
          oldIndex: oldIndexBeforeUpdate.toString(),
          newIndex: newIndexRay.toString(),
          increment: incr.toString(),
          balance: newBalance.toFixed(8),
          principal: principalNum.toFixed(8),
          interest: interest.toFixed(8),
          rate: rateRayPerSec.toString(),
          ratePerSecond: ratePerSecondNum.toFixed(12),
          expectedAPR: expectedAPR.toFixed(4) + '%'
        });
      }
      
      setDisplayBalance(newBalance);
      displayBalanceRef.current = newBalance; // Update ref
    };
    
    // Initial update
    updateBalance();
    
    // Update every 1 second as requested
    intervalRef.current = setInterval(updateBalance, 1000);
    
    // Save on unmount/reload
    const handleBeforeUnload = () => {
      const nowMs = Date.now();
      const deltaMs = nowMs - lastUpdateMsRef.current;
      
      if (deltaMs > 0) {
        const incr = (oldIndexRayRef.current * rateRayPerSec * BigInt(deltaMs)) / (RAY * BigInt(1000));
        const newIndexRay = oldIndexRayRef.current + incr;
        saveSnapshot(principalWadRef.current, snapshotIndexRayRef.current, newIndexRay, rateRayPerSec, nowMs);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Save periodically (every 30 seconds)
    const saveInterval = setInterval(() => {
      const nowMs = Date.now();
      const deltaMs = nowMs - lastUpdateMsRef.current;
      if (deltaMs > 0) {
        const incr = (oldIndexRayRef.current * rateRayPerSec * BigInt(deltaMs)) / (RAY * BigInt(1000));
        const newIndexRay = oldIndexRayRef.current + incr;
        saveSnapshot(principalWadRef.current, snapshotIndexRayRef.current, newIndexRay, rateRayPerSec, nowMs);
        oldIndexRayRef.current = newIndexRay;
        lastUpdateMsRef.current = nowMs;
      }
    }, 30000);
    
    return () => {
      // IMPORTANT: Don't reset isRealtimeRunningRef here!
      // This causes race conditions where fetchChainSnapshot can reset balance
      // Only clear intervals, the flag will be checked via intervalRef.current !== null
      console.log('🧹 Cleaning up borrow realtime interval (keeping flag):', {
        isRealtimeRunning: isRealtimeRunningRef.current,
        hasInterval: intervalRef.current !== null
      });
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      clearInterval(saveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload(); // Save final state
      // Only reset flag if principal is actually 0
      if (principalWadRef.current === BigInt(0)) {
        isRealtimeRunningRef.current = false;
        console.log('🔄 Reset isRealtimeRunningRef (principal is 0)');
      }
    };
  }, [isLoadingSnapshot, asset?.symbol, saveSnapshot, borrowAPR]);
  
  // Track previous principal to detect actual changes (not just refresh)
  const previousPrincipalRef = useRef<number>(-1);
  
  // Check for new transactions and update snapshot
  // ONLY reset if principal actually changed (new borrow/repay), not on every refresh
  useEffect(() => {
    if (!borrowAsset || isLoadingSnapshot) return;
    
    const currentPrincipal = parseFloat(borrowAsset.borrowPrincipal || '0');
    const currentChainBalance = parseFloat(borrowAsset.borrowBalance || borrowAsset.borrowPrincipal || '0');
    const principalDisplay = Number(ethers.formatUnits(principalWadRef.current, 18));
    
    // Only check if principal actually changed (not just refresh with same value)
    const principalChanged = Math.abs(currentPrincipal - previousPrincipalRef.current) > 0.001;
    
    // If principal is 0 or very close to 0 AND it actually changed (not just refresh), reset display
    if (currentPrincipal < 0.001 && displayBalance > 0.001 && principalChanged) {
      console.log('🔄 Borrow principal is near 0 AND changed, resetting display:', {
        currentPrincipal,
        previousPrincipal: previousPrincipalRef.current,
        displayBalance,
        principalDisplay,
        principalChanged
      });
      principalWadRef.current = BigInt(0);
      snapshotIndexRayRef.current = RAY;
      oldIndexRayRef.current = RAY;
      rateRayPerSecRef.current = BigInt(0);
      lastUpdateMsRef.current = Date.now();
      setDisplayBalance(0);
      displayBalanceRef.current = 0;
      isRealtimeRunningRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      previousPrincipalRef.current = currentPrincipal;
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
      }
      return;
    }
    
    // Update previous principal for next comparison
    if (principalChanged) {
      previousPrincipalRef.current = currentPrincipal;
    }
    
    // If principal changed significantly, fetch new snapshot from chain
    const diff = Math.abs(currentPrincipal - principalDisplay);
    if (diff > Math.max(currentPrincipal * 0.02, 0.01)) {
      console.log('🔄 New borrow transaction detected, fetching chain snapshot and updating localStorage:', {
        old: principalDisplay,
        new: currentPrincipal,
        diff,
        principalChanged
      });
      // Fetch new snapshot from chain (this will also save to localStorage via saveSnapshot)
      fetchChainSnapshot().then((result) => {
        if (result && result.actualBalance !== undefined) {
          console.log('✅ Successfully updated localStorage after new borrow transaction:', {
            newBalance: result.actualBalance,
            newPrincipal: currentPrincipal
          });
        }
      }).catch((error) => {
        console.error('❌ Failed to update localStorage after new borrow transaction:', error);
      });
    }
  }, [borrowAsset?.borrowPrincipal, borrowAsset?.borrowBalance, isLoadingSnapshot, fetchChainSnapshot, displayBalance, storageKey]);
  
  // Auto-refresh from chain every 30 seconds
  useEffect(() => {
    if (!isConnected || !provider || asset?.symbol === 'ETH') return;
    
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing borrow chain snapshot...');
      fetchChainSnapshot();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [isConnected, provider, asset?.symbol, fetchChainSnapshot]);

  // Fetch reserve details (LTV, liquidation threshold, etc.)
  const [reserveData, setReserveData] = useState<any>(null);
  useEffect(() => {
    const fetchReserveData = async () => {
      if (!provider || !asset?.address || asset.address === '0x0000000000000000000000000000000000000000') return;
      
      try {
        const abi = [
          'function reserves(address asset) view returns (tuple(uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate))'
        ];
        const pool = getReadOnlyContract(CONFIG.LENDING_POOL, abi, provider);
        const reserve = await pool.reserves(asset.address);
        
        // CRITICAL: The lending pool contract stores reserveCash with 18 decimals (WAD format)
        // This is a standard practice in DeFi protocols - all amounts are normalized to 18 decimals
        // regardless of the actual token decimals (e.g., USDC has 6 decimals, but reserveCash is stored with 18)
        // Therefore, we MUST format reserveCash with 18 decimals, NOT with reserve.decimals
        
        const reserveCashRaw = reserve.reserveCash;
        
        // Handle BigInt: ethers.formatUnits can handle BigInt directly
        let reserveCashBigInt: bigint;
        if (typeof reserveCashRaw === 'bigint') {
          reserveCashBigInt = reserveCashRaw;
        } else if (typeof reserveCashRaw === 'string') {
          reserveCashBigInt = BigInt(reserveCashRaw);
        } else {
          reserveCashBigInt = BigInt(reserveCashRaw.toString());
        }
        
        // Format with 18 decimals (WAD format) - this is how the contract stores it
        const RESERVE_CASH_DECIMALS = 18; // Contract stores reserveCash with 18 decimals
        const reserveCashFormatted = ethers.formatUnits(reserveCashBigInt, RESERVE_CASH_DECIMALS);
        const reserveCash = parseFloat(reserveCashFormatted);
        
        // totalDebtPrincipal is also stored with 18 decimals (WAD format) in the contract
        const totalDebtRaw = reserve.totalDebtPrincipal;
        const totalDebtFormatted = ethers.formatUnits(totalDebtRaw.toString(), RESERVE_CASH_DECIMALS);
        const totalDebt = parseFloat(totalDebtFormatted);
        
        const totalSupply = reserveCash + totalDebt;
        const utilization = totalSupply > 0 ? (totalDebt / totalSupply) * 100 : 0;
        
        console.log('📊 Reserve data fetched (borrow page):', {
          reserveCashRaw: reserveCashRaw.toString(),
          reserveCashFormatted,
          reserveCash,
          totalDebtRaw: totalDebtRaw.toString(),
          totalDebtFormatted,
          totalDebt,
          totalSupply,
          utilization,
          assetSymbol: asset?.symbol,
          note: 'Contract stores reserveCash with 18 decimals (WAD format), not reserve.decimals'
        });
        
        setReserveData({
          ltvBps: Number(reserve.ltvBps),
          liqThresholdBps: Number(reserve.liqThresholdBps),
          liqBonusBps: Number(reserve.liqBonusBps),
          reserveCash, // Formatted value with 18 decimals (WAD format)
          reserveCashRaw: reserveCashRaw.toString(), // Raw BigInt value
          decimalsUsed: RESERVE_CASH_DECIMALS, // Always 18 (WAD format)
          totalDebt,
          utilization,
          isBorrowable: reserve.isBorrowable
        });
      } catch (error) {
        console.error('Error fetching reserve data:', error);
      }
    };
    
    fetchReserveData();
  }, [provider, asset?.address]);

  // Get icon path
  const getIconPath = (symbol: string): string => {
    const symbolLower = symbol.toLowerCase();
    const iconMap: { [key: string]: string } = {
      'eth': '/image/eth.svg',
      'weth': '/image/weeth.svg',
      'dai': '/image/dai.svg',
      'usdc': '/image/usdc.svg',
      'link': '/image/link.svg',
    };
    return iconMap[symbolLower] || '/image/eth.svg';
  };

  // Load data when connected and auto-refresh every 30 seconds
  useEffect(() => {
    if (!isConnected || !provider) return;
    
    // Initial load
    refresh();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing balance with interest...');
      refresh();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [isConnected, provider, refresh]);

  const handleRepayInline = async () => {
    if (!signer || !provider || !asset) return;
    const userBorrowNum = borrowedBalance || 0;
    const walletBalNum = parseFloat(asset.balance || '0') || 0;
    const capByWallet = Math.min(userBorrowNum, walletBalNum);
    let amountNum = parseFloat(repayAmount || '0');
    // If user didn't input amount, default to MAX repayable (min of debt and wallet balance)
    if (!repayAmount || amountNum <= 0) {
      amountNum = capByWallet;
    }
    const epsilon = 0.000001; // Allow small floating point difference
    if (amountNum <= 0 || amountNum > capByWallet + epsilon) {
      showToast({
        type: 'error',
        title: 'Invalid amount',
        message: `Amount must be > 0 and ≤ ${capByWallet.toFixed(6)} ${asset.symbol}`
      });
      return;
    }
    try {
      const amountStr = amountNum < 0.01 ? Math.max(0, amountNum - 0.0000001).toString() : amountNum.toString();
      const amountBN = parseTokenAmount(amountStr, asset.decimals || 18);
      const tx = await repay(signer, asset.address, amountBN);
      showToast({ type: 'success', title: 'Repay submitted', message: `Tx: ${tx.hash.slice(0, 10)}...` });
      setRepayAmount('');
      refresh();
      
      // Wait for transaction to be confirmed, then fetch new snapshot and update localStorage
      // Try multiple times with increasing delays to ensure transaction is confirmed
      const updateAfterRepay = async (attempt: number = 1) => {
        const delay = attempt * 2000; // 2s, 4s, 6s...
        setTimeout(async () => {
          try {
            console.log(`🔄 Fetching chain snapshot after repay (attempt ${attempt})...`);
            const result = await fetchChainSnapshot();
            if (result && result.actualBalance !== undefined) {
              console.log('✅ Successfully updated localStorage after repay transaction:', {
                newBalance: result.actualBalance,
                attempt
              });
            } else if (attempt < 3) {
              // Retry up to 3 times if not successful
              updateAfterRepay(attempt + 1);
            }
          } catch (error) {
            console.error(`❌ Failed to update localStorage after repay (attempt ${attempt}):`, error);
            if (attempt < 3) {
              updateAfterRepay(attempt + 1);
            }
          }
        }, delay);
      };
      
      // Start first attempt after 2 seconds
      updateAfterRepay(1);
    } catch (e: any) {
      const raw = (e?.message || '').toString();
      const isUserRejected = raw === 'USER_CANCELLED' || /denied|user denied|ACTION_REJECTED|4001/i.test(raw);
      if (isUserRejected) {
        showToast({
          type: 'info',
          title: 'Transaction cancelled',
          message: 'You rejected the signature in MetaMask'
        });
        return;
      }
      showToast({ type: 'error', title: 'Repay failed', message: raw || 'Transaction failed' });
    }
  };

  const handleMaxClick = () => {
    const userBorrowNum = borrowedBalance || 0;
    const walletBalNum = parseFloat(asset.balance || '0') || 0;
    const maxCap = Math.min(userBorrowNum, walletBalNum);
    const finalAmount = maxCap < 0.01 ? Math.max(0, maxCap - 0.0000001) : maxCap;
    setRepayAmount(finalAmount.toFixed(18));
  };

  if (!asset) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Asset not found</h2>
            <p className="text-muted-foreground mb-4">The asset you are looking for does not exist.</p>
            <Button onClick={() => router.push('/borrow')}>Back to Borrow</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Get principal from borrow asset (scaledBalance = principal)
  const borrowedPrincipal = principalWadRef.current > BigInt(0)
    ? Number(ethers.formatUnits(principalWadRef.current, 18))
    : (borrowAsset ? parseFloat(borrowAsset.borrowPrincipal || '0') : 0);
  
  // Use displayBalance from realtime calculation
  // Priority: displayBalance (from realtime) > borrowAsset.borrowBalance (from chain) > borrowedPrincipal
  // If displayBalance is 0 but we have principal, it means realtime hasn't started yet, use chain balance
  const borrowedBalance = displayBalance > 0 
    ? displayBalance 
    : (borrowAsset ? parseFloat(borrowAsset.borrowBalance || borrowAsset.borrowPrincipal || '0') : borrowedPrincipal || 0);
  
  // Calculate interest accrued (real-time updates every 50ms) - for borrow, interest increases debt
  const interestAccrued = Math.max(0, borrowedBalance - borrowedPrincipal);

  const borrowedBalanceUSD = borrowedBalance * parseFloat(String(asset.priceUSD || '0'));
  const interestAccruedUSD = interestAccrued * parseFloat(String(asset.priceUSD || '0'));

  // Get wallet balance for this token
  const walletBalance = parseFloat(asset.balance || '0');
  const walletBalanceUSD = walletBalance * parseFloat(String(asset.priceUSD || '0'));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/borrow')}>
              ← Back to Borrow
            </Button>
            <div className="flex items-center gap-3">
              <Image 
                src={getIconPath(asset.symbol)} 
                alt={asset.symbol} 
                width={40} 
                height={40}
                className="rounded-full"
              />
              <div>
                <h1 className="text-3xl font-bold text-foreground">{asset.symbol}</h1>
                <p className="text-muted-foreground">{asset.name || asset.symbol}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Your Balances */}
            <Card>
              <CardHeader>
                <CardTitle>Your Balances</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your debt in pool:</span>
                  <span className="font-medium font-mono text-sm">
                   {isNaN(borrowedBalance) ? '0.000000000000000000' : borrowedBalance.toFixed(18)} {asset.symbol}
                    <span className="text-xs text-muted-foreground ml-2">
                      ({isNaN(borrowedBalanceUSD) ? '$0.00' : `$${borrowedBalanceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`})
                  </span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interest accrued:</span>
                  <span className="font-medium text-red-600 font-mono text-sm">
                    {isNaN(interestAccrued) ? '0.000000000000000000' : interestAccrued.toFixed(18)} {asset.symbol}
                    <span className="text-xs text-red-600/70 ml-2">
                      ({isNaN(interestAccruedUSD) ? '$0.00' : `$${interestAccruedUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`})
                  </span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your wallet balance:</span>
                  <span className="font-medium">
                    {formatNumber(walletBalance, 4)} {asset.symbol}
                    <span className="text-xs text-muted-foreground ml-2">
                      ({formatCurrency(walletBalanceUSD)})
                    </span>
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Reserve Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Reserve Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Liquidity</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency((reserveData?.reserveCash || 0) * parseFloat(asset.priceUSD || '1'))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Utilization Rate</div>
                    <div className="text-lg font-semibold">{formatPercentage(aprData?.utilization || 0)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Borrow APR</div>
                    <div className="text-lg font-semibold text-red-600">
                      {aprData?.isLoading ? 'Loading...' : formatPercentage(borrowAPR)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Asset Price</div>
                    <div className="text-lg font-semibold">${formatNumber(parseFloat(asset.priceUSD || '0'), 2)}</div>
                  </div>
                </div>
                {reserveData && (
                  <>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <div className="text-sm text-muted-foreground">LTV</div>
                        <div className="text-sm font-medium">{formatPercentage(reserveData.ltvBps / 100)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Liquidation Threshold</div>
                        <div className="text-sm font-medium">{formatPercentage(reserveData.liqThresholdBps / 100)}</div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column: Repay Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Repay Overview</CardTitle>
                <CardDescription>
                  Repay your borrowed amount
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="repay-amount">Amount to repay</Label>
                  <div className="flex gap-2">
                    <Input
                      id="repay-amount"
                      type="number"
                      placeholder="0.00"
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                      className="flex-1"
                    />
                    <Button size="sm" variant="outline" onClick={handleMaxClick}>MAX</Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {repayAmount && !isNaN(parseFloat(repayAmount)) ? (
                      <>≈ {formatCurrency(parseFloat(repayAmount) * parseFloat(String(asset.priceUSD || '0')))}</>
                    ) : (
                      <>≈ $0.00</>
                    )}
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining debt</span>
                    <span className="font-medium">
                      {repayAmount && !isNaN(parseFloat(repayAmount)) 
                        ? formatNumber(Math.max(0, borrowedBalance - parseFloat(repayAmount)), 6)
                        : formatNumber(borrowedBalance, 6)} {asset.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining debt (USD)</span>
                    <span className="font-medium">
                      {repayAmount && !isNaN(parseFloat(repayAmount))
                        ? formatCurrency(Math.max(0, borrowedBalance - parseFloat(repayAmount)) * parseFloat(String(asset.priceUSD || '0')))
                        : formatCurrency(borrowedBalanceUSD)}
                    </span>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleRepayInline}
                  disabled={!isConnected || borrowedBalance <= 0 || parseFloat(asset.balance || '0') <= 0}
                >
                  Repay
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

