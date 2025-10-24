'use client';

import React from 'react';
import { TransactionHistory } from '../../components/TransactionHistory';
import { TransactionStats } from '../../components/TransactionStats';
import useLendContext from '../../context/useLendContext';
import { PriceOracleAddress, LendingPoolAddress } from '../../addresses';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useMongoTransactions } from '../../hooks/useMongoTransactions';

export default function HistoryPage() {
  const { metamaskDetails } = useLendContext();
  const isConnected = !!metamaskDetails.currentAccount;
  const address = metamaskDetails.currentAccount;
  const provider = metamaskDetails.provider;

  // Use MongoDB transactions - show all transactions if no wallet connected
  const { transactions, isLoading, error, refetch, totalVolume, totalFees, transactionStats } = useMongoTransactions(address || 'all');

  // Helper function to safely format addresses
  const formatAddress = (addr: any) => {
    if (typeof addr === 'string' && addr.length > 10) {
      return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
    }
    return 'Unknown';
  };

  // Helper function to safely format hash
  const formatHash = (hash: any) => {
    if (typeof hash === 'string' && hash.length > 20) {
      return `${hash.slice(0, 12)}...${hash.slice(-8)}`;
    }
    return 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Navigation Header */}
      <div className="bg-white/10 backdrop-blur-xl border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-6">
              <a
                href="/"
                className="inline-flex items-center px-6 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-2xl transition-all duration-200 backdrop-blur-sm"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </a>
              <div className="h-8 w-px bg-white/30"></div>
              <h1 className="text-2xl font-bold text-white">Transaction History</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {isConnected ? (
                <div className="flex items-center space-x-3 px-6 py-3 bg-green-500/20 text-green-300 rounded-2xl backdrop-blur-sm border border-green-500/30">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-bold">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-3 px-6 py-3 bg-gray-500/20 text-gray-300 rounded-2xl backdrop-blur-sm border border-gray-500/30">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-sm font-bold">Not connected</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-3xl mb-8 shadow-2xl">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-6xl font-bold text-white mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            Transaction History
          </h1>
          <p className="text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Track all your lending, borrowing, and repayment activities with real-time updates and beautiful analytics
          </p>
        </div>

        {/* Transaction Stats will be shown in TransactionHistory component */}

        {/* Transaction History Component */}
        <div className="mb-16">
            <div className="max-w-6xl mx-auto">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="text-white/70 text-sm mb-2">Total Transactions</div>
                  <div className="text-3xl font-bold text-white">{transactions.length}</div>
                  <div className="text-white/50 text-xs mt-1">All time</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="text-white/70 text-sm mb-2">Total Volume (USD)</div>
                  <div className="text-3xl font-bold text-white">
                    ${totalVolume.toFixed(2)}
                  </div>
                  <div className="text-white/50 text-xs mt-1">USD value</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="text-white/70 text-sm mb-2">Transaction Types</div>
                  <div className="text-2xl font-bold text-white">
                    {transactionStats.totalLend + transactionStats.totalBorrow + transactionStats.totalRepay + transactionStats.totalWithdraw}
                  </div>
                  <div className="text-white/50 text-xs mt-1">
                    Lend: {transactionStats.totalLend} | Borrow: {transactionStats.totalBorrow}
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="text-white/70 text-sm mb-2">Status</div>
                  <div className="text-3xl font-bold text-white">
                    {isLoading ? '⏳' : '✅'}
                  </div>
                  <div className="text-white/50 text-xs mt-1">
                    {isLoading ? 'Loading...' : 'Live data'}
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl">
                <div className="p-6 border-b border-white/20">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Recent Transactions</h2>
                    <Button 
                      onClick={refetch}
                      disabled={isLoading}
                      className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30"
                    >
                      {isLoading ? '⏳ Refreshing...' : '🔄 Refresh'}
                    </Button>
                  </div>
                </div>
                
                <div className="p-6">
                  {isLoading ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-white/70">Loading transactions...</p>
                    </div>
                  ) : error ? (
                    <div className="text-center py-12">
                      <div className="text-red-400 mb-4">❌ Error: {error}</div>
                      <Button onClick={refetch} className="bg-red-500/20 hover:bg-red-500/30 text-red-300">
                        Try Again
                      </Button>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📝</div>
                      <h3 className="text-2xl font-bold text-white mb-2">No Transactions Yet</h3>
                      <p className="text-white/70 mb-6">Start using LendHub to see your transaction history here</p>
                      <Button 
                        onClick={() => window.location.href = '/'}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-bold"
                      >
                        Go to Dashboard
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {transactions.map((tx, index) => (
                        <div key={tx._id || index} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-200 hover:scale-[1.02]">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-4">
                              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold text-xl">
                                  {tx.type === 'Lend' ? '💰' : 
                                   tx.type === 'Withdraw' ? '⬅️' : 
                                   tx.type === 'Borrow' ? '📤' : 
                                   tx.type === 'Repay' ? '✅' : '⚡'}
                                </span>
                              </div>
                              <div>
                                <div className="text-white font-bold text-xl">{tx.type}</div>
                                <div className="text-white/70 text-sm">
                                  {tx.asset?.symbol || 'Unknown'} Transaction
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-bold text-2xl">
                                {tx.amount} {tx.asset?.symbol || 'Unknown'}
                              </div>
                              <div className="text-white/70 text-sm">
                                ${tx.amountUSD} USD
                              </div>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="bg-white/5 rounded-lg p-3">
                              <div className="text-white/60 text-xs mb-1">User Address</div>
                              <div className="text-white font-mono text-sm">
                                {formatAddress(tx.user)}
                              </div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                              <div className="text-white/60 text-xs mb-1">Block Number</div>
                              <div className="text-white font-mono text-sm">
                                #{typeof tx.blockNumber === 'number' ? tx.blockNumber.toLocaleString() : 'Unknown'}
                              </div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                              <div className="text-white/60 text-xs mb-1">Transaction Hash</div>
                              <div className="text-white font-mono text-sm">
                                {formatHash(tx.hash)}
                              </div>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between text-xs text-white/50">
                            <div>
                              {typeof tx.timestamp === 'number' ? 
                                new Date(tx.timestamp * 1000).toLocaleString() : 
                                'Unknown time'
                              }
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                              <span>Confirmed</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 hover:bg-white/15">
            <div className="flex items-center space-x-6 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Real-time Updates</h3>
            </div>
            <p className="text-white/70 text-lg leading-relaxed">
              Transactions are automatically refreshed every 15 seconds to keep you up-to-date with the latest activity and market changes.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 hover:bg-white/15">
            <div className="flex items-center space-x-6 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Local Cache</h3>
            </div>
            <p className="text-white/70 text-lg leading-relaxed">
              Last 100 transactions are cached locally for faster loading and offline access to recent history, even without internet.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 hover:bg-white/15">
            <div className="flex items-center space-x-6 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Advanced Filters</h3>
            </div>
            <p className="text-white/70 text-lg leading-relaxed">
              Filter by transaction type, search by hash, asset, or address to find exactly what you're looking for with precision.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

