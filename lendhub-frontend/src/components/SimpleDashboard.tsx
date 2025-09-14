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
  formatNumber
} from '../lib/math';

export function SimpleDashboard() {
  const { provider, signer, address, isConnected, isCorrectNetwork } = useWallet();
  const { collateralValue, debtValue, healthFactor, isLoading: accountLoading } = useAccountData(provider, address);
  const { tokens, isLoading: poolLoading } = usePoolDataSimple(provider, signer, address);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">L</span>
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Welcome to LendHub v2
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Connect your wallet to start earning with DeFi lending
            </CardDescription>
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
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-red-200 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
              <span className="text-white text-2xl">⚠️</span>
            </div>
            <CardTitle className="text-2xl font-bold text-red-600">
              Wrong Network
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Please switch to Ganache network to continue
            </CardDescription>
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
  const totalSupply = tokens.reduce((sum, token) => sum + token.totalSupply, 0);
  const totalBorrow = tokens.reduce((sum, token) => sum + token.totalBorrow, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  LendHub v2
                </h1>
                <p className="text-sm text-gray-600">Decentralized Lending Protocol</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <div className="text-sm text-gray-600">Connected to</div>
                <div className="font-medium text-green-600">Ganache Network</div>
              </div>
              <WalletButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center py-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Your DeFi Dashboard
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Manage your lending positions, monitor health factors, and explore market opportunities
            </p>
          </div>

          {/* Account Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Collateral Value */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                    <span className="text-white text-sm">💰</span>
                  </div>
                  <CardTitle className="text-sm font-medium text-green-700">
                    Collateral Value
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {accountLoading ? (
                    <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    formatCurrency(collateralValue)
                  )}
                </div>
                <p className="text-sm text-green-600/70">
                  Threshold-weighted USD
                </p>
              </CardContent>
            </Card>

            {/* Debt Value */}
            <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
                    <span className="text-white text-sm">💸</span>
                  </div>
                  <CardTitle className="text-sm font-medium text-red-700">
                    Debt Value
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600 mb-1">
                  {accountLoading ? (
                    <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    formatCurrency(debtValue)
                  )}
                </div>
                <p className="text-sm text-red-600/70">
                  Total borrowed USD
                </p>
              </CardContent>
            </Card>

            {/* Health Factor */}
            <Card className={`shadow-lg hover:shadow-xl transition-all duration-300 ${
              isHealthy 
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
                : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isHealthy ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    <span className="text-white text-sm">
                      {isHealthy ? '✅' : '⚠️'}
                    </span>
                  </div>
                  <CardTitle className={`text-sm font-medium ${
                    isHealthy ? 'text-green-700' : 'text-red-700'
                  }`}>
                    Health Factor
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold mb-1 ${
                  isHealthy ? 'text-green-600' : 'text-red-600'
                }`}>
                  {accountLoading ? (
                    <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : healthFactor === Number.MAX_SAFE_INTEGER ? (
                    '∞'
                  ) : (
                    formatNumber(healthFactor, 2)
                  )}
                </div>
                <p className={`text-sm ${
                  isHealthy ? 'text-green-600/70' : 'text-red-600/70'
                }`}>
                  {isHealthy ? 'Healthy Position' : 'At Risk'}
                  {canLiquidate && ' (Liquidatable)'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Pool Overview */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900">Pool Overview</CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    Total liquidity and borrowing across all assets
                  </CardDescription>
                </div>
                <div className="flex space-x-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-green-600">{formatCurrency(totalSupply)}</div>
                    <div className="text-gray-500">Total Supply</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-blue-600">{formatCurrency(totalBorrow)}</div>
                    <div className="text-gray-500">Total Borrow</div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Market Assets */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">Market Assets</CardTitle>
              <CardDescription className="text-gray-600">
                Available assets for lending and borrowing with real-time rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {poolLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading market data...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {tokens.map((token, index) => (
                    <div
                      key={token.address}
                      className="group p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 bg-white/50 backdrop-blur-sm"
                    >
                      {/* Token Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                            index === 0 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                            index === 1 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                            'bg-gradient-to-r from-purple-500 to-pink-500'
                          }`}>
                            {token.symbol.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-lg text-gray-900">{token.symbol}</div>
                            <div className="text-sm text-gray-500 font-mono">
                              {token.address.slice(0, 6)}...{token.address.slice(-4)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            {formatCurrency(token.price)}
                          </div>
                          <div className="text-sm text-gray-500">Current Price</div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="text-center p-3 rounded-lg bg-blue-50">
                          <div className="text-lg font-bold text-blue-600">
                            {formatPercentage(token.supplyAPR)}
                          </div>
                          <div className="text-xs text-blue-600/70">Supply APR</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-green-50">
                          <div className="text-lg font-bold text-green-600">
                            {formatPercentage(token.borrowAPR)}
                          </div>
                          <div className="text-xs text-green-600/70">Borrow APR</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-purple-50">
                          <div className="text-lg font-bold text-purple-600">
                            {formatPercentage(token.utilization * 100)}
                          </div>
                          <div className="text-xs text-purple-600/70">Utilization</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-gray-50">
                          <div className="text-lg font-bold text-gray-600">
                            {formatNumber(token.availableLiquidity, 0)}
                          </div>
                          <div className="text-xs text-gray-600/70">Available</div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg">
                            💰 Supply {token.symbol}
                          </Button>
                          {token.symbol !== 'WETH' ? (
                            <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg">
                              💸 Borrow {token.symbol}
                            </Button>
                          ) : (
                            <Button disabled className="w-full bg-gray-300 text-gray-500">
                              💸 Not Borrowable
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" className="w-full border-blue-200 text-blue-600 hover:bg-blue-50">
                            📤 Withdraw
                          </Button>
                          {token.symbol !== 'WETH' ? (
                            <Button variant="outline" className="w-full border-green-200 text-green-600 hover:bg-green-50">
                              💳 Repay
                            </Button>
                          ) : (
                            <Button disabled variant="outline" className="w-full border-gray-200 text-gray-400">
                              💳 N/A
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">
              Built with ❤️ using React, TypeScript, and Tailwind CSS
            </p>
            <p className="text-xs mt-2">
              Connected to Ganache • Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
