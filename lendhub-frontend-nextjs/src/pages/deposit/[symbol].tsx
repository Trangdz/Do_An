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
  
  // State for realtime calculation
  const [displayBalance, setDisplayBalance] = useState<number>(0);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState<boolean>(true);
  
  // Refs for Aave formula calculation
  const scaledBalanceRef = useRef<number>(0); // scaledBalance from chain (principal)
  const snapshotIndexRef = useRef<number>(1); // snapshotIndex from userReserve.supply.index (index when user deposited)
  const oldIndexRef = useRef<number>(1); // liquidityIndex from chain at last update (for calculating new index)
  const rateRef = useRef<bigint>(BigInt(0)); // liquidityRateRayPerSec
  const lastUpdateTimestampRef = useRef<number>(Math.floor(Date.now() / 1000)); // seconds
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
  const saveSnapshot = useCallback((scaledBalance: number, snapshotIndex: number, oldIndex: number, rate: bigint, lastUpdateTimestamp: number) => {
    if (typeof window === 'undefined') return;
    try {
      const data = {
        scaledBalance,
        snapshotIndex, // Save snapshotIndex for calculation
        oldIndex,
        rate: rate.toString(),
        lastUpdateTimestamp,
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
      
      const principal = userReserve.supply.principal;
      if (principal === BigInt(0)) {
        setIsLoadingSnapshot(false);
        return null;
      }
      
      // Get data from chain
      const scaledBalance = Number(ethers.formatUnits(principal, 18)); // principal in 1e18
      const snapshotIndex = Number(userReserve.supply.index); // snapshot index (when user deposited)
      const liquidityIndex = Number(reserve.liquidityIndex); // current liquidity index
      const liquidityRateRayPerSec = BigInt(reserve.liquidityRateRayPerSec);
      const lastUpdate = Number(reserve.lastUpdate); // block timestamp
      
      console.log('📊 Fetched chain snapshot:', {
        scaledBalance,
        snapshotIndex,
        liquidityIndex,
        liquidityRateRayPerSec: liquidityRateRayPerSec.toString(),
        lastUpdate: new Date(lastUpdate * 1000).toLocaleString()
      });
      
      // Save to localStorage
      saveSnapshot(scaledBalance, snapshotIndex, liquidityIndex, liquidityRateRayPerSec, lastUpdate);
      
      // Update refs
      scaledBalanceRef.current = scaledBalance;
      snapshotIndexRef.current = snapshotIndex; // Save snapshot index for calculation
      oldIndexRef.current = liquidityIndex; // Use current index as starting point for newIndex calculation
      rateRef.current = liquidityRateRayPerSec;
      lastUpdateTimestampRef.current = lastUpdate;
      
      // Calculate current balance using Aave formula: actualBalance = scaledBalance * (currentIndex / snapshotIndex)
      const actualBalance = scaledBalance * (liquidityIndex / snapshotIndex);
      console.log('✅ Calculated balance from chain:', {
        scaledBalance,
        snapshotIndex,
        liquidityIndex,
        actualBalance,
        interestEarned: actualBalance - scaledBalance
      });
      setDisplayBalance(actualBalance);
      setIsLoadingSnapshot(false);
      
      return { scaledBalance, liquidityIndex, liquidityRateRayPerSec, lastUpdate, actualBalance };
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
    
    if (storedSnapshot && storedSnapshot.scaledBalance > 0) {
      // Restore from localStorage
      scaledBalanceRef.current = storedSnapshot.scaledBalance;
      snapshotIndexRef.current = storedSnapshot.snapshotIndex || storedSnapshot.oldIndex || 1; // Use snapshotIndex or fallback to oldIndex
      oldIndexRef.current = storedSnapshot.oldIndex || 1; // Current index at last update
      rateRef.current = BigInt(storedSnapshot.rate || 0);
      lastUpdateTimestampRef.current = storedSnapshot.lastUpdateTimestamp || Math.floor(Date.now() / 1000);
      
      console.log('📦 Restored snapshot from localStorage:', {
        scaledBalance: scaledBalanceRef.current,
        snapshotIndex: snapshotIndexRef.current,
        oldIndex: oldIndexRef.current,
        rate: rateRef.current.toString(),
        lastUpdate: new Date(lastUpdateTimestampRef.current * 1000).toLocaleString()
      });
      
      // Calculate current balance using Aave formula
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const deltaTime = currentTimestamp - lastUpdateTimestampRef.current;
      
      if (deltaTime > 0 && rateRef.current > BigInt(0)) {
        // newIndex = oldIndex * (1 + rate * deltaTime / SECONDS_PER_YEAR)
        const rateDecimal = Number(rateRef.current) / Number(RAY);
        const newIndex = oldIndexRef.current * (1 + rateDecimal * deltaTime / SECONDS_PER_YEAR);
        
        // actualBalance = scaledBalance * (newIndex / snapshotIndex)
        const actualBalance = scaledBalanceRef.current * (newIndex / snapshotIndexRef.current);
        
        const interestEarned = actualBalance - scaledBalanceRef.current;
        console.log('📦 Calculated from restored snapshot:', {
          deltaTime: deltaTime + 's',
          oldIndex: oldIndexRef.current.toFixed(10),
          newIndex: newIndex.toFixed(10),
          actualBalance: actualBalance.toFixed(6),
          interestEarned: interestEarned.toFixed(6),
          rateDecimal: rateDecimal.toFixed(10)
        });
        
        setDisplayBalance(actualBalance);
        setIsLoadingSnapshot(false);
      } else {
        // No time elapsed or no rate, use current balance
        const actualBalance = scaledBalanceRef.current * (oldIndexRef.current / snapshotIndexRef.current);
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
    if (isLoadingSnapshot || scaledBalanceRef.current <= 0 || snapshotIndexRef.current <= 0 || asset?.symbol === 'ETH') {
      console.log('⏸️ Skipping realtime update:', {
        isLoadingSnapshot,
        scaledBalance: scaledBalanceRef.current,
        snapshotIndex: snapshotIndexRef.current,
        rate: rateRef.current.toString(),
        symbol: asset?.symbol
      });
      // Still set displayBalance if available
      if (scaledBalanceRef.current > 0 && snapshotIndexRef.current > 0) {
        const actualBalance = scaledBalanceRef.current * (oldIndexRef.current / snapshotIndexRef.current);
        setDisplayBalance(actualBalance);
      }
      return;
    }
    
    // Clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Use rate from chain, fallback to APR if rate is 0
    const rateDecimal = (rateRef.current > BigInt(0))
      ? (Number(rateRef.current) / Number(RAY))
      : ((supplyAPR / 100) / SECONDS_PER_YEAR);
    
    if (rateDecimal <= 0) {
      console.log('⏸️ No rate available, skipping realtime update');
      const actualBalance = scaledBalanceRef.current * (oldIndexRef.current / snapshotIndexRef.current);
      setDisplayBalance(actualBalance);
      return;
    }
    
    console.log('💰 Starting realtime updates:', {
      scaledBalance: scaledBalanceRef.current,
      snapshotIndex: snapshotIndexRef.current,
      oldIndex: oldIndexRef.current,
      rate: rateRef.current.toString(),
      rateDecimal: rateDecimal.toFixed(10),
      lastUpdate: new Date(lastUpdateTimestampRef.current * 1000).toLocaleString()
    });
    
    const updateBalance = () => {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const deltaTime = currentTimestamp - lastUpdateTimestampRef.current;
      
      if (deltaTime <= 0) return;
      
      // Formula: newIndex = oldIndex * (1 + rate * deltaTime / SECONDS_PER_YEAR)
      const newIndex = oldIndexRef.current * (1 + rateDecimal * deltaTime / SECONDS_PER_YEAR);
      
      // Formula: actualBalance = scaledBalance * (newIndex / snapshotIndex)
      const actualBalance = scaledBalanceRef.current * (newIndex / snapshotIndexRef.current);
      
      const interestEarned = actualBalance - scaledBalanceRef.current;
      
      // Log every 10 seconds to avoid spam
      if (deltaTime % 10 === 0 || deltaTime === 1) {
        console.log('💰 Realtime update:', {
          deltaTime: deltaTime + 's',
          snapshotIndex: snapshotIndexRef.current.toFixed(10),
          oldIndex: oldIndexRef.current.toFixed(10),
          newIndex: newIndex.toFixed(10),
          actualBalance: actualBalance.toFixed(6),
          interestEarned: interestEarned.toFixed(6),
          scaledBalance: scaledBalanceRef.current.toFixed(6),
          rateDecimal: rateDecimal.toFixed(10)
        });
      }
      
      setDisplayBalance(actualBalance);
    };
    
    // Initial update
    updateBalance();
    
    // Update every 1 second
    intervalRef.current = setInterval(updateBalance, 1000);
    
    // Save on unmount/reload
    const handleBeforeUnload = () => {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const deltaTime = currentTimestamp - lastUpdateTimestampRef.current;
      
      if (deltaTime > 0) {
        const newIndex = oldIndexRef.current * (1 + rateDecimal * deltaTime / SECONDS_PER_YEAR);
        saveSnapshot(scaledBalanceRef.current, snapshotIndexRef.current, newIndex, rateRef.current, currentTimestamp);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Save periodically (every 30 seconds)
    const saveInterval = setInterval(() => {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const deltaTime = currentTimestamp - lastUpdateTimestampRef.current;
      
      if (deltaTime > 0) {
        const newIndex = oldIndexRef.current * (1 + rateDecimal * deltaTime / SECONDS_PER_YEAR);
        saveSnapshot(scaledBalanceRef.current, snapshotIndexRef.current, newIndex, rateRef.current, currentTimestamp);
        // Update oldIndexRef after saving to continue from this point
        oldIndexRef.current = newIndex;
        lastUpdateTimestampRef.current = currentTimestamp;
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
    const diff = Math.abs(currentPrincipal - scaledBalanceRef.current);
    if (diff > Math.max(currentPrincipal * 0.02, 0.01)) {
      console.log('🔄 New transaction detected, fetching chain snapshot:', {
        old: scaledBalanceRef.current,
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
  const suppliedPrincipal = scaledBalanceRef.current > 0 ? scaledBalanceRef.current : (supplyAsset ? parseFloat(supplyAsset.supplyPrincipal || '0') : 0);
  
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
                  <span className="font-medium">
                    {isNaN(suppliedBalance) ? '0.000000000000' : suppliedBalance.toFixed(12)} {asset.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interest earned:</span>
                  <span className="font-medium">
                    {isNaN(interestEarned) ? '0.000000000000' : interestEarned.toFixed(12)} {asset.symbol}
                    <span className="text-xs text-muted-foreground ml-2">
                      ({isNaN(interestEarnedUSD) ? '$0.000000000000' : `$${interestEarnedUSD.toFixed(12)}`})
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

