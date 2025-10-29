import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import useLendContext from '@/context/useLendContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BorrowModal } from '@/components/BorrowModal';
import { BorrowRow } from '@/components/BorrowRow';
import { CONFIG } from '@/config/contracts';
import { useToast } from '@/components/ui/Toast';

export default function BorrowPage() {
  const { assetsToBorrow, metamaskDetails, accountData, refresh } = useLendContext();
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'stable'>('all');
  const { showToast } = useToast();

  const isConnected = !!metamaskDetails.currentAccount;
  const provider = metamaskDetails.provider;
  const signer = metamaskDetails.signer;

  const collateralValue = parseFloat(accountData.collateralUSD || '0');
  const debtValue = parseFloat(accountData.debtUSD || '0');

  // Filter stablecoins
  const stablecoins = ['USDC', 'DAI', 'USDT', 'TUSD', 'SUSD', 'BUSD'];
  const filteredAssets = filter === 'stable' 
    ? (assetsToBorrow || []).filter((a: any) => stablecoins.includes(a.symbol))
    : (assetsToBorrow || []);

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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Borrow</h1>
          <p className="text-muted-foreground">Borrow assets against your collateral</p>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'stable' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('stable')}
          >
            Stable Coins
          </Button>
        </div>

        <Card className="bg-card/80">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr className="text-left border-b border-border">
                    <th className="py-3 px-6">Asset</th>
                    <th className="py-3 px-6">
                      Available to borrow
                      <span className="text-xs text-muted-foreground block">(Based on your collateral)</span>
                    </th>
                    <th className="py-3 px-6">Variable APR</th>
                    <th className="py-3 px-6">Stable APR</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No assets available to borrow
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((asset: any) => (
                      <BorrowRow
                        key={asset.address}
                        asset={{
                          address: asset.address,
                          symbol: asset.symbol,
                          reserveCash: asset.reserveCash || '0'
                        }}
                        onClick={() => handleBorrowClick(asset)}
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
            collateralUSD={collateralValue}
            debtUSD={debtValue}
            onSuccess={handleBorrowSuccess}
          />
        )}
      </div>
    </AppLayout>
  );
}