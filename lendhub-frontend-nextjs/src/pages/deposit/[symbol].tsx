import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { AppLayout } from '@/components/layout/AppLayout';
import useLendContext from '@/context/useLendContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { WrapEthModal } from '@/components/WrapEthModal';
import { withdraw, parseTokenAmount, dryRunWithdrawAmount } from '@/lib/tx';
import { CONFIG } from '@/config/contracts';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatPercentage, formatNumber } from '@/lib/math';
import { useSharedAPR } from '@/hooks/useSharedAPR';
import { ethers } from 'ethers';
import Image from 'next/image';

export default function DepositDetailPage() {
  const router = useRouter();
  const { symbol } = router.query;
  const { userAssets, supplyAssets, metamaskDetails, accountData, refresh } = useLendContext();
  const [wrapEthModalOpen, setWrapEthModalOpen] = useState(false);
  // No popup: withdraw inline
  const [depositAmount, setDepositAmount] = useState('');
  const { showToast } = useToast();

  const isConnected = !!metamaskDetails.currentAccount;
  const provider = metamaskDetails.provider;
  const signer = metamaskDetails.signer;

  // Find asset by symbol
  const asset = userAssets.find((a: any) => a.symbol === symbol) || 
                (CONFIG.TOKENS || []).find((t: any) => t.symbol === symbol);
  
  const supplyAsset = supplyAssets.find((s: any) => 
    s.address?.toLowerCase() === asset?.address?.toLowerCase()
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
  const supplyAPR = aprData?.supplyAPR || 0;
  const supplyAPY = calculateAPY(supplyAPR);

  // Real-time interest calculation using Aave formula
  const userAddress = metamaskDetails.currentAccount;
  const storageKey = `deposit_realtime_${userAddress}_${asset?.symbol}_${asset?.address}`;
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
  
  // Helper function to check if real-time is actually running
  // Check both the flag AND if interval exists
  const isRealtimeActuallyRunning = useCallback(() => {
    return isRealtimeRunningRef.current && intervalRef.current !== null;
  }, []);
  
  // Sync displayBalance with supplyAsset ONLY on initial load (once)
  // This ensures we have a starting balance even if realtime hasn't started yet
  // BUT: Don't override if real-time is already running or already synced
  useEffect(() => {
    // Only sync once on initial load, not every time supplyAsset changes
    if (hasInitialSyncedRef.current) return;
    
    if (supplyAsset && principalWadRef.current === BigInt(0) && !isLoadingSnapshot && !isRealtimeRunningRef.current) {
      const chainBalance = parseFloat(supplyAsset.supplyBalance || supplyAsset.supplyPrincipal || '0');
      if (chainBalance > 0 && displayBalance === 0) {
        console.log('🔄 Syncing displayBalance with supplyAsset (initial load - ONCE):', {
          chainBalance,
          supplyBalance: supplyAsset.supplyBalance,
          supplyPrincipal: supplyAsset.supplyPrincipal
        });
        setDisplayBalance(chainBalance);
        displayBalanceRef.current = chainBalance;
        hasInitialSyncedRef.current = true; // Mark as synced
      }
    }
  }, [supplyAsset, isLoadingSnapshot]); // Removed displayBalance from dependencies
  
  // Refs for Aave formula calculation (BigInt precision)
  const principalWadRef = useRef<bigint>(BigInt(0)); // principal in WAD (1e18) - current principal from chain
  const originalPrincipalWadRef = useRef<bigint>(BigInt(0)); // original principal when first deposited (for interest calculation)
  const snapshotIndexRayRef = useRef<bigint>(RAY); // index when user deposited (RAY)
  const oldIndexRayRef = useRef<bigint>(RAY); // liquidityIndex (RAY) at last update
  const rateRayPerSecRef = useRef<bigint>(BigInt(0)); // per-second rate in RAY
  const lastUpdateMsRef = useRef<number>(Date.now()); // milliseconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load snapshot from localStorage
  const loadStoredSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || !userAddress || !asset?.symbol) return null;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        console.log('📱 Loaded snapshot from localStorage:', data);
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
        originalPrincipalWad: originalPrincipalWadRef.current.toString(), // Save original principal
        snapshotIndexRay: snapshotIndexRay.toString(),
        oldIndexRay: oldIndexRay.toString(),
        rateRayPerSec: rateRayPerSec.toString(),
        lastUpdateMs,
        fetchedAt: Math.floor(Date.now() / 1000),
        timestamp: Date.now()
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
      console.log('💾 Saved snapshot:', {
        ...data,
        originalPrincipalNum: Number(ethers.formatUnits(originalPrincipalWadRef.current, 18)).toFixed(8) + ' DAI'
      });
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
      
      const pool = new ethers.Contract(CONFIG.LENDING_POOL, abi, provider);
      
      const [userReserve, reserve] = await Promise.all([
        pool.userReserves(userAddress, assetAddress),
        pool.reserves(assetAddress)
      ]);
      
      const principalWad = userReserve.supply.principal as bigint;
      // Check if balance is effectively 0 (accounting for rounding errors)
      const principalNumCheck = Number(ethers.formatUnits(principalWad, 18));
      const MIN_BALANCE_THRESHOLD = 0.000001; // Consider balance < 0.000001 (1e-6) as effectively 0
      
      if (principalWad === BigInt(0) || principalNumCheck < MIN_BALANCE_THRESHOLD) {
        // Balance is 0 or effectively 0, reset all refs and display
        console.log('📊 Balance is 0 or effectively 0, resetting display and stopping realtime:', {
          principalWad: principalWad.toString(),
          principalNum: principalNumCheck.toFixed(18),
          threshold: MIN_BALANCE_THRESHOLD
        });
        principalWadRef.current = BigInt(0);
        originalPrincipalWadRef.current = BigInt(0);
        snapshotIndexRayRef.current = RAY;
        oldIndexRayRef.current = RAY;
        rateRayPerSecRef.current = BigInt(0);
        lastUpdateMsRef.current = Date.now();
        setDisplayBalance(0);
        displayBalanceRef.current = 0;
        // Stop realtime interval if running
        isRealtimeRunningRef.current = false;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          console.log('🛑 Stopped realtime interval (balance is 0)');
        }
        setIsLoadingSnapshot(false);
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem(storageKey);
          console.log('🗑️ Cleared localStorage (balance is 0)');
        }
        return null;
      }
      
      // Get data from chain (raw BigInt for precision)
      const snapshotIndexRay = userReserve.supply.index as bigint; // snapshot index (RAY)
      const liquidityIndexRay = reserve.liquidityIndex as bigint; // current liquidity index (RAY)
      const liquidityRateRayPerSec = reserve.liquidityRateRayPerSec as bigint; // RAY per second
      const lastUpdate = Number(reserve.lastUpdate); // seconds
      
      // Validate snapshotIndex - if it's 0 or invalid, use RAY as default
      // BUT: if snapshotIndex = liquidityIndex = RAY, that's valid (new deposit)
      const validSnapshotIndex = snapshotIndexRay > BigInt(0) ? snapshotIndexRay : RAY;
      
      // Calculate expected APR from rate for verification
      // liquidityRateRayPerSec is already rate per second in RAY
      // To get APR: multiply by SECONDS_PER_YEAR and convert to percentage
      const ratePerSecondNum = Number(liquidityRateRayPerSec) / Number(RAY); // Convert RAY to decimal
      const expectedAPRFromRate = ratePerSecondNum * SECONDS_PER_YEAR * 100; // Multiply by seconds per year and convert to %
      
      console.log('📊 Fetched chain snapshot:', {
        principalWad: principalWad.toString(),
        snapshotIndexRay: snapshotIndexRay.toString(),
        validSnapshotIndex: validSnapshotIndex.toString(),
        liquidityIndexRay: liquidityIndexRay.toString(),
        liquidityRateRayPerSec: liquidityRateRayPerSec.toString(),
        ratePerSecond: ratePerSecondNum.toFixed(12),
        expectedAPRFromRate: expectedAPRFromRate.toFixed(4) + '%',
        lastUpdate: new Date(lastUpdate * 1000).toLocaleString(),
        indicesEqual: snapshotIndexRay === liquidityIndexRay,
        isNewDeposit: snapshotIndexRay === liquidityIndexRay && snapshotIndexRay === RAY
      });
      
      // IMPORTANT: Check if real-time is running before updating refs
      // If real-time is running, we should NOT update oldIndexRayRef or lastUpdateMsRef as it will reset progress
      const isRealtimeCurrentlyActive = isRealtimeRunningRef.current && intervalRef.current !== null;
      
      // Save to localStorage (always save latest data)
      saveSnapshot(principalWad, validSnapshotIndex, liquidityIndexRay, liquidityRateRayPerSec, lastUpdate * 1000);
      
      // Always update principal and snapshotIndex (these don't affect real-time calculation)
      principalWadRef.current = principalWad;
      snapshotIndexRayRef.current = validSnapshotIndex;
      rateRayPerSecRef.current = liquidityRateRayPerSec; // Update rate for future calculations
      
      // Calculate current balance first
      const actualWadTemp = (principalWad * liquidityIndexRay) / validSnapshotIndex;
      const actualBalanceTemp = Number(ethers.formatUnits(actualWadTemp, 18));
      const principalNumTemp = Number(ethers.formatUnits(principalWad, 18));
      
      // CRITICAL: Set originalPrincipalWadRef for interest calculation
      // IMPORTANT: Use the ORIGINAL DEPOSIT AMOUNT (from supplyAsset.supplyPrincipal if available)
      // This is the amount user actually deposited (e.g., 2000), not the amount after fee (e.g., 1999.996)
      // Interest will be calculated as: currentBalance - originalDepositAmount
      const currentOriginal = originalPrincipalWadRef.current;
      const currentOriginalNum = currentOriginal > BigInt(0) ? Number(ethers.formatUnits(currentOriginal, 18)) : 0;
      
      // Try to get original deposit amount from supplyAsset (from context)
      // This is the amount user actually deposited, before any fees
      let originalDepositAmount = principalWad; // Default to principalWad from chain
      let originalDepositSource = 'chain (principalWad)';
      
      // Check if we have supplyAsset with supplyPrincipal (from context)
      // This should be the original deposit amount (e.g., 2000)
      if (supplyAsset?.supplyPrincipal) {
        const supplyPrincipalNum = parseFloat(supplyAsset.supplyPrincipal);
        const supplyPrincipalWad = ethers.parseUnits(supplyPrincipalNum.toFixed(18), 18);
        
        // Use supplyPrincipal if it's larger than principalWad (it's the original deposit before fee)
        // Or if principalWad is very close to supplyPrincipal (within 1%), use supplyPrincipal
        const diff = Math.abs(supplyPrincipalNum - principalNumTemp);
        const percentDiff = (diff / Math.max(supplyPrincipalNum, principalNumTemp)) * 100;
        
        if (supplyPrincipalNum >= principalNumTemp || percentDiff < 1) {
          originalDepositAmount = supplyPrincipalWad;
          originalDepositSource = 'context (supplyAsset.supplyPrincipal)';
          console.log('📊 Using supplyAsset.supplyPrincipal as original deposit amount:', {
            supplyPrincipal: supplyPrincipalNum.toFixed(8) + ' DAI',
            principalWad: principalNumTemp.toFixed(8) + ' DAI',
            diff: diff.toFixed(8) + ' DAI',
            percentDiff: percentDiff.toFixed(2) + '%',
            note: 'Using original deposit amount from context (before fee)'
          });
        }
      }
      
      // Update originalPrincipalWadRef if:
      // 1. It's 0 (first time), OR
      // 2. Principal increased significantly (new deposit detected)
      if (currentOriginal === BigInt(0) && principalWad > BigInt(0)) {
        // First time - use original deposit amount as original principal
        originalPrincipalWadRef.current = originalDepositAmount;
        const originalPrincipalNum = Number(ethers.formatUnits(originalDepositAmount, 18));
        console.log('✅ Set originalPrincipalWadRef (first time):', {
          originalPrincipal: originalPrincipalNum.toFixed(8) + ' DAI',
          source: originalDepositSource,
          principalWad: principalNumTemp.toFixed(8) + ' DAI',
          actualBalance: actualBalanceTemp.toFixed(8) + ' DAI',
          snapshotIndex: validSnapshotIndex.toString(),
          liquidityIndex: liquidityIndexRay.toString(),
          indicesEqual: validSnapshotIndex === liquidityIndexRay,
          interestAtFetch: (actualBalanceTemp - originalPrincipalNum).toFixed(8) + ' DAI',
          isRealtimeActive: isRealtimeCurrentlyActive,
          note: 'Using original deposit amount as base - interest will be calculated from this amount'
        });
      } else if (currentOriginal > BigInt(0)) {
        // Check if principal increased significantly (new deposit)
        const principalDiff = principalWad > currentOriginal ? principalWad - currentOriginal : currentOriginal - principalWad;
        const significantIncrease = principalDiff > (currentOriginal / BigInt(100)); // 1% increase threshold
        
        if (significantIncrease && principalWad > currentOriginal) {
          // New deposit detected - update original principal
          originalPrincipalWadRef.current = principalWad;
          const principalNum = Number(ethers.formatUnits(principalWad, 18));
          const originalNum = Number(ethers.formatUnits(currentOriginal, 18));
          console.log('✅ Updated originalPrincipalWadRef (new deposit):', {
            old: originalNum.toFixed(8) + ' DAI',
            new: principalNum.toFixed(8) + ' DAI',
            increase: Number(ethers.formatUnits(principalDiff, 18)).toFixed(8) + ' DAI'
          });
        } else {
          // No significant change - keep original principal for interest calculation
          const principalNum = Number(ethers.formatUnits(principalWad, 18));
          const originalNum = Number(ethers.formatUnits(currentOriginal, 18));
          console.log('⏸️ Keeping originalPrincipalWadRef:', {
            original: originalNum.toFixed(8) + ' DAI',
            currentChain: principalNum.toFixed(8) + ' DAI',
            note: 'Principal unchanged, keeping original for interest calculation'
          });
        }
      }
      
      // CRITICAL: Only update oldIndexRayRef and lastUpdateMsRef if real-time is NOT running
      // If real-time is running, these refs are being actively used and updating them will reset progress
      if (!isRealtimeCurrentlyActive) {
        // Real-time not running, safe to update all refs
        oldIndexRayRef.current = liquidityIndexRay;
        
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
          chainOldIndex: liquidityIndexRay.toString(),
          currentOldIndex: oldIndexRayRef.current.toString(),
          chainTimestamp: new Date(lastUpdate * 1000).toLocaleString(),
          currentLastUpdate: new Date(lastUpdateMsRef.current).toLocaleString(),
          reason: 'Real-time is running, updating would reset progress'
        });
      }
      
      // Calculate current balance using Aave formula: actualBalance = scaledBalance * (currentIndex / snapshotIndex)
      const actualWad = (principalWad * liquidityIndexRay) / validSnapshotIndex;
      const actualBalance = Number(ethers.formatUnits(actualWad, 18));
      const principalNum = Number(ethers.formatUnits(principalWad, 18));
      const interestEarned = actualBalance - principalNum;
      
      // Get current APR for logging (don't use in dependency)
      const currentAPR = aprData?.supplyAPR || 0;
      
      // IMPORTANT: Only update displayBalance if real-time is NOT running
      // OR if balance from chain is significantly higher (new deposit/withdraw detected)
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
      // 2. Real-time is running BUT chain balance is significantly HIGHER (new deposit), OR
      // 3. Current balance is 0 (initial state)
      // NEVER update if real-time balance is higher than chain (real-time has more interest)
      const isSignificantIncrease = balanceDiff > Math.max(principalNum * 0.01, 0.1); // 1% or 0.1 tokens increase
      const isSignificantDecrease = balanceDiff < -Math.max(principalNum * 0.01, 0.1); // 1% or 0.1 tokens decrease
      
      // If real-time is active, only update if chain balance is significantly HIGHER (new deposit)
      // Never update if chain balance is lower (would reset real-time progress)
      const shouldUpdateDisplayBalance = 
        currentDisplayBalance === 0 || // Initial state
        (!isRealtimeActive && (actualBalance > 0 || isSignificantIncrease)) || // Not running, allow update
        (isRealtimeActive && isSignificantIncrease); // Running, only if significant increase (new deposit)
      
      console.log('✅ Calculated balance from chain:', {
        principal: principalNum,
        snapshotIndexRay: validSnapshotIndex.toString(),
        liquidityIndexRay: liquidityIndexRay.toString(),
        actualBalance,
        interestEarned,
        indicesEqual: snapshotIndexRay === liquidityIndexRay,
        rateRayPerSec: liquidityRateRayPerSec.toString(),
        supplyAPR: currentAPR,
        willStartRealtime: liquidityRateRayPerSec > BigInt(0) || currentAPR > 0,
        currentDisplayBalance,
        isRealtimeActive,
        balanceDiff,
        absBalanceDiff: absBalanceDiff,
        isSignificantIncrease,
        isSignificantDecrease,
        shouldUpdateDisplayBalance,
        reason: !shouldUpdateDisplayBalance ? 
          (isRealtimeActive ? 'Real-time active, preserving progress' : 'No significant change') :
          (currentDisplayBalance === 0 ? 'Initial state' : 
           isSignificantIncrease ? 'Significant increase (new deposit)' : 
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
  }, [provider, userAddress, assetAddress, asset?.symbol, saveSnapshot, storageKey, supplyAsset]);
  
  // Initialize: Load from localStorage first, then fetch from chain
  useEffect(() => {
    if (!userAddress || !asset?.symbol || !assetAddress) return;
    
    const storedSnapshot = loadStoredSnapshot();
    
    if (storedSnapshot && (storedSnapshot.principalWad || storedSnapshot.scaledBalance)) {
      // Restore from localStorage
      principalWadRef.current = storedSnapshot.principalWad ? BigInt(storedSnapshot.principalWad) : BigInt(0);
      // Restore originalPrincipalWadRef - use stored value or current principal if not stored
      // IMPORTANT: If not stored, use principalWadRef as fallback (for backward compatibility)
      originalPrincipalWadRef.current = storedSnapshot.originalPrincipalWad 
        ? BigInt(storedSnapshot.originalPrincipalWad) 
        : (principalWadRef.current > BigInt(0) ? principalWadRef.current : BigInt(0));
      
      // Log if we're using fallback
      if (!storedSnapshot.originalPrincipalWad && principalWadRef.current > BigInt(0)) {
        console.warn('⚠️ originalPrincipalWad not found in localStorage, using principalWadRef as fallback:', {
          originalPrincipalWad: originalPrincipalWadRef.current.toString(),
          principalWad: principalWadRef.current.toString(),
          note: 'This is OK for backward compatibility, but originalPrincipalWad should be saved in future'
        });
      }
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
      
      console.log('📦 Restored snapshot from localStorage:', {
        principalWad: principalWadRef.current.toString(),
        originalPrincipalWad: originalPrincipalWadRef.current.toString(),
        principalNum: Number(ethers.formatUnits(principalWadRef.current, 18)).toFixed(8) + ' DAI',
        originalPrincipalNum: Number(ethers.formatUnits(originalPrincipalWadRef.current, 18)).toFixed(8) + ' DAI',
        snapshotIndexRay: snapshotIndexRayRef.current.toString(),
        oldIndexRay: oldIndexRayRef.current.toString(),
        rateRayPerSec: rateRayPerSecRef.current.toString(),
        lastUpdateMs: new Date(lastUpdateMsRef.current).toLocaleString(),
        note: 'originalPrincipalWad is used for interest calculation'
      });
      
      // If principal is 0 or effectively 0, reset display to 0 and stop real-time
      const restoredPrincipalNum = Number(ethers.formatUnits(principalWadRef.current, 18));
      const MIN_BALANCE_THRESHOLD = 0.000001; // Consider balance < 0.000001 (1e-6) as effectively 0
      
      if (principalWadRef.current === BigInt(0) || restoredPrincipalNum < MIN_BALANCE_THRESHOLD) {
        console.log('📦 Principal is 0 or effectively 0, setting display to 0 and stopping real-time:', {
          principalWad: principalWadRef.current.toString(),
          principalNum: restoredPrincipalNum.toFixed(18),
          threshold: MIN_BALANCE_THRESHOLD
        });
        principalWadRef.current = BigInt(0);
        originalPrincipalWadRef.current = BigInt(0);
        setDisplayBalance(0);
        displayBalanceRef.current = 0;
        isRealtimeRunningRef.current = false; // Reset flag when principal is 0
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem(storageKey);
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
        console.log('📦 Calculated from restored snapshot:', {
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
  
  // Calculate real-time balance using Aave formula (updates every 1 second)
  useEffect(() => {
    // Check if we should skip realtime update
    // IMPORTANT: snapshotIndexRay = RAY is VALID if it's from chain (new deposit where indices are equal)
    // We only skip if principal is 0 OR effectively 0 (< 0.000001) OR snapshotIndex is invalid (0)
    const principalNumCheck = Number(ethers.formatUnits(principalWadRef.current, 18));
    const MIN_BALANCE_THRESHOLD = 0.000001; // Consider balance < 0.000001 (1e-6) as effectively 0
    const isEffectivelyZero = principalWadRef.current === BigInt(0) || principalNumCheck < MIN_BALANCE_THRESHOLD;
    
    const shouldSkip = isLoadingSnapshot || 
                      isEffectivelyZero || 
                      snapshotIndexRayRef.current === BigInt(0) || 
                      asset?.symbol === 'ETH';
    
    if (shouldSkip) {
      console.log('⏸️ Skipping realtime update:', {
        isLoadingSnapshot,
        principalWad: principalWadRef.current.toString(),
        principalNum: principalNumCheck.toFixed(18),
        isEffectivelyZero,
        snapshotIndexRay: snapshotIndexRayRef.current.toString(),
        oldIndexRay: oldIndexRayRef.current.toString(),
        rateRayPerSec: rateRayPerSecRef.current.toString(),
        symbol: asset?.symbol,
        snapshotEqualsRAY: snapshotIndexRayRef.current === RAY,
        reason: isLoadingSnapshot ? 'Loading snapshot' : 
                isEffectivelyZero ? `Principal is effectively 0 (< ${MIN_BALANCE_THRESHOLD})` :
                snapshotIndexRayRef.current === BigInt(0) ? 'Snapshot index is 0' :
                asset?.symbol === 'ETH' ? 'ETH not supported' : 'Unknown'
      });
      
      // If balance is effectively zero, reset display to 0
      if (isEffectivelyZero && displayBalance > MIN_BALANCE_THRESHOLD) {
        setDisplayBalance(0);
        displayBalanceRef.current = 0;
        console.log('🔄 Reset displayBalance to 0 (balance is effectively zero)');
      }
      // Still set displayBalance if available (from current index, no real-time update)
      // But only if real-time is not running (check both flag and interval)
      const isRealtimeActive = isRealtimeRunningRef.current && intervalRef.current !== null;
      if (principalWadRef.current > BigInt(0) && snapshotIndexRayRef.current > BigInt(0) && !isRealtimeActive) {
        const actualWad = (principalWadRef.current * oldIndexRayRef.current) / snapshotIndexRayRef.current;
        const staticBalance = Number(ethers.formatUnits(actualWad, 18));
        setDisplayBalance(staticBalance);
        displayBalanceRef.current = staticBalance;
        console.log('📊 Set static balance (no realtime):', staticBalance);
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
    
    console.log('🔍 Checking rate before realtime update:', {
      rateFromChain: rateFromChain.toString(),
      supplyAPR,
      principal: principalWadRef.current.toString(),
      snapshotIndex: snapshotIndexRayRef.current.toString(),
      liquidityIndex: oldIndexRayRef.current.toString()
    });
    
    if (rateRayPerSec === BigInt(0) && supplyAPR > 0) {
      // Convert APR (annual percentage rate) to rate per second
      // APR is yearly rate, so we divide by SECONDS_PER_YEAR to get per-second rate
      // Formula: ratePerSecond = (APR / 100) / SECONDS_PER_YEAR
      // Then convert to RAY (1e27) for BigInt precision
      const aprDecimal = supplyAPR / 100; // Convert percentage to decimal (e.g., 5% -> 0.05)
      const ratePerSecond = aprDecimal / SECONDS_PER_YEAR; // Divide by seconds in year to get per-second rate
      rateRayPerSec = BigInt(Math.floor(ratePerSecond * 1e27)); // Convert to RAY (1e27) for BigInt
      
      console.log('📊 Using APR fallback for rate:', {
        supplyAPR: supplyAPR + '%',
        aprDecimal,
        SECONDS_PER_YEAR,
        ratePerSecond,
        rateRayPerSec: rateRayPerSec.toString(),
        rateRayPerSecNum: Number(rateRayPerSec),
        verification: `Expected APR from rate: ${(ratePerSecond * SECONDS_PER_YEAR * 100).toFixed(4)}%`
      });
    }
    
    if (rateRayPerSec === BigInt(0)) {
      console.warn('⏸️ No rate available, skipping realtime update', {
        rateFromChain: rateFromChain.toString(),
        supplyAPR,
        snapshotIndex: snapshotIndexRayRef.current.toString(),
        liquidityIndex: oldIndexRayRef.current.toString(),
        principal: principalWadRef.current.toString()
      });
      // Still calculate balance from current index even if rate is 0
      const actualWad = (principalWadRef.current * oldIndexRayRef.current) / snapshotIndexRayRef.current;
      const currentBalance = Number(ethers.formatUnits(actualWad, 18));
      const principalNum = Number(ethers.formatUnits(principalWadRef.current, 18));
      console.log('📊 Current balance (no rate):', {
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
    
    console.log('💰 Starting realtime updates (BigInt):', {
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
        
        console.log('💰 Realtime update:', {
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
      console.log('🧹 Cleaning up realtime interval (keeping flag):', {
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
  }, [isLoadingSnapshot, asset?.symbol, saveSnapshot, supplyAPR]);
  
  // Track previous principal to detect actual changes (not just refresh)
  const previousPrincipalRef = useRef<number>(-1);
  
  // Check for new transactions and update snapshot
  // ONLY reset if principal actually changed (new deposit/withdraw), not on every refresh
  useEffect(() => {
    if (!supplyAsset || isLoadingSnapshot) return;
    
    const currentPrincipal = parseFloat(supplyAsset.supplyPrincipal || '0');
    const currentChainBalance = parseFloat(supplyAsset.supplyBalance || supplyAsset.supplyPrincipal || '0');
    const principalDisplay = Number(ethers.formatUnits(principalWadRef.current, 18));
    
    // Only check if principal actually changed (not just refresh with same value)
    const principalChanged = Math.abs(currentPrincipal - previousPrincipalRef.current) > 0.001;
    
    // If principal is 0 or very close to 0 AND it actually changed (not just refresh), reset display
    const MIN_BALANCE_THRESHOLD = 0.000001; // Consider balance < 0.000001 (1e-6) as effectively 0
    if (currentPrincipal < MIN_BALANCE_THRESHOLD && displayBalance > MIN_BALANCE_THRESHOLD && principalChanged) {
      console.log('🔄 Principal is near 0 AND changed, resetting display:', {
        currentPrincipal,
        previousPrincipal: previousPrincipalRef.current,
        displayBalance,
        principalDisplay,
        principalChanged
      });
      principalWadRef.current = BigInt(0);
      originalPrincipalWadRef.current = BigInt(0);
      snapshotIndexRayRef.current = RAY;
      oldIndexRayRef.current = RAY;
      rateRayPerSecRef.current = BigInt(0);
      lastUpdateMsRef.current = Date.now();
      setDisplayBalance(0);
      displayBalanceRef.current = 0;
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
      console.log('🔄 New deposit transaction detected, fetching chain snapshot and updating localStorage:', {
        old: principalDisplay,
        new: currentPrincipal,
        diff,
        principalChanged
      });
      // Fetch new snapshot from chain (this will also save to localStorage via saveSnapshot)
      fetchChainSnapshot().then((result) => {
        if (result && result.actualBalance !== undefined) {
          console.log('✅ Successfully updated localStorage after new deposit transaction:', {
            newBalance: result.actualBalance,
            newPrincipal: currentPrincipal
          });
        }
      }).catch((error) => {
        console.error('❌ Failed to update localStorage after new deposit transaction:', error);
      });
    }
  }, [supplyAsset?.supplyPrincipal, supplyAsset?.supplyBalance, isLoadingSnapshot, fetchChainSnapshot, displayBalance, storageKey]);
  
  // Auto-refresh from chain every 30 seconds
  useEffect(() => {
    if (!isConnected || !provider || asset?.symbol === 'ETH') return;
    
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing chain snapshot...');
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
        const pool = new ethers.Contract(CONFIG.LENDING_POOL, abi, provider);
        const reserve = await pool.reserves(asset.address);
        
        // CRITICAL: The lending pool contract stores reserveCash with 18 decimals (WAD format)
        // This is a standard practice in DeFi protocols - all amounts are normalized to 18 decimals
        // regardless of the actual token decimals (e.g., USDC has 6 decimals, but reserveCash is stored with 18)
        // Therefore, we MUST format reserveCash with 18 decimals, NOT with asset.decimals
        
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
        let reserveCash = parseFloat(reserveCashFormatted);
        
        // Get asset decimals for logging purposes only
        let assetDecimals = Number(asset?.decimals || 18);
        if (!assetDecimals || assetDecimals <= 0 || assetDecimals > 18) {
          try {
            const erc20Abi = ['function decimals() view returns (uint8)'];
            const tokenContract = new ethers.Contract(asset.address, erc20Abi, provider);
            const tokenDecimals = await tokenContract.decimals();
            assetDecimals = Number(tokenDecimals);
          } catch (e) {
            // Use 18 as fallback
            assetDecimals = 18;
          }
        }
        
        // Validate that reserveCash is reasonable
        if (reserveCash > 1000000000) {
          console.error('⚠️ Reserve cash seems too large after formatting with 18 decimals:', {
            reserveCashRaw: reserveCashRaw.toString(),
            reserveCashBigInt: reserveCashBigInt.toString(),
            reserveCashFormatted,
            reserveCash,
            assetSymbol: asset?.symbol,
            assetDecimals,
            note: 'Contract stores reserveCash with 18 decimals (WAD format)'
          });
        }
        
        // totalDebtPrincipal is also stored with 18 decimals (WAD format) in the contract
        const totalDebtRaw = reserve.totalDebtPrincipal;
        const totalDebtFormatted = ethers.formatUnits(totalDebtRaw.toString(), RESERVE_CASH_DECIMALS);
        const totalDebt = parseFloat(totalDebtFormatted);
        
        const totalSupply = reserveCash + totalDebt;
        const utilization = totalSupply > 0 ? (totalDebt / totalSupply) * 100 : 0;
        
        console.log('📊 Reserve data fetched:', {
          reserveCashRaw: reserveCashRaw.toString(),
          assetDecimals,
          decimalsUsed: RESERVE_CASH_DECIMALS,
          reserveCashFormatted,
          reserveCash,
          totalDebtRaw: totalDebtRaw.toString(),
          totalDebtFormatted,
          totalDebt,
          totalSupply,
          utilization,
          assetSymbol: asset?.symbol,
          note: 'Contract stores reserveCash with 18 decimals (WAD format), not asset.decimals'
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
    
    // Auto-refresh every 30 seconds to sync with chain
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing balance with interest...');
      refresh();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [isConnected, provider, refresh]);

  const handleWithdrawInline = async () => {
    if (!signer || !provider || !asset) return;
    const amountNum = parseFloat(depositAmount || '0');
    const userSupplyNum = suppliedBalance || 0;
    const maxCap = Math.max(0, Math.min(userSupplyNum, availableLiquidity || 0));
    const epsilon = 0.000001; // Allow small floating point difference
    if (amountNum <= 0 || amountNum > maxCap + epsilon) {
      showToast({
        type: 'error',
        title: 'Invalid amount',
        message: `Amount must be > 0 and ≤ ${maxCap.toFixed(6)} ${asset.symbol}`
      });
      return;
    }
    try {
      const amountBN = parseTokenAmount(depositAmount, asset.decimals || 18);
      const userAddr = await signer.getAddress();
      const refined = await dryRunWithdrawAmount(provider as ethers.Provider, userAddr, asset.address, amountBN);
      const finalBN = (refined && typeof refined === 'bigint' && refined > BigInt(0)) ? refined : amountBN;
      const tx = await withdraw(signer, asset.address, finalBN);
      showToast({ type: 'success', title: 'Withdraw submitted', message: `Tx: ${tx.hash.slice(0, 10)}...` });
      setDepositAmount('');
      
      // Check if withdrawing all balance (MAX) - use more lenient tolerance for dust amounts
      const MIN_BALANCE_THRESHOLD_WITHDRAW = 0.000001; // Consider balance < 0.000001 as effectively 0
      const isWithdrawingAll = Math.abs(amountNum - userSupplyNum) < 0.0001 || // Within 0.0001 tolerance
                               (userSupplyNum - amountNum < MIN_BALANCE_THRESHOLD_WITHDRAW && amountNum > 0); // Or remaining balance is dust
      
      if (isWithdrawingAll) {
        // Withdrawing all - reset immediately for better UX
        console.log('💰 Withdrawing all balance, resetting immediately');
        principalWadRef.current = BigInt(0);
        originalPrincipalWadRef.current = BigInt(0);
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
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem(storageKey);
        }
      }
      
      refresh();
      
      // Force refresh APR after withdraw to show updated rates
      const refreshAPRAfterWithdraw = async () => {
        try {
          const { triggerAPRRefresh } = await import('@/hooks/useSharedAPR');
          // Wait for transaction to be confirmed and contract to update rates
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
          await triggerAPRRefresh(provider as ethers.Provider, CONFIG.LENDING_POOL, asset.address);
          // Refresh again after a bit more to ensure rates are updated
          setTimeout(async () => {
            await triggerAPRRefresh(provider as ethers.Provider, CONFIG.LENDING_POOL, asset.address);
            refresh(); // Also refresh user balances
          }, 3000); // 3 seconds later
        } catch (error) {
          console.warn('[handleWithdrawInline] APR refresh failed:', error);
        }
      };
      refreshAPRAfterWithdraw();
      
      // Wait for transaction to be confirmed, then fetch new snapshot and update localStorage
      // Try multiple times with increasing delays to ensure transaction is confirmed
      const updateAfterWithdraw = async (attempt: number = 1) => {
        const delay = attempt * 2000; // 2s, 4s, 6s...
        setTimeout(async () => {
          try {
            console.log(`🔄 Fetching chain snapshot after withdraw (attempt ${attempt})...`);
            const result = await fetchChainSnapshot();
            if (result && result.actualBalance !== undefined) {
              console.log('✅ Successfully updated localStorage after withdraw transaction:', {
                newBalance: result.actualBalance,
                attempt
              });
            } else if (attempt < 3) {
              // Retry up to 3 times if not successful
              updateAfterWithdraw(attempt + 1);
            }
          } catch (error) {
            console.error(`❌ Failed to update localStorage after withdraw (attempt ${attempt}):`, error);
            if (attempt < 3) {
              updateAfterWithdraw(attempt + 1);
            }
          }
        }, delay);
      };
      
      // Start first attempt after 2 seconds
      updateAfterWithdraw(1);
    } catch (e: any) {
      showToast({ type: 'error', title: 'Withdraw failed', message: e?.message || 'Transaction failed' });
    }
  };

  const handleMaxClick = () => {
    const userSupplyNum = suppliedBalance || 0;
    const maxCap = Math.max(0, Math.min(userSupplyNum, availableLiquidity || 0));
    // If amount is very small (< 0.01), subtract a tiny bit to avoid rounding issues
    const finalAmount = maxCap < 0.01 ? Math.max(0, maxCap - 0.0000001) : maxCap;
    setDepositAmount(finalAmount.toFixed(18));
  };

  const handleLendSuccess = () => {
    showToast({
      type: 'success',
      title: 'Deposit Successful!',
      message: 'Your tokens have been deposited successfully'
    });
    refresh();
    
    // Wait for transaction to be confirmed, then fetch new snapshot and update localStorage
    // Try multiple times with increasing delays to ensure transaction is confirmed
    const updateAfterDeposit = async (attempt: number = 1) => {
      const delay = attempt * 2000; // 2s, 4s, 6s...
      setTimeout(async () => {
        try {
          console.log(`🔄 Fetching chain snapshot after deposit (attempt ${attempt})...`);
          const result = await fetchChainSnapshot();
          if (result && result.actualBalance !== undefined) {
            console.log('✅ Successfully updated localStorage after deposit transaction:', {
              newBalance: result.actualBalance,
              attempt
            });
          } else if (attempt < 3) {
            // Retry up to 3 times if not successful
            updateAfterDeposit(attempt + 1);
          }
        } catch (error) {
          console.error(`❌ Failed to update localStorage after deposit (attempt ${attempt}):`, error);
          if (attempt < 3) {
            updateAfterDeposit(attempt + 1);
          }
        }
      }, delay);
    };
    
    // Start first attempt after 2 seconds
    updateAfterDeposit(1);
  };

  const handleWrapEthSuccess = () => {
    showToast({
      type: 'success',
      title: 'ETH Wrapped!',
      message: 'ETH has been successfully wrapped to WETH'
    });
    setWrapEthModalOpen(false);
    refresh();
  };

  if (!asset) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Asset not found</h2>
            <Button onClick={() => router.push('/deposit')}>Back to Deposit</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const walletBalance = parseFloat(asset.balance || '0');
  const walletBalanceUSD = typeof asset.balanceUSD === 'number' ? asset.balanceUSD : parseFloat(String(asset.balanceUSD || 0));
  
  // Get original principal (the amount user originally deposited, without interest)
  // This should never change unless user makes a new deposit
  // IMPORTANT: Always use originalPrincipalWadRef if available, never fallback to supplyAsset
  // because supplyAsset.supplyPrincipal may include interest or be inaccurate
  const originalPrincipalWad = originalPrincipalWadRef.current > BigInt(0)
    ? originalPrincipalWadRef.current
    : (principalWadRef.current > BigInt(0)
      ? principalWadRef.current
      : BigInt(0));
  const originalPrincipal = Number(ethers.formatUnits(originalPrincipalWad, 18));
  const suppliedPrincipal = originalPrincipal;
  
  // Warn if originalPrincipalWadRef is 0 but we have principal
  if (originalPrincipalWadRef.current === BigInt(0) && principalWadRef.current > BigInt(0)) {
    console.warn('⚠️ originalPrincipalWadRef is 0 but principalWadRef > 0:', {
      originalPrincipalWadRef: originalPrincipalWadRef.current.toString(),
      principalWadRef: principalWadRef.current.toString(),
      originalPrincipal: originalPrincipal.toFixed(18),
      note: 'Using principalWadRef as fallback, but originalPrincipalWadRef should be set!'
    });
  }
  
  // Use displayBalance from realtime calculation
  // Priority: displayBalance (from realtime) > supplyAsset.supplyBalance (from chain) > suppliedPrincipal
  // If displayBalance is 0 but we have principal, it means realtime hasn't started yet, use chain balance
  const MIN_BALANCE_THRESHOLD_UI = 0.000001; // Consider balance < 0.000001 (1e-6) as effectively 0 in UI
  let suppliedBalance = displayBalance > 0 
    ? displayBalance 
    : (supplyAsset ? parseFloat(supplyAsset.supplyBalance || supplyAsset.supplyPrincipal || '0') : suppliedPrincipal || 0);
  
  // Force reset to 0 if balance is effectively zero (dust amount)
  if (suppliedBalance > 0 && suppliedBalance < MIN_BALANCE_THRESHOLD_UI) {
    console.log('🔄 Force resetting suppliedBalance to 0 (dust amount):', {
      suppliedBalance: suppliedBalance.toFixed(18),
      threshold: MIN_BALANCE_THRESHOLD_UI
    });
    suppliedBalance = 0;
    // Also reset displayBalance if it's the source
    if (displayBalance > 0 && displayBalance < MIN_BALANCE_THRESHOLD_UI) {
      setDisplayBalance(0);
      displayBalanceRef.current = 0;
    }
  }
  
  // Debug log
  console.log('💰 Balance calculation:', {
    displayBalance: displayBalance.toFixed(18),
    suppliedPrincipal: suppliedPrincipal.toFixed(18),
    originalPrincipal: originalPrincipal.toFixed(18),
    suppliedBalance: suppliedBalance.toFixed(18),
    principalWad: principalWadRef.current.toString(),
    originalPrincipalWad: originalPrincipalWadRef.current.toString(),
    principalWadNum: Number(ethers.formatUnits(principalWadRef.current, 18)).toFixed(18),
    originalPrincipalWadNum: Number(ethers.formatUnits(originalPrincipalWadRef.current, 18)).toFixed(18),
    supplyAssetBalance: supplyAsset?.supplyBalance,
    supplyAssetPrincipal: supplyAsset?.supplyPrincipal,
    usingRealtime: displayBalance > 0,
    usingChainBalance: displayBalance === 0 && supplyAsset?.supplyBalance
  });
  
  // Calculate interest earned (real-time updates every second)
  // Interest = currentBalance - originalPrincipal (the amount user originally deposited)
  const interestEarned = Math.max(0, suppliedBalance - suppliedPrincipal);
  
  // Debug log for interest calculation
  const interestDiff = suppliedBalance - suppliedPrincipal;
  console.log('💰 Interest calculation:', {
    suppliedBalance: suppliedBalance.toFixed(18),
    suppliedPrincipal: suppliedPrincipal.toFixed(18),
    interestEarned: interestEarned.toFixed(18),
    interestDiff: interestDiff.toFixed(18),
    displayBalance: displayBalance.toFixed(18),
    originalPrincipalWad: originalPrincipalWadRef.current.toString(),
    principalWad: principalWadRef.current.toString(),
    originalPrincipalWadNum: Number(ethers.formatUnits(originalPrincipalWadRef.current, 18)).toFixed(18),
    principalWadNum: Number(ethers.formatUnits(principalWadRef.current, 18)).toFixed(18),
    calculation: `${suppliedBalance.toFixed(18)} - ${suppliedPrincipal.toFixed(18)} = ${interestEarned.toFixed(18)}`,
    note: 'Interest = Balance - Original Principal',
    warning: originalPrincipalWadRef.current === BigInt(0) 
      ? '⚠️ originalPrincipalWadRef is 0 - interest may be incorrect!' 
      : (originalPrincipalWadRef.current === principalWadRef.current 
        ? '⚠️ originalPrincipalWadRef equals principalWadRef - may need to set original principal!' 
        : '✅ originalPrincipalWadRef is set and different from principalWadRef')
  });
  
  const suppliedBalanceUSD = suppliedBalance * parseFloat(String(asset.priceUSD || '0'));
  const interestEarnedUSD = interestEarned * parseFloat(String(asset.priceUSD || '0'));
  // Use reserveData.reserveCash if available, otherwise fallback to 0
  // reserveCash should already be formatted with correct decimals in fetchReserveData
  let availableLiquidity = (reserveData?.reserveCash !== undefined && reserveData?.reserveCash !== null) 
    ? reserveData.reserveCash 
    : 0;
  
  // Note: reserveCash is already formatted with 18 decimals (WAD format) in fetchReserveData
  // No need to recalculate here - the value should be correct
  
  // Debug log to verify the value
  console.log('💰 Available liquidity calculation:', {
    availableLiquidity,
    reserveCash: reserveData?.reserveCash,
    assetSymbol: asset?.symbol,
    assetDecimals: asset?.decimals,
    willBeFormattedAs: formatNumber(availableLiquidity, 2)
  });
  const ltv = reserveData ? reserveData.ltvBps / 100 : 0; // Convert basis points to percentage
  const liquidationThreshold = reserveData ? reserveData.liqThresholdBps / 100 : 0;
  const liquidationPenalty = reserveData ? reserveData.liqBonusBps / 100 : 0;
  const utilization = reserveData?.utilization || 0;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Back button */}
        <Button 
          variant="ghost" 
          onClick={() => router.push('/deposit')}
          className="mb-4"
        >
          ← Back to Deposit
        </Button>

        {/* Asset Header */}
        <div className="flex items-center gap-4">
          <Image
            src={getIconPath(asset.symbol)}
            alt={asset.symbol}
            width={64}
            height={64}
            className="rounded-full"
          />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Deposit {asset.symbol}</h1>
            <p className="text-muted-foreground">Supply {asset.symbol} to earn yield</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Reserve Information */}
          <div className="space-y-6">
            {/* Account Balances */}
            <Card>
              <CardHeader>
                <CardTitle>Your Balances</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your balance in pool:</span>
                  <span className="font-medium font-mono text-sm">
                   {isNaN(suppliedBalance) ? '0.000000000000000000' : suppliedBalance.toFixed(18)} {asset.symbol}
                    {/* <span className="text-xs text-muted-foreground ml-2">
                      ({isNaN(suppliedBalanceUSD) ? '$0.00' : `$${suppliedBalanceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`})
                  </span> */}
                  </span>
                </div>
                {/* <div className="flex justify-between">
                  <span className="text-muted-foreground">Interest earned:</span>
                  <span className="font-medium font-mono text-sm">
                    {isNaN(interestEarned) ? '0.000000000000000000' : interestEarned.toFixed(18)} {asset.symbol}
                    <span className="text-xs text-muted-foreground ml-2">
                      ({isNaN(interestEarnedUSD) ? '0.000000000000000000' : interestEarnedUSD.toFixed(18)} {asset.symbol})
                    </span>
                  </span>
                </div> */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your wallet balance:</span>
                  <span className="font-medium">
                    {formatNumber(walletBalance, 4)} {asset.symbol}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Reserve Overview */}
            <Card>
              <CardHeader>
                <CardTitle>{asset.symbol} Reserve Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Utilization rate:</span>
                  <span className="font-medium">{formatNumber(utilization, 2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available liquidity:</span>
                  <span className="font-medium">
                    {formatNumber(availableLiquidity, 2)} {asset.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit APY:</span>
                  <span className="font-medium text-green-600">
                    {aprData?.isLoading ? 'Loading...' : formatPercentage(supplyAPY)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Can be used as collateral:</span>
                  <span className={`font-medium ${reserveData?.ltvBps > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                    {reserveData?.ltvBps > 0 ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Asset price:</span>
                  <span className="font-medium">
                    {formatCurrency(parseFloat(asset.priceUSD || '0'))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maximum LTV:</span>
                  <span className="font-medium">{formatNumber(ltv, 2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Liquidation threshold:</span>
                  <span className="font-medium">{formatNumber(liquidationThreshold, 2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Liquidation penalty:</span>
                  <span className="font-medium">{formatNumber(liquidationPenalty, 2)}%</span>
                </div>
                
                {/* Historical rates placeholder */}
                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-medium mb-2">Historical rates</h4>
                  <p className="text-xs text-muted-foreground">No data to show yet</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Withdraw Form */}
          <Card>
            <CardHeader>
              <CardTitle>Withdraw Overview</CardTitle>
              <CardDescription>
                These are your transaction details. Make sure to check if this is correct before submitting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="text"
                    value={depositAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setDepositAmount(value);
                      }
                    }}
                    placeholder="0.00"
                    className="pr-20 text-lg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={handleMaxClick}
                  >
                    MAX
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  ≈ {formatCurrency(parseFloat(depositAmount || '0') * parseFloat(asset.priceUSD || '1'))} USD
                </div>
              </div>

              {/* Transaction Details */}
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Wallet balance:</span>
                  <span>{formatNumber(walletBalance, 4)} {asset.symbol}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount to withdraw:</span>
                  <span>{depositAmount || '0'} {asset.symbol}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Balance after withdraw:</span>
                  <span>
                    {formatNumber(walletBalance + parseFloat(depositAmount || '0'), 4)} {asset.symbol}
                  </span>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
                    1
                  </div>
                  <span className="font-medium">Withdraw</span>
                </div>
                <div className="flex-1 h-1 bg-muted"></div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-medium">
                    2
                  </div>
                  <span className="text-muted-foreground">Finished</span>
                </div>
              </div>

              {/* Withdraw Button */}
              <Button
                onClick={handleWithdrawInline}
                disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                className="w-full"
                size="lg"
              >
                Withdraw
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Please submit to withdraw
              </p>
            </CardContent>
          </Card>
        </div>

        {/* No Withdraw Modal - inline flow */}

        {/* Wrap ETH Modal */}
        <WrapEthModal
          open={wrapEthModalOpen}
          onClose={() => setWrapEthModalOpen(false)}
          signer={signer}
          onSuccess={handleWrapEthSuccess}
          onBalanceUpdate={refresh}
        />
      </div>
    </AppLayout>
  );
}

