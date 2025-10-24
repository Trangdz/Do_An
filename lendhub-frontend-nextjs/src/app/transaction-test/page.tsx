'use client';

import React, { useState, useEffect } from 'react';
import { useTransactionHistory } from '../../hooks/useTransactionHistory';
import { CONFIG } from '../../config/contracts';
import { PriceOracleAddress } from '../../addresses';
import useLendContext from '../../context/useLendContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function TransactionTestPage() {
  const { metamaskDetails } = useLendContext();
  const [isConnected, setIsConnected] = useState(false);
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  
  const {
    transactions,
    isLoading,
    error,
    clearHistory,
    refetch,
    totalVolume,
    totalFees,
    transactionStats
  } = useTransactionHistory(
    metamaskDetails.provider,
    CONFIG.LENDING_POOL,
    PriceOracleAddress,
    metamaskDetails.currentAccount,
    true, // autoRefresh
    5000 // refresh every 5 seconds
  );

  useEffect(() => {
    setIsConnected(!!metamaskDetails.currentAccount);
  }, [metamaskDetails.currentAccount]);

  useEffect(() => {
    const getCurrentBlock = async () => {
      if (metamaskDetails.provider) {
        try {
          const block = await metamaskDetails.provider.getBlockNumber();
          setCurrentBlock(block);
        } catch (err) {
          console.error('Failed to get current block:', err);
        }
      }
    };

    if (isConnected) {
      getCurrentBlock();
      const interval = setInterval(getCurrentBlock, 10000); // Update every 10 seconds
      return () => clearInterval(interval);
    }
  }, [isConnected, metamaskDetails.provider]);

  const handleClearHistory = () => {
    clearHistory();
    // Also clear localStorage
    localStorage.removeItem('lendhub_transaction_history');
    localStorage.removeItem('lendhub_transaction_history_lastBlock');
    localStorage.removeItem('lendhub_transaction_history_version');
    window.location.reload();
  };

  const handleRefetch = async () => {
    try {
      await refetch();
    } catch (err) {
      console.error('Refetch failed:', err);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">🔍</span>
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Transaction Test
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Please connect your wallet to test transaction detection
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">
              This page tests real-time transaction detection from the blockchain
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🔍 Transaction Detection Test
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real-time monitoring of blockchain transactions from LendHub contracts
            </p>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-700">Total Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{transactions.length}</div>
                <p className="text-sm text-green-600/70">Detected</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-700">Total Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">${totalVolume.toFixed(2)}</div>
                <p className="text-sm text-blue-600/70">USD Value</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-purple-700">Total Fees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">${totalFees.toFixed(4)}</div>
                <p className="text-sm text-purple-600/70">Gas Fees</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-orange-700">Current Block</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{currentBlock.toLocaleString()}</div>
                <p className="text-sm text-orange-600/70">Blockchain</p>
              </CardContent>
            </Card>
          </div>

          {/* Transaction Stats */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">Transaction Statistics</CardTitle>
              <CardDescription className="text-gray-600">
                Breakdown by transaction type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{transactionStats.totalLend}</div>
                  <div className="text-sm text-green-700">Lend</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{transactionStats.totalWithdraw}</div>
                  <div className="text-sm text-blue-700">Withdraw</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{transactionStats.totalBorrow}</div>
                  <div className="text-sm text-yellow-700">Borrow</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{transactionStats.totalRepay}</div>
                  <div className="text-sm text-purple-700">Repay</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{transactionStats.totalLiquidate}</div>
                  <div className="text-sm text-red-700">Liquidate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">Test Controls</CardTitle>
              <CardDescription className="text-gray-600">
                Manual controls for testing transaction detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={handleRefetch}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? '🔄 Refreshing...' : '🔄 Manual Refresh'}
                </Button>
                
                <Button 
                  onClick={handleClearHistory}
                  className="bg-red-600 hover:bg-red-700"
                >
                  🗑️ Clear History
                </Button>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className={`w-3 h-3 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span>{isLoading ? 'Loading...' : 'Ready'}</span>
                </div>
              </div>
              
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-red-800 font-medium">Error:</div>
                  <div className="text-red-700 text-sm">{error}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">Recent Transactions</CardTitle>
              <CardDescription className="text-gray-600">
                Latest transactions detected from the blockchain
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🔍</div>
                  <div className="text-lg text-gray-600 mb-2">No transactions detected yet</div>
                  <div className="text-sm text-gray-500">
                    Make some transactions on the main dashboard to see them appear here
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.slice(0, 10).map((tx, index) => (
                    <div key={tx.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${
                            tx.type === 'Lend' ? 'bg-green-500' :
                            tx.type === 'Withdraw' ? 'bg-blue-500' :
                            tx.type === 'Borrow' ? 'bg-yellow-500' :
                            tx.type === 'Repay' ? 'bg-purple-500' :
                            'bg-red-500'
                          }`}></div>
                          <div>
                            <div className="font-medium">{tx.type}</div>
                            <div className="text-sm text-gray-600">{tx.assetSymbol}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${tx.amountUSD}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(tx.timestamp * 1000).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500 font-mono">
                        {tx.hash.slice(0, 20)}...{tx.hash.slice(-20)}
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
              🔍 Real-time transaction monitoring • Auto-refresh every 5 seconds
            </p>
            <p className="text-xs mt-2">
              Connected to Ganache • Pool: {CONFIG.LENDING_POOL.slice(0, 10)}...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

