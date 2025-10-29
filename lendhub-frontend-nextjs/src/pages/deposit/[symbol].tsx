import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { AppLayout } from '@/components/layout/AppLayout';
import useLendContext from '@/context/useLendContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { LendModal } from '@/components/LendModal';
import { WrapEthModal } from '@/components/WrapEthModal';
import { CONFIG } from '@/config/contracts';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatPercentage, formatNumber } from '@/lib/math';
import { useSharedAPR } from '@/hooks/useSharedAPR';
import { ethers } from 'ethers';
import Image from 'next/image';

export default function DepositDetailPage() {
  const router = useRouter();
  const { symbol } = router.query;
  const { userAssets, supplyAssets, metamaskDetails, refresh } = useLendContext();
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [lendModalOpen, setLendModalOpen] = useState(false);
  const [wrapEthModalOpen, setWrapEthModalOpen] = useState(false);
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
  
  // Refs for Aave formula calculation (BigInt precision)
  const principalWadRef = useRef<bigint>(BigInt(0)); // principal in WAD (1e18)
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
        snapshotIndexRay: snapshotIndexRay.toString(),
        oldIndexRay: oldIndexRay.toString(),
        rateRayPerSec: rateRayPerSec.toString(),
        lastUpdateMs,
        fetchedAt: Math.floor(Date.now() / 1000),
        timestamp: Date.now()
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
      console.log('💾 Saved snapshot:', data);
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
      if (principalWad === BigInt(0)) {
        setIsLoadingSnapshot(false);
        return null;
      }
      
      // Get data from chain (raw BigInt for precision)
      const snapshotIndexRay = userReserve.supply.index as bigint; // snapshot index (RAY)
      const liquidityIndexRay = reserve.liquidityIndex as bigint; // current liquidity index (RAY)
      const liquidityRateRayPerSec = reserve.liquidityRateRayPerSec as bigint; // RAY per second
      const lastUpdate = Number(reserve.lastUpdate); // seconds
      
      console.log('📊 Fetched chain snapshot:', {
        principalWad: principalWad.toString(),
        snapshotIndexRay: snapshotIndexRay.toString(),
        liquidityIndexRay: liquidityIndexRay.toString(),
        liquidityRateRayPerSec: liquidityRateRayPerSec.toString(),
        lastUpdate: new Date(lastUpdate * 1000).toLocaleString()
      });
      
      // Save to localStorage
      saveSnapshot(principalWad, snapshotIndexRay, liquidityIndexRay, liquidityRateRayPerSec, lastUpdate * 1000);
      
      // Update refs
      principalWadRef.current = principalWad;
      snapshotIndexRayRef.current = snapshotIndexRay;
      oldIndexRayRef.current = liquidityIndexRay;
      rateRayPerSecRef.current = liquidityRateRayPerSec;
      lastUpdateMsRef.current = lastUpdate * 1000;
      
      // Calculate current balance using Aave formula: actualBalance = scaledBalance * (currentIndex / snapshotIndex)
      const actualWad = (principalWad * liquidityIndexRay) / snapshotIndexRay;
      const actualBalance = Number(ethers.formatUnits(actualWad, 18));
      console.log('✅ Calculated balance from chain:', {
        principal: Number(ethers.formatUnits(principalWad, 18)),
        snapshotIndexRay: snapshotIndexRay.toString(),
        liquidityIndexRay: liquidityIndexRay.toString(),
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
  }, [provider, userAddress, assetAddress, asset?.symbol, saveSnapshot]);
  
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
      
      console.log('📦 Restored snapshot from localStorage:', {
        principalWad: principalWadRef.current.toString(),
        snapshotIndexRay: snapshotIndexRayRef.current.toString(),
        oldIndexRay: oldIndexRayRef.current.toString(),
        rateRayPerSec: rateRayPerSecRef.current.toString(),
        lastUpdateMs: new Date(lastUpdateMsRef.current).toLocaleString()
      });
      
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
        console.log('📦 Calculated from restored snapshot:', {
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
  
  // Calculate real-time balance using Aave formula (updates every 1 second)
  useEffect(() => {
    if (isLoadingSnapshot || principalWadRef.current === BigInt(0) || snapshotIndexRayRef.current === BigInt(0) || asset?.symbol === 'ETH') {
      console.log('⏸️ Skipping realtime update:', {
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
      : BigInt(Math.floor(((supplyAPR / 100) / SECONDS_PER_YEAR) * 1e27));
    
    if (rateRayPerSec === BigInt(0)) {
      console.log('⏸️ No rate available, skipping realtime update');
      const actualWad = (principalWadRef.current * oldIndexRayRef.current) / snapshotIndexRayRef.current;
      setDisplayBalance(Number(ethers.formatUnits(actualWad, 18)));
      return;
    }
    
    console.log('💰 Starting realtime updates (BigInt):', {
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
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearInterval(saveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload(); // Save final state
    };
  }, [isLoadingSnapshot, asset?.symbol, saveSnapshot, supplyAPR]);
  
  // Check for new transactions and update snapshot
  useEffect(() => {
    if (!supplyAsset || isLoadingSnapshot) return;
    
    const currentPrincipal = parseFloat(supplyAsset.supplyPrincipal || '0');
    const currentChainBalance = parseFloat(supplyAsset.supplyBalance || supplyAsset.supplyPrincipal || '0');
    
    // If principal changed significantly, fetch new snapshot from chain
    const principalDisplay = Number(ethers.formatUnits(principalWadRef.current, 18));
    const diff = Math.abs(currentPrincipal - principalDisplay);
    if (diff > Math.max(currentPrincipal * 0.02, 0.01)) {
      console.log('🔄 New transaction detected, fetching chain snapshot:', {
        old: principalDisplay,
        new: currentPrincipal,
        diff
      });
      fetchChainSnapshot();
    }
  }, [supplyAsset?.supplyPrincipal, supplyAsset?.supplyBalance, isLoadingSnapshot, fetchChainSnapshot]);
  
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
    
    // Auto-refresh every 30 seconds to sync with chain
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing balance with interest...');
      refresh();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [isConnected, provider, refresh]);

  const handleDeposit = () => {
    if (!asset || !depositAmount || parseFloat(depositAmount) <= 0) return;
    
    if (asset.symbol === 'ETH') {
      setWrapEthModalOpen(true);
    } else {
      setSelectedToken({
        ...asset,
        depositAmount: depositAmount // Pass deposit amount to modal
      });
      setLendModalOpen(true);
    }
  };

  const handleMaxClick = () => {
    const walletBalance = parseFloat(asset?.balance || '0');
    setDepositAmount(walletBalance.toFixed(6));
  };

  const handleLendSuccess = () => {
    showToast({
      type: 'success',
      title: 'Deposit Successful!',
      message: 'Your tokens have been deposited successfully'
    });
    setLendModalOpen(false);
    setSelectedToken(null);
    refresh();
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
  
  // Get principal from supply asset (scaledBalance = principal)
  const suppliedPrincipal = principalWadRef.current > BigInt(0)
    ? Number(ethers.formatUnits(principalWadRef.current, 18))
    : (supplyAsset ? parseFloat(supplyAsset.supplyPrincipal || '0') : 0);
  
  // Use displayBalance from realtime calculation
  const suppliedBalance = displayBalance || suppliedPrincipal || 0;
  
  // Calculate interest earned (real-time updates every second)
  // Interest = actualBalance - scaledBalance (principal)
  const interestEarned = Math.max(0, suppliedBalance - suppliedPrincipal);
  
  const suppliedBalanceUSD = suppliedBalance * parseFloat(String(asset.priceUSD || '0'));
  const interestEarnedUSD = interestEarned * parseFloat(String(asset.priceUSD || '0'));
  const availableLiquidity = reserveData?.reserveCash || 0;
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
                    <span className="text-xs text-muted-foreground ml-2">
                      ({isNaN(suppliedBalanceUSD) ? '$0.00' : `$${suppliedBalanceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`})
                  </span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interest earned:</span>
                  <span className="font-medium font-mono text-sm">
                    {isNaN(interestEarned) ? '0.000000000000000000' : interestEarned.toFixed(18)} {asset.symbol}
                    <span className="text-xs text-muted-foreground ml-2">
                      ({isNaN(interestEarnedUSD) ? '0.000000000000000000' : interestEarnedUSD.toFixed(18)} {asset.symbol}
                    </span>
                  </span>
                </div>
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

          {/* Right Column: Deposit Form */}
          <Card>
            <CardHeader>
              <CardTitle>Deposit Overview</CardTitle>
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
                  <span className="text-muted-foreground">Amount to deposit:</span>
                  <span>{depositAmount || '0'} {asset.symbol}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Balance after deposit:</span>
                  <span>
                    {formatNumber(walletBalance - parseFloat(depositAmount || '0'), 4)} {asset.symbol}
                  </span>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
                    1
                  </div>
                  <span className="font-medium">Deposit</span>
                </div>
                <div className="flex-1 h-1 bg-muted"></div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-medium">
                    2
                  </div>
                  <span className="text-muted-foreground">Finished</span>
                </div>
              </div>

              {/* Deposit Button */}
              <Button
                onClick={handleDeposit}
                disabled={!depositAmount || parseFloat(depositAmount) <= 0 || parseFloat(depositAmount) > walletBalance}
                className="w-full"
                size="lg"
              >
                Deposit
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Please submit to deposit
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lend Modal */}
        {selectedToken && (
          <LendModal
            open={lendModalOpen}
            onClose={() => {
              setLendModalOpen(false);
              setSelectedToken(null);
            }}
            token={{
              address: selectedToken.address,
              symbol: selectedToken.symbol,
              decimals: selectedToken.decimals,
              userBalance: parseFloat(selectedToken.balance || '0')
            }}
            poolAddress={CONFIG.LENDING_POOL}
            signer={signer}
            provider={provider}
            onSuccess={handleLendSuccess}
            onWrapEth={() => {
              setLendModalOpen(false);
              setWrapEthModalOpen(true);
            }}
            simulatedBalance={parseFloat(selectedToken.balance || '0')}
          />
        )}

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

