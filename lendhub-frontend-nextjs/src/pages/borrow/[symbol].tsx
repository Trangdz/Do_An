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
      
      const pool = new ethers.Contract(CONFIG.LENDING_POOL, abi, provider);
      
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
      
      console.log('📊 Fetched borrow chain snapshot:', {
        principalWad: principalWad.toString(),
        snapshotIndexRay: snapshotIndexRay.toString(),
        variableBorrowIndexRay: variableBorrowIndexRay.toString(),
        variableBorrowRateRayPerSec: variableBorrowRateRayPerSec.toString(),
        lastUpdate: new Date(lastUpdate * 1000).toLocaleString()
      });
      
      // Save to localStorage
      saveSnapshot(principalWad, snapshotIndexRay, variableBorrowIndexRay, variableBorrowRateRayPerSec, lastUpdate * 1000);
      
      // Update refs
      principalWadRef.current = principalWad;
      snapshotIndexRayRef.current = snapshotIndexRay;
      oldIndexRayRef.current = variableBorrowIndexRay;
      rateRayPerSecRef.current = variableBorrowRateRayPerSec;
      lastUpdateMsRef.current = lastUpdate * 1000;
      
      // Calculate current debt using Aave formula: actualDebt = scaledDebt * (currentIndex / snapshotIndex)
      const actualWad = (principalWad * variableBorrowIndexRay) / snapshotIndexRay;
      const actualBalance = Number(ethers.formatUnits(actualWad, 18));
      console.log('✅ Calculated borrow balance from chain:', {
        principal: Number(ethers.formatUnits(principalWad, 18)),
        snapshotIndexRay: snapshotIndexRay.toString(),
        variableBorrowIndexRay: variableBorrowIndexRay.toString(),
        actualBalance,
        interestEarned: actualBalance - Number(ethers.formatUnits(principalWad, 18))
      });
      setDisplayBalance(actualBalance);
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
      lastUpdateMsRef.current = storedSnapshot.lastUpdateMs || Date.now();
      
      console.log('📦 Restored borrow snapshot from localStorage:', {
        principalWad: principalWadRef.current.toString(),
        snapshotIndexRay: snapshotIndexRayRef.current.toString(),
        oldIndexRay: oldIndexRayRef.current.toString(),
        rateRayPerSec: rateRayPerSecRef.current.toString(),
        lastUpdateMs: new Date(lastUpdateMsRef.current).toLocaleString()
      });
      
      // If principal is 0, reset display to 0
      if (principalWadRef.current === BigInt(0)) {
        console.log('📦 Principal is 0, setting display to 0');
        setDisplayBalance(0);
        setIsLoadingSnapshot(false);
        return;
      }
      
      // Calculate current balance using Aave formula
      const nowMs = Date.now();
      const deltaTimeMs = nowMs - lastUpdateMsRef.current;
      const deltaSec = Math.max(0, Math.floor(deltaTimeMs / 1000));
      
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
        
        setDisplayBalance(actualBalance);
        setIsLoadingSnapshot(false);
      } else {
        // No time elapsed or no rate, use current balance
        const actualWad = (principalWadRef.current * oldIndexRayRef.current) / snapshotIndexRayRef.current;
        const actualBalance = Number(ethers.formatUnits(actualWad, 18));
        setDisplayBalance(actualBalance);
        setIsLoadingSnapshot(false);
      }
    } else {
      // No stored data, fetch from chain
      fetchChainSnapshot();
    }
  }, [userAddress, asset?.symbol, assetAddress, loadStoredSnapshot, fetchChainSnapshot]);
  
  // Calculate real-time balance using Aave formula (updates every 50ms for borrow)
  useEffect(() => {
    if (isLoadingSnapshot || principalWadRef.current === BigInt(0) || snapshotIndexRayRef.current === BigInt(0) || asset?.symbol === 'ETH') {
      console.log('⏸️ Skipping borrow realtime update:', {
        isLoadingSnapshot,
        principalWad: principalWadRef.current.toString(),
        snapshotIndexRay: snapshotIndexRayRef.current.toString(),
        rateRayPerSec: rateRayPerSecRef.current.toString(),
        symbol: asset?.symbol
      });
      // Still set displayBalance if available
      if (principalWadRef.current > BigInt(0) && snapshotIndexRayRef.current > BigInt(0)) {
        const actualWad = (principalWadRef.current * oldIndexRayRef.current) / snapshotIndexRayRef.current;
        setDisplayBalance(Number(ethers.formatUnits(actualWad, 18)));
      }
      return;
    }
    
    // Clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Use rate from chain, fallback to APR if rate is 0
    const rateRayPerSec = rateRayPerSecRef.current > BigInt(0)
      ? rateRayPerSecRef.current
      : BigInt(Math.floor(((borrowAPR / 100) / SECONDS_PER_YEAR) * 1e27));
    
    if (rateRayPerSec === BigInt(0)) {
      console.log('⏸️ No rate available, skipping borrow realtime update');
      const actualWad = (principalWadRef.current * oldIndexRayRef.current) / snapshotIndexRayRef.current;
      setDisplayBalance(Number(ethers.formatUnits(actualWad, 18)));
      return;
    }
    
    console.log('💰 Starting borrow realtime updates (BigInt):', {
      principal: Number(ethers.formatUnits(principalWadRef.current, 18)),
      snapshotIndexRay: snapshotIndexRayRef.current.toString(),
      oldIndexRay: oldIndexRayRef.current.toString(),
      rateRayPerSec: rateRayPerSec.toString(),
      lastUpdateMs: new Date(lastUpdateMsRef.current).toLocaleString()
    });
    
    const updateBalance = () => {
      const nowMs = Date.now();
      const deltaSec = Math.floor((nowMs - lastUpdateMsRef.current) / 1000);
      if (deltaSec <= 0) return;
      // newIndexRay = oldIndexRay + oldIndexRay * rateRayPerSec * deltaSec / RAY
      const incr = (oldIndexRayRef.current * rateRayPerSec * BigInt(deltaSec)) / RAY;
      const newIndexRay = oldIndexRayRef.current + incr;
      const actualWad = (principalWadRef.current * newIndexRay) / snapshotIndexRayRef.current;
      setDisplayBalance(Number(ethers.formatUnits(actualWad, 18)));
    };
    
    // Update every 50ms
    intervalRef.current = setInterval(updateBalance, 50);
    
    // Save to localStorage periodically (every 30 seconds)
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
    
    // Save on page unload
    const handleBeforeUnload = () => {
      saveSnapshot(principalWadRef.current, snapshotIndexRayRef.current, oldIndexRayRef.current, rateRayPerSec, Date.now());
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearInterval(saveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload(); // Save final state
    };
  }, [isLoadingSnapshot, asset?.symbol, saveSnapshot, borrowAPR]);
  
  // Check for new transactions and update snapshot
  useEffect(() => {
    if (!borrowAsset || isLoadingSnapshot) return;
    
    const currentPrincipal = parseFloat(borrowAsset.borrowPrincipal || '0');
    const currentChainBalance = parseFloat(borrowAsset.borrowBalance || borrowAsset.borrowPrincipal || '0');
    const principalDisplay = Number(ethers.formatUnits(principalWadRef.current, 18));
    
    // If principal is 0 or very close to 0, reset display immediately
    if (currentPrincipal < 0.001 && displayBalance > 0.001) {
      console.log('🔄 Borrow principal is near 0, resetting display:', {
        currentPrincipal,
        displayBalance,
        principalDisplay
      });
      principalWadRef.current = BigInt(0);
      snapshotIndexRayRef.current = RAY;
      oldIndexRayRef.current = RAY;
      rateRayPerSecRef.current = BigInt(0);
      lastUpdateMsRef.current = Date.now();
      setDisplayBalance(0);
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
      }
      return;
    }
    
    // If principal changed significantly, fetch new snapshot from chain
    const diff = Math.abs(currentPrincipal - principalDisplay);
    if (diff > Math.max(currentPrincipal * 0.02, 0.01)) {
      console.log('🔄 New borrow transaction detected, fetching chain snapshot:', {
        old: principalDisplay,
        new: currentPrincipal,
        diff
      });
      fetchChainSnapshot();
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
        const pool = new ethers.Contract(CONFIG.LENDING_POOL, abi, provider);
        const reserve = await pool.reserves(asset.address);
        
        const decimals = Number(reserve.decimals || 18);
        const reserveCash = Number(ethers.formatUnits(reserve.reserveCash, decimals));
        const totalDebt = Number(ethers.formatUnits(reserve.totalDebtPrincipal, decimals));
        const totalSupply = reserveCash + totalDebt;
        const utilization = totalSupply > 0 ? (totalDebt / totalSupply) * 100 : 0;
        
        setReserveData({
          ltvBps: Number(reserve.ltvBps),
          liqThresholdBps: Number(reserve.liqThresholdBps),
          liqBonusBps: Number(reserve.liqBonusBps),
          reserveCash,
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
      // Force fetch chain snapshot to reset display if balance is 0
      setTimeout(() => {
        fetchChainSnapshot();
      }, 1000);
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
  const borrowedBalance = displayBalance || borrowedPrincipal || 0;
  
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
                    <div className="text-lg font-semibold">{formatCurrency(aprData?.available || 0)}</div>
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

