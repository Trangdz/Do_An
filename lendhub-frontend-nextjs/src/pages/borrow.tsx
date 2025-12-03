import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import useLendContext from '@/context/useLendContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BorrowModal } from '@/components/BorrowModal';
import { DashboardBorrowRow } from '@/components/DashboardBorrowRow';
import { CONFIG } from '@/config/contracts';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/router';

export default function BorrowPage() {
  const { yourBorrows, metamaskDetails, accountData, refresh, supplySummary, borrowSummary } = useLendContext();
  const router = useRouter();
  
  // Debug: log data
  useEffect(() => {
    console.log('📊 Borrow Page Debug:', {
      yourBorrows,
      yourBorrowsCount: yourBorrows?.length || 0,
      isConnected: !!metamaskDetails.currentAccount
    });
    
    // Log each borrow
    if (yourBorrows && yourBorrows.length > 0) {
      yourBorrows.forEach((b: any) => {
        console.log('✅ Borrow found:', {
          symbol: b.symbol,
          borrowBalance: b.borrowBalance,
          borrowPrincipal: b.borrowPrincipal,
          balanceUSD: b.balanceUSD
        });
      });
    }
  }, [yourBorrows, metamaskDetails.currentAccount]);
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const { showToast } = useToast();

  const isConnected = !!metamaskDetails.currentAccount;
  const provider = metamaskDetails.provider;
  const signer = metamaskDetails.signer;

  const collateralValueFromSummary = supplySummary?.totalUSDCollateral ?? 0;
  const debtValueFromSummary = borrowSummary?.totalUSDBalance ?? 0;
  const fallbackCollateral = parseFloat(accountData.collateralUSD || '0');
  const fallbackDebt = parseFloat(accountData.debtUSD || '0');
  const collateralValue = collateralValueFromSummary > 0 ? collateralValueFromSummary : fallbackCollateral;
  const debtValue = debtValueFromSummary > 0 ? debtValueFromSummary : fallbackDebt;

  // Get borrowed assets (with balance > 0) - only show assets with debt
  const borrowedAssets = (yourBorrows || []).filter((b: any) => 
    parseFloat(b.borrowBalance || '0') > 0
  ).map((b: any) => ({
    address: b.address,
    symbol: b.symbol,
    borrowBalance: parseFloat(b.borrowBalance || '0'),
    borrowBalanceUSD: parseFloat(b.balanceUSD || '0'),
    borrowPrincipal: parseFloat(b.borrowPrincipal || '0')
  }));

  const handleBorrowClick = (asset: any) => {
    setSelectedToken(asset);
    setBorrowModalOpen(true);
  };

  const handleBorrowSuccess = () => {
    showToast({
      type: 'success',
      title: 'Borrow Successful!',
      message: 'You have successfully borrowed tokens'
    });
    setBorrowModalOpen(false);
    setSelectedToken(null);
    refresh();
  };

  // Load data when connected
  useEffect(() => {
    if (isConnected && provider) {
      console.log('🔄 Loading borrow data...');
      refresh();
    }
  }, [isConnected, provider, refresh]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Borrow</h1>
          <p className="text-muted-foreground">Borrow assets against your collateral</p>
        </div>

        {/* Your Borrows Section - Only show assets with debt > 0 */}
        {borrowedAssets.length > 0 ? (
          <Card className="bg-card/80">
            <CardHeader>
              <CardTitle>Your Borrows</CardTitle>
              <CardDescription>Your current borrowing positions</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr className="text-left border-b border-border">
                      <th className="py-3 px-6">Asset</th>
                      <th className="py-3 px-6">You borrowed</th>
                      <th className="py-3 px-6">Borrow APR</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {borrowedAssets.map((asset) => (
                      <DashboardBorrowRow
                        key={asset.address}
                        borrow={asset}
                        onRepayClick={() => {}}
                        provider={provider}
                        isConnected={isConnected}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card/80">
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <p className="text-lg mb-2">No active borrows</p>
                <p className="text-sm">You don't have any borrowing positions at the moment.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Borrow Modal */}
        {selectedToken && (
          <BorrowModal
            open={borrowModalOpen}
            onClose={() => {
              setBorrowModalOpen(false);
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
            price={parseFloat(selectedToken.priceUSD || '0')}
            poolLiquidity={selectedToken.reserveCash || '0'}
            collateralUSD={Number.isFinite(collateralValue) ? collateralValue : 0}
            debtUSD={Number.isFinite(debtValue) ? debtValue : 0}
            onSuccess={handleBorrowSuccess}
          />
        )}
      </div>
    </AppLayout>
  );
}
