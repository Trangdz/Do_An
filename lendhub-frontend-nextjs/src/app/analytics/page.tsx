'use client';

import React from 'react';
import { TransactionAnalytics } from '../../components/TransactionAnalytics';
import useLendContext from '../../context/useLendContext';
import { PriceOracleAddress, LendingPoolAddress } from '../../addresses';
import { useTransactionHistory } from '../../hooks/useTransactionHistory';

export default function AnalyticsPage() {
  const { metamaskDetails } = useLendContext();
  const isConnected = !!metamaskDetails.currentAccount;
  const address = metamaskDetails.currentAccount;
  const provider = metamaskDetails.provider;

  const { 
    transactions, 
    totalVolume, 
    totalFees 
  } = useTransactionHistory(
    provider,
    LendingPoolAddress,
    PriceOracleAddress,
    address || undefined,
    true,
    15000
  );

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
              <a
                href="/history"
                className="inline-flex items-center px-6 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-2xl transition-all duration-200 backdrop-blur-sm"
              >
                📜 History
              </a>
              <a
                href="/advanced-history"
                className="inline-flex items-center px-6 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-2xl transition-all duration-200 backdrop-blur-sm"
              >
                📊 Advanced
              </a>
              <div className="h-8 w-px bg-white/30"></div>
              <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
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
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-3xl mb-8 shadow-2xl">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-6xl font-bold text-white mb-6 bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Deep insights into transaction patterns, user behavior, and protocol activity
          </p>
        </div>

        {/* Analytics Content */}
        <div className="mb-16">
          {!isConnected ? (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-12">
                <div className="text-center">
                  <div className="w-32 h-32 bg-gradient-to-r from-gray-400/20 to-gray-600/20 rounded-full flex items-center justify-center mx-auto mb-8">
                    <svg className="w-16 h-16 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h2 className="text-4xl font-bold text-white mb-4">
                    Wallet Not Connected
                  </h2>
                  <p className="text-white/70 text-xl mb-8 leading-relaxed">
                    Connect your wallet to access detailed analytics and insights about your transaction patterns
                  </p>
                  <a
                    href="/"
                    className="inline-flex items-center px-12 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl font-bold text-lg transition-all duration-200 shadow-2xl hover:shadow-3xl transform hover:scale-105"
                  >
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Go to Dashboard
                  </a>
                </div>
              </div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-12">
                <div className="text-center">
                  <div className="w-32 h-32 bg-gradient-to-r from-blue-400/20 to-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-8">
                    <svg className="w-16 h-16 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h2 className="text-4xl font-bold text-white mb-4">
                    No Data Available
                  </h2>
                  <p className="text-white/70 text-xl mb-8 leading-relaxed">
                    Start making transactions to see detailed analytics and insights about your activity patterns
                  </p>
                  <a
                    href="/"
                    className="inline-flex items-center px-12 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl font-bold text-lg transition-all duration-200 shadow-2xl hover:shadow-3xl transform hover:scale-105"
                  >
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Start Trading
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8">
              <TransactionAnalytics
                transactions={transactions}
                totalVolume={totalVolume}
                totalFees={totalFees}
              />
            </div>
          )}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 hover:bg-white/15">
            <div className="flex items-center space-x-6 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Activity Patterns</h3>
            </div>
            <p className="text-white/70 text-lg leading-relaxed">
              Discover when you're most active, which assets you prefer, and understand your trading behavior patterns.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 hover:bg-white/15">
            <div className="flex items-center space-x-6 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Performance Metrics</h3>
            </div>
            <p className="text-white/70 text-lg leading-relaxed">
              Track your transaction volume, gas efficiency, and overall performance across different time periods.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 hover:bg-white/15">
            <div className="flex items-center space-x-6 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Data Visualization</h3>
            </div>
            <p className="text-white/70 text-lg leading-relaxed">
              Interactive charts and graphs help you visualize trends and make data-driven decisions about your DeFi activities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}






