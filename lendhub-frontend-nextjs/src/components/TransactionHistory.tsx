import React, { useState } from 'react';
import { useTransactionHistory, Transaction } from '../hooks/useTransactionHistory';

interface TransactionHistoryProps {
  provider: any;
  poolAddress: string;
  oracleAddress: string;
  userAddress?: string;
}

const TYPE_COLORS: Record<Transaction['type'], string> = {
  Lend: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Withdraw: 'bg-blue-50 text-blue-700 border-blue-200',
  Borrow: 'bg-amber-50 text-amber-700 border-amber-200',
  Repay: 'bg-purple-50 text-purple-700 border-purple-200',
  Liquidate: 'bg-red-50 text-red-700 border-red-200'
};

const TYPE_ICONS: Record<Transaction['type'], string> = {
  Lend: '💰',
  Withdraw: '⬅️',
  Borrow: '📤',
  Repay: '✅',
  Liquidate: '⚡'
};

export function TransactionHistory({ provider, poolAddress, oracleAddress, userAddress }: TransactionHistoryProps) {
  const [filterType, setFilterType] = useState<Transaction['type'] | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { transactions, isLoading, error, clearHistory, refetch } = useTransactionHistory(
    provider,
    poolAddress,
    oracleAddress,
    userAddress,
    true, // Auto-refresh
    15000 // Refresh every 15 seconds
  );

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesType = filterType === 'All' || tx.type === filterType;
    const matchesSearch = searchQuery === '' || 
      tx.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.assetSymbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.user.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesType && matchesSearch;
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (num === 0) return '0';
    if (num < 0.0001) return num.toExponential(4);
    if (num < 1) return num.toFixed(6);
    if (num < 1000) return num.toFixed(4);
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  if (isLoading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading transaction history...</p>
        </div>
      </div>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="font-semibold">Error loading transactions</p>
          <p className="text-sm mt-2">{error}</p>
          <button
            onClick={refetch}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-8 py-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Transaction History</h2>
              <p className="text-gray-600 text-lg">
                {userAddress ? 'Your transaction history' : 'All protocol transactions'}
                {' • '}
                <span className="font-bold text-blue-600 text-xl">{filteredTransactions.length}</span> transactions
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={refetch}
              disabled={isLoading}
              className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
              ) : (
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Refresh
            </button>
            <button
              onClick={clearHistory}
              className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-600 rounded-xl hover:from-red-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Filters */}
        <div className="mb-8 space-y-6">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by hash, asset, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-5 text-lg border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50 backdrop-blur-sm transition-all duration-200 placeholder-gray-500 shadow-sm hover:shadow-md"
            />
          </div>

          {/* Type filter */}
          <div className="flex flex-wrap gap-3">
            {(['All', 'Lend', 'Withdraw', 'Borrow', 'Repay', 'Liquidate'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`inline-flex items-center px-8 py-4 rounded-2xl font-bold text-sm transition-all duration-200 transform hover:scale-105 ${
                  filterType === type
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-lg'
                }`}
              >
                {type !== 'All' && (
                  <span className="mr-3 text-xl">{TYPE_ICONS[type]}</span>
                )}
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction list */}
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-32 h-32 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-8">
              <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No transactions found</h3>
            <p className="text-gray-600 max-w-md mx-auto text-lg">
              {searchQuery || filterType !== 'All'
                ? 'Try adjusting your search filters to find what you\'re looking for.'
                : 'Transactions will appear here once you start lending, borrowing, or interacting with the protocol.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="group bg-gradient-to-r from-white to-gray-50/50 border-2 border-gray-100 rounded-3xl p-8 hover:shadow-2xl hover:border-gray-200 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02]"
              >
                <div className="flex items-start justify-between">
                  {/* Left side - Type and details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-6 mb-6">
                      {/* Type badge */}
                      <div className={`inline-flex items-center px-6 py-3 rounded-2xl font-bold text-sm border-2 ${TYPE_COLORS[tx.type]}`}>
                        <span className="mr-3 text-2xl">{TYPE_ICONS[tx.type]}</span>
                        {tx.type}
                      </div>
                      
                      {/* Asset symbol */}
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-lg">{tx.assetSymbol.charAt(0)}</span>
                        </div>
                        <span className="text-2xl font-bold text-gray-900">
                          {tx.assetSymbol}
                        </span>
                      </div>
                      
                      {/* Status */}
                      {tx.status === 'success' && (
                        <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-4 py-2 rounded-xl">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="font-bold">Success</span>
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="mb-6">
                      <div className="flex items-baseline space-x-4">
                        <span className="text-4xl font-bold text-gray-900">
                          {formatAmount(tx.amount)}
                        </span>
                        <span className="text-xl text-gray-600 font-semibold">
                          {tx.assetSymbol}
                        </span>
                        <span className="text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full font-medium">
                          ${parseFloat(tx.amountUSD).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-500 font-semibold">User:</span>
                        <a
                          href={`https://etherscan.io/address/${tx.user}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline font-mono bg-blue-50 px-3 py-1 rounded-lg"
                        >
                          {formatAddress(tx.user)}
                        </a>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-500 font-semibold">Block:</span>
                        <span className="font-mono text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">#{tx.blockNumber.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-500 font-semibold">Time:</span>
                        <span className="text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">{formatDate(tx.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side - TX hash link */}
                  <div className="flex flex-col items-end space-y-3">
                    <a
                      href={`https://etherscan.io/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-6 py-3 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-2xl transition-all duration-200 group shadow-lg hover:shadow-xl"
                      title={tx.hash}
                    >
                      <span className="font-mono mr-3 text-lg">{formatAddress(tx.hash)}</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading indicator when refreshing */}
        {isLoading && transactions.length > 0 && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center px-8 py-4 bg-blue-50 text-blue-600 rounded-2xl shadow-lg">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-4" />
              <span className="font-bold text-lg">Refreshing transactions...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}