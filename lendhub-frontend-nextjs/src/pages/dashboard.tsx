
import { AppLayout } from '@/components/layout/AppLayout';
import useLendContext from '@/context/useLendContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatNumber } from '@/lib/math';
import { CONFIG } from '@/config/contracts';
import { WithdrawModal } from '@/components/WithdrawModal';
import { RepayModal } from '@/components/RepayModal';
import { LendModal } from '@/components/LendModal';
import { WrapEthModal } from '@/components/WrapEthModal';
import { BorrowModal } from '@/components/BorrowModal';
import { DashboardDepositRow } from '@/components/DashboardDepositRow';
import { DashboardBorrowRow } from '@/components/DashboardBorrowRow';
import { LENDXRewardCard } from '@/components/LENDXRewardCard';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/Toast';

export default function DashboardPage() {
  const { 
    userAssets, 
    supplyAssets, 
    yourBorrows, 
    assetsToBorrow,
    accountData, 
    metamaskDetails, 
    refresh 
  } = useLendContext();
  
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [repayModalOpen, setRepayModalOpen] = useState(false);
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [lendModalOpen, setLendModalOpen] = useState(false);
  const [wrapEthModalOpen, setWrapEthModalOpen] = useState(false);
  const { showToast } = useToast();

  const isConnected = !!metamaskDetails.currentAccount;
  const provider = metamaskDetails.provider;
  const signer = metamaskDetails.signer;

  const rawCollateralValue = Number(accountData.collateralUSD ?? '0');
  const rawDebtValue = Number(accountData.debtUSD ?? '0');

  const fallbackCollateralValue = useMemo(() => {
    if (!supplyAssets?.length) return 0;
    return supplyAssets.reduce((total: number, asset: any) => {
      if (!asset?.isCollateral) return total;
      const value = Number(asset?.collateralUSD ?? asset?.balanceUSD ?? 0);
      return total + (Number.isFinite(value) ? value : 0);
    }, 0);
  }, [supplyAssets]);

  const fallbackDebtValue = useMemo(() => {
    if (!yourBorrows?.length) return 0;
    return yourBorrows.reduce((total: number, borrow: any) => {
      const value = Number(borrow?.balanceUSD ?? 0);
      return total + (Number.isFinite(value) ? value : 0);
    }, 0);
  }, [yourBorrows]);

  const collateralValue = Number.isFinite(rawCollateralValue) && rawCollateralValue > 0
    ? rawCollateralValue
    : fallbackCollateralValue;

  const debtValue = Number.isFinite(rawDebtValue) && rawDebtValue > 0
    ? rawDebtValue
    : fallbackDebtValue;

  const healthFactor = useMemo(() => {
    const rawHealthFactor = Number(accountData.healthFactor ?? '0');
    const canUseRawHealth =
      Number.isFinite(rawHealthFactor) &&
      Number.isFinite(rawCollateralValue) && rawCollateralValue > 0 &&
      Number.isFinite(rawDebtValue) && rawDebtValue > 0;

    if (canUseRawHealth) {
      return rawHealthFactor;
    }

    if (debtValue === 0) {
      return Number.POSITIVE_INFINITY;
    }

    if (collateralValue === 0) {
      return 0;
    }

    return collateralValue / debtValue;
  }, [accountData.healthFactor, collateralValue, debtValue, rawCollateralValue, rawDebtValue]);

  const isHealthy = healthFactor === Number.POSITIVE_INFINITY || healthFactor >= 1;

  // Debounce refresh to avoid circuit breaker
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastRefreshRef = useRef(0);
  
  const safeRefresh = useCallback(async () => {
    const now = Date.now();
    // Prevent refresh if called within last 5 seconds
    if (now - lastRefreshRef.current < 5000) {
      console.log('⏸️ Refresh skipped - too soon after last refresh');
      return;
    }
    
    if (isRefreshing) {
      console.log('⏸️ Refresh already in progress');
      return;
    }
    
    setIsRefreshing(true);
    lastRefreshRef.current = now;
    
    try {
      await refresh();
    } catch (error) {
      // Circuit breaker errors are handled in refresh()
      console.warn('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  // Load data when connected (like SimpleDashboard)
  useEffect(() => {
    if (isConnected && provider) {
      console.log('🔄 Dashboard: Auto-loading data...');
      safeRefresh();
    }
  }, [isConnected, provider, safeRefresh]);

  // Auto-refresh balance with interest every 30 seconds
  useEffect(() => {
    if (!isConnected || !provider) return;
    
    const interval = setInterval(() => {
      console.log('🔄 Dashboard: Auto-refreshing balance...');
      safeRefresh();
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [isConnected, provider, safeRefresh]);

  // Debug: Log data to console
  useEffect(() => {
    console.log('📊 Dashboard Debug:', {
      supplyAssetsCount: supplyAssets.length,
      supplyAssets: supplyAssets.map((s: any) => ({
        symbol: s.symbol,
        address: s.address,
        supplyBalance: s.supplyBalance,
        supplyPrincipal: s.supplyPrincipal,
        balanceUSD: s.balanceUSD,
      })),
      yourBorrowsCount: yourBorrows.length,
      yourBorrows: yourBorrows.map((b: any) => ({
        symbol: b.symbol,
        address: b.address,
        borrowBalance: b.borrowBalance,
        borrowPrincipal: b.borrowPrincipal,
        balanceUSD: b.balanceUSD,
      })),
      userAssetsCount: userAssets.length,
    });
  }, [supplyAssets, yourBorrows, userAssets]);

  // Get all assets to display (from userAssets - these have real wallet balances loaded from contract)
  // If userAssets is empty, still use it so we show loading state instead of fake 0 balances
  const allAssets = userAssets.length > 0 
    ? userAssets 
    : CONFIG.TOKENS.map((token: any) => ({
        ...token,
        address: token.address || '0x0000000000000000000000000000000000000000',
        balance: '0', // Will be loaded from wallet
        balanceUSD: '0',
        priceUSD: '0',
      }));

  // Get deposits with supply data - show ALL assets, even with 0 balance
  const deposits = allAssets
    .map((asset: any) => {
      // Find matching supply in supplyAssets
      const supply = supplyAssets.find((s: any) => 
        s.address && asset.address && 
        s.address.toLowerCase() === asset.address.toLowerCase()
      );
      
      // Get wallet balance (from userAssets) - this is what was deployed/initial balance
      // Same logic as SimpleDashboard: userBalance from wallet, userSupply from pool
      const userBalance = parseFloat(asset.balance || '0');
      const userBalanceUSD = parseFloat(asset.balanceUSD || '0') || (userBalance * parseFloat(asset.priceUSD || '0'));
      
      // Get supply balance in pool (with interest if available), default to 0
      const supplyBalance = supply 
        ? parseFloat(supply.supplyBalance || supply.supplyPrincipal || '0')
        : 0;
      
      const supplyBalanceUSD = supply ? (supply.balanceUSD || 0) : 0;
      
      return {
        address: asset.address,
        symbol: asset.symbol || asset.name?.substring(0, 4).toUpperCase() || 'Unknown',
        name: asset.name || asset.symbol || 'Unknown',
        decimals: asset.decimals || 18,
        // Show wallet balance (deployed amount) as "Current balance" - like SimpleDashboard
        walletBalance: userBalance,
        walletBalanceUSD: userBalanceUSD,
        // Supply balance in pool (for reference)
        supplyBalance: supplyBalance,
        supplyBalanceUSD: supplyBalanceUSD,
        price: asset.price || parseFloat(asset.priceUSD || '0'),
        priceUSD: asset.priceUSD || '0',
        liquidationThreshold: asset.liquidationThreshold || 8000,
        availableLiquidity: asset.availableLiquidity || '0',
      };
    })
    // Filter out deposits with effectively zero balance (< 0.000001) to hide dust amounts
    .filter((deposit: any) => {
      const MIN_BALANCE_THRESHOLD = 0.000001; // Consider balance < 0.000001 (1e-6) as effectively 0
      return deposit.supplyBalance >= MIN_BALANCE_THRESHOLD; // Only show deposits with meaningful balance
    });

  // Get assets to borrow (market mode) with available liquidity
  const borrows = (assetsToBorrow || [])
    .filter((cfg: any) => cfg && cfg.address)
    .map((cfg: any) => {
      const asset = allAssets.find((a: any) => a.address && a.address.toLowerCase() === cfg.address.toLowerCase());
      const symbol = asset?.symbol || cfg.symbol || 'ASSET';
      const decimals = asset?.decimals || 18;
      const available = parseFloat(cfg.reserveCash || cfg.availableLiquidity || '0');
      return {
        address: cfg.address,
        symbol,
        decimals,
        available,
        price: parseFloat(asset?.priceUSD || '0'),
        priceUSD: asset?.priceUSD || '0',
      };
    });

  const handleWithdrawClick = (token: any) => {
    setSelectedToken(token);
    setWithdrawModalOpen(true);
  };

  const handleRepayClick = (token: any) => {
    setSelectedToken(token);
    setRepayModalOpen(true);
  };

  const handleBorrowClick = (token: any) => {
    setSelectedToken(token);
    setBorrowModalOpen(true);
  };

  const handleSupplyClick = (token: any) => {
    setSelectedToken(token);
    if (token.symbol === 'ETH') {
      setWrapEthModalOpen(true);
    } else {
      setLendModalOpen(true);
    }
  };

  const handleWithdrawSuccess = () => {
    showToast({
      type: 'success',
      title: 'Withdraw Successful!',
      message: 'Your tokens have been withdrawn successfully'
    });
    setWithdrawModalOpen(false);
    setSelectedToken(null);
    refresh();
  };

  const handleRepaySuccess = () => {
    showToast({
      type: 'success',
      title: 'Repay Successful!',
      message: 'Your debt has been repaid successfully'
    });
    setRepayModalOpen(false);
    setSelectedToken(null);
    refresh();
  };

  const handleLendSuccess = () => {
    showToast({ type: 'success', title: 'Supply Successful!', message: 'Your tokens have been supplied successfully' });
    setLendModalOpen(false);
    setSelectedToken(null);
    refresh();
  };

  const handleWrapEthSuccess = () => {
    showToast({ type: 'success', title: 'ETH Wrapped!', message: 'ETH has been successfully wrapped to WETH' });
    setWrapEthModalOpen(false);
    refresh();
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard</h2>
            <p className="text-muted-foreground">Overview of your deposits, borrows and health</p>
          </div>
          {isConnected && (
            <Button onClick={refresh} variant="outline" size="sm">
              🔄 Refresh
            </Button>
          )}
        </div>

        {/* Account Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Collateral Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {formatCurrency(collateralValue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Threshold-weighted USD</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Debt Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {formatCurrency(debtValue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total borrowed USD</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Health Factor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
                {healthFactor === Number.MAX_SAFE_INTEGER ? '∞' : formatNumber(healthFactor, 2)}
              </div>
              <p className={`text-xs ${isHealthy ? 'text-green-600/70' : 'text-red-600/70'}`}>
                {isHealthy ? 'Healthy' : 'At Risk'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* LENDX Token Rewards */}
        {isConnected && (
          <div className="space-y-4">
            <LENDXRewardCard />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Your Deposits */}
          <Card className="bg-card/80">
            <CardHeader>
              <CardTitle className="text-foreground">Assets to supply</CardTitle>
              <CardDescription className="text-muted-foreground">Supply assets to earn yield</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr className="text-left border-b border-border">
                      <th className="py-3 px-2">Asset</th>
                      <th className="py-3 px-2">Available</th>
                      <th className="py-3 px-2">APY</th>
                      <th className="py-3 px-2">Collateral</th>
                      <th className="py-3 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {!isConnected ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          Please connect your wallet to view deposits
                        </td>
                      </tr>
                    ) : userAssets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            <span>Loading assets...</span>
                          </div>
                        </td>
                      </tr>
                    ) : deposits.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          No assets available
                        </td>
                      </tr>
                    ) : (
                      deposits.map((deposit: any) => (
                        <DashboardDepositRow
                          key={deposit.address}
                          deposit={deposit}
                          onWithdrawClick={() => handleSupplyClick(deposit)}
                          provider={provider}
                          signer={signer}
                          isConnected={isConnected}
                          onRefresh={refresh}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Your Borrows */}
          <Card className="bg-card/80">
            <CardHeader>
              <CardTitle className="text-foreground">Assets to borrow</CardTitle>
              <CardDescription className="text-muted-foreground">Borrow assets against your collateral</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr className="text-left border-b border-border">
                      <th className="py-3 px-2">Asset</th>
                      <th className="py-3 px-2">Current balance</th>
                      <th className="py-3 px-2">APR</th>
                      <th className="py-3 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {!isConnected ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          Please connect your wallet to view borrows
                        </td>
                      </tr>
                    ) : userAssets.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            <span>Loading assets...</span>
                          </div>
                        </td>
                      </tr>
                    ) : borrows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          No assets available
                        </td>
                      </tr>
                    ) : (
                      borrows.map((borrow: any) => (
                        <DashboardBorrowRow
                          key={borrow.address}
                          borrow={borrow}
                          onRepayClick={() => handleBorrowClick(borrow)}
                          provider={provider}
                          isConnected={isConnected}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lend Modal */}
        {selectedToken && (
          <LendModal
            open={lendModalOpen}
            onClose={() => { setLendModalOpen(false); setSelectedToken(null); }}
            token={{
              address: selectedToken.address,
              symbol: selectedToken.symbol,
              decimals: selectedToken.decimals || 18,
              userBalance: selectedToken.walletBalance || 0
            }}
            poolAddress={CONFIG.LENDING_POOL}
            signer={signer}
            provider={provider}
            onSuccess={handleLendSuccess}
            onWrapEth={() => { setLendModalOpen(false); setWrapEthModalOpen(true); }}
            simulatedBalance={selectedToken.walletBalance || 0}
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

        {/* Withdraw Modal */}
        {selectedToken && (
          <WithdrawModal
            open={withdrawModalOpen}
            onClose={() => {
              setWithdrawModalOpen(false);
              setSelectedToken(null);
            }}
            token={{
              address: selectedToken.address,
              symbol: selectedToken.symbol,
              decimals: selectedToken.decimals || 18
            }}
            poolAddress={CONFIG.LENDING_POOL}
            signer={signer}
            provider={provider}
            userSupply={selectedToken.supplyBalance?.toString() || '0'}
            poolLiquidity={selectedToken.availableLiquidity || '0'}
            price={selectedToken.price || parseFloat(selectedToken.priceUSD || '0')}
            liquidationThreshold={selectedToken.liquidationThreshold || 8000}
            collateralUSD={collateralValue}
            debtUSD={debtValue}
            onSuccess={handleWithdrawSuccess}
          />
        )}

        {/* Repay/Borrow Modal */}
        {selectedToken && (
          <RepayModal
            open={repayModalOpen}
            onClose={() => {
              setRepayModalOpen(false);
              setSelectedToken(null);
            }}
            token={{
              address: selectedToken.address,
              symbol: selectedToken.symbol,
              decimals: selectedToken.decimals || 18
            }}
            poolAddress={CONFIG.LENDING_POOL}
            signer={signer}
            provider={provider}
            userDebt={selectedToken.borrowBalance?.toString() || '0'}
            price={selectedToken.price || parseFloat(selectedToken.priceUSD || '0')}
            onSuccess={handleRepaySuccess}
          />
        )}

        {/* Borrow Modal */}
        {selectedToken && (
          <BorrowModal
            open={borrowModalOpen}
            onClose={() => { setBorrowModalOpen(false); setSelectedToken(null); }}
            token={{
              address: selectedToken.address,
              symbol: selectedToken.symbol,
              decimals: selectedToken.decimals || 18
            }}
            poolAddress={CONFIG.LENDING_POOL}
            signer={signer}
            provider={provider}
            price={selectedToken.price || parseFloat(selectedToken.priceUSD || '0')}
            poolLiquidity={selectedToken.available?.toString() || selectedToken.availableLiquidity || '0'}
            collateralUSD={collateralValue}
            debtUSD={debtValue}
            onSuccess={refresh}
          />
        )}
      </div>
    </AppLayout>
  );
}