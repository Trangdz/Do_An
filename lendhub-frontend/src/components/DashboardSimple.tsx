import React from 'react';
import { useWallet } from '../hooks/useWallet';
import { useAccountData } from '../hooks/useAccountData';
import { usePoolDataSimple } from '../hooks/usePoolDataSimple';
import { WalletButton } from './WalletButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { 
  formatCurrency, 
  formatPercentage, 
  formatNumber,
  getHealthFactorColor 
} from '../lib/math';

export function DashboardSimple() {
  const { provider, signer, address, isConnected, isCorrectNetwork } = useWallet();
  const { collateralValue, debtValue, healthFactor, isLoading: accountLoading } = useAccountData(provider, address);
  const { tokens, isLoading: poolLoading } = usePoolDataSimple(provider, signer, address);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Welcome to LendHub v2</CardTitle>
            <CardDescription>Connect your wallet to start lending and borrowing</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <WalletButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Wrong Network</CardTitle>
            <CardDescription>Please switch to Ganache network</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <WalletButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  const isHealthy = healthFactor >= 1;
  const canLiquidate = healthFactor < 1;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">L</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">LendHub v2</h1>
                <p className="text-sm text-muted-foreground">Decentralized Lending Protocol</p>
              </div>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Account Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Collateral Value */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Collateral Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {accountLoading ? (
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    formatCurrency(collateralValue)
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Threshold-weighted USD
                </p>
              </CardContent>
            </Card>

            {/* Debt Value */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Debt Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {accountLoading ? (
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    formatCurrency(debtValue)
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Total borrowed USD
                </p>
              </CardContent>
            </Card>

            {/* Health Factor */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Health Factor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getHealthFactorColor(healthFactor)}`}>
                  {accountLoading ? (
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : healthFactor === Number.MAX_SAFE_INTEGER ? (
                    '∞'
                  ) : (
                    formatNumber(healthFactor, 2)
                  )}
                </div>
                <p className={`text-sm mt-1 ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
                  {isHealthy ? 'Healthy' : 'At Risk'}
                  {canLiquidate && ' (Liquidatable)'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Assets Table */}
          <Card>
            <CardHeader>
              <CardTitle>Market Assets</CardTitle>
              <CardDescription>Available assets for lending and borrowing</CardDescription>
            </CardHeader>
            <CardContent>
              {poolLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {tokens.map((token) => (
                    <div
                      key={token.address}
                      className="p-4 rounded-lg border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-bold">
                              {token.symbol.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{token.symbol}</div>
                            <div className="text-sm text-muted-foreground">
                              {token.address}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {formatCurrency(token.price)}
                            </div>
                            <div className="text-xs text-muted-foreground">Price</div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {formatPercentage(token.supplyAPR)}
                            </div>
                            <div className="text-xs text-muted-foreground">Supply APR</div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {formatPercentage(token.borrowAPR)}
                            </div>
                            <div className="text-xs text-muted-foreground">Borrow APR</div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {formatPercentage(token.utilization * 100)}
                            </div>
                            <div className="text-xs text-muted-foreground">Utilization</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="mt-4 flex space-x-2">
                        <Button size="sm">
                          Supply {token.symbol}
                        </Button>
                        {token.symbol !== 'WETH' && (
                          <Button size="sm" variant="outline">
                            Borrow {token.symbol}
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          Withdraw {token.symbol}
                        </Button>
                        {token.symbol !== 'WETH' && (
                          <Button size="sm" variant="outline">
                            Repay {token.symbol}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
