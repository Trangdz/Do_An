import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import useLendContext from '@/context/useLendContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DepositRow } from '@/components/DepositRow';
import { CONFIG } from '@/config/contracts';

export default function DepositPage() {
  const { userAssets, supplyAssets, metamaskDetails, refresh } = useLendContext();
  const [filter, setFilter] = useState<'all' | 'stable'>('all');

  const isConnected = !!metamaskDetails.currentAccount;
  const provider = metamaskDetails.provider;
  const signer = metamaskDetails.signer;

  // Load data when connected (like Dashboard)
  useEffect(() => {
    if (isConnected && provider) {
      console.log('🔄 Deposit: Auto-loading data...');
      refresh();
    }
  }, [isConnected, provider, refresh]);

  // Debug: Log userAssets to console
  useEffect(() => {
    console.log('📊 Deposit Debug - userAssets:', userAssets);
    userAssets.forEach((asset: any) => {
      console.log(`  ${asset.symbol}: balance="${asset.balance}", balanceUSD=${asset.balanceUSD}`);
    });
  }, [userAssets]);

  // Build list of ONLY assets that user has supplied AND still have balance > 0
  // This is "Your deposits" page - only show assets that have been supplied and not fully withdrawn
  // Filter out assets with effectively zero balance (< 0.000001) to hide dust amounts
  const MIN_BALANCE_THRESHOLD = 0.000001; // Consider balance < 0.000001 (1e-6) as effectively 0
  const suppliedAssetsOnly = (supplyAssets || [])
    .filter((s: any) => {
      const balance = parseFloat(s.supplyBalance || s.supplyPrincipal || '0');
      return balance >= MIN_BALANCE_THRESHOLD; // Only show assets with meaningful balance
    })
    .map((s: any) => {
      const ua = (userAssets || []).find((a: any) => a.address?.toLowerCase() === s.address?.toLowerCase());
      return {
        address: s.address,
        symbol: s.symbol,
        balance: ua?.balance || '0',
        balanceUSD: ua?.balanceUSD || 0,
      };
    });

  // Filter stablecoins if needed
  const stablecoins = ['USDC', 'DAI', 'USDT', 'TUSD', 'SUSD', 'BUSD'];
  const filteredAssets = (filter === 'stable' 
    ? suppliedAssetsOnly.filter((a: any) => stablecoins.includes(a.symbol))
    : suppliedAssetsOnly);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Deposit</h1>
          <p className="text-muted-foreground">Supply assets to earn yield</p>
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
                    <th className="py-3 px-6">Your wallet balance</th>
                    <th className="py-3 px-6">APY</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-muted-foreground">
                        You have not supplied any assets yet
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((asset: any) => (
                      <DepositRow
                        key={asset.address}
                        asset={{
                          address: asset.address,
                          symbol: asset.symbol,
                          balance: asset.balance || '0',
                          balanceUSD: asset.balanceUSD || 0
                        }}
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
    </AppLayout>
  );
}