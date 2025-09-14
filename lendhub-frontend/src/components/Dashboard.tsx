import React from 'react';
import { useWallet } from '../hooks/useWallet';
import { useAccountData } from '../hooks/useAccountData';
import { usePriceChart } from '../hooks/usePriceChart';
import { usePoolDataSimple } from '../hooks/usePoolDataSimple';
import { WalletButton } from './WalletButton';
import { CONFIG } from '../config/contracts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { 
  formatCurrency, 
  formatPercentage, 
  formatNumber,
  getHealthFactorColor 
} from '../lib/math';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function Dashboard() {
  const { provider, signer, address, isConnected, isCorrectNetwork } = useWallet();
  const { collateralValue, debtValue, healthFactor, isLoading: accountLoading } = useAccountData(provider, address);
  const { data: chartData, isLoading: chartLoading } = usePriceChart(provider);
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

          {/* Price Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Live Price Chart</CardTitle>
              <CardDescription>Real-time token prices (updates every 3s)</CardDescription>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No price data available
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        domain={['dataMin * 0.95', 'dataMax * 1.05']}
                      />
                      <Tooltip 
                        formatter={(value, name) => [formatCurrency(Number(value)), name]}
                        labelFormatter={(label) => `Time: ${label}`}
                      />
                      <Legend />
                      {CONFIG.TOKENS.map((token, index) => (
                        <Line
                          key={token.symbol}
                          type="monotone"
                          dataKey={token.symbol}
                          stroke={`hsl(${index * 120}, 70%, 50%)`}
                          strokeWidth={2}
                          dot={false}
                          connectNulls={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

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
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium">Asset</th>
                        <th className="text-right py-3 px-2 font-medium">Price ($)</th>
                        <th className="text-right py-3 px-2 font-medium">U (%)</th>
                        <th className="text-right py-3 px-2 font-medium">Supply APR</th>
                        <th className="text-right py-3 px-2 font-medium">Borrow APR</th>
                        <th className="text-right py-3 px-2 font-medium">You Supply</th>
                        <th className="text-right py-3 px-2 font-medium">You Debt</th>
                        <th className="text-center py-3 px-2 font-medium">Borrowable?</th>
                        <th className="text-right py-3 px-2 font-medium">Max Borrow</th>
                        <th className="text-center py-3 px-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokens.map((token) => (
                        <tr key={token.address} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-bold">
                                  {token.symbol.charAt(0)}
                                </span>
                              </div>
                              <span className="font-medium">{token.symbol}</span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-2 font-mono">
                            {formatCurrency(token.price)}
                          </td>
                          <td className="text-right py-3 px-2">
                            {formatPercentage(token.utilization * 100)}
                          </td>
                          <td className="text-right py-3 px-2">
                            {formatPercentage(token.supplyAPR)}
                          </td>
                          <td className="text-right py-3 px-2">
                            {formatPercentage(token.borrowAPR)}
                          </td>
                          <td className="text-right py-3 px-2">
                            {formatNumber(0)} {/* TODO: Get from user data */}
                          </td>
                          <td className="text-right py-3 px-2">
                            {formatNumber(0)} {/* TODO: Get from user data */}
                          </td>
                          <td className="text-center py-3 px-2">
                            <span className={`px-2 py-1 text-xs rounded ${
                              token.symbol === 'WETH' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {token.symbol === 'WETH' ? 'No' : 'Yes'}
                            </span>
                          </td>
                          <td className="text-right py-3 px-2 font-mono">
                            {formatNumber(token.availableLiquidity, 2)}
                          </td>
                          <td className="text-center py-3 px-2">
                            <div className="flex space-x-1">
                              <Button size="sm" variant="outline">
                                Lend
                              </Button>
                              {token.symbol !== 'WETH' && (
                                <Button size="sm" variant="outline">
                                  Borrow
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common operations for each asset</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tokens.map((token) => (
                  <div key={token.address} className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold">
                          {token.symbol.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{token.symbol}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(token.price)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Button className="w-full" size="sm">
                        Supply {token.symbol}
                      </Button>
                      {token.symbol !== 'WETH' && (
                        <Button className="w-full" size="sm" variant="outline">
                          Borrow {token.symbol}
                        </Button>
                      )}
                      <Button className="w-full" size="sm" variant="outline">
                        Withdraw {token.symbol}
                      </Button>
                      {token.symbol !== 'WETH' && (
                        <Button className="w-full" size="sm" variant="outline">
                          Repay {token.symbol}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
