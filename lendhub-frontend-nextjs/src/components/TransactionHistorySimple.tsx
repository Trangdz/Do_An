import React, { useState } from 'react';
import { useTransactionHistory, Transaction } from '../hooks/useTransactionHistory';
import { TransactionCardSimple } from './TransactionCardSimple';

interface TransactionHistorySimpleProps {
  provider: any;
  poolAddress: string;
  oracleAddress: string;
  userAddress?: string;
}

export function TransactionHistorySimple({ provider, poolAddress, oracleAddress, userAddress }: TransactionHistorySimpleProps) {
  const [filterType, setFilterType] = useState<Transaction['type'] | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
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
    provider,
    poolAddress,
    oracleAddress,
    userAddress,
    true,
    15000
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

  if (isLoading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
            <p className="text-gray-600 mt-2">
              {userAddress ? 'Your transaction history' : 'All protocol transactions'}
              {' • '}
              <span className="font-semibold text-blue-600">{filteredTransactions.length}</span> transactions
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={refetch}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={clearHistory}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Stats */}
        {userAddress && transactions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-500">Total Volume</div>
              <div className="text-2xl font-bold text-green-600">${totalVolume.toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-500">Total Fees</div>
              <div className="text-2xl font-bold text-red-600">${totalFees.toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-500">Lend</div>
              <div className="text-2xl font-bold text-emerald-600">{transactionStats.totalLend}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-500">Borrow</div>
              <div className="text-2xl font-bold text-amber-600">{transactionStats.totalBorrow}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by hash, asset, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Type filter */}
          <div className="flex flex-wrap gap-2">
            {(['All', 'Lend', 'Withdraw', 'Borrow', 'Repay', 'Liquidate'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filterType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions found</h3>
          <p className="text-gray-600">
            {searchQuery || filterType !== 'All'
              ? 'Try adjusting your search filters to find what you\'re looking for.'
              : 'Transactions will appear here once you start lending, borrowing, or interacting with the protocol.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTransactions.map((tx) => (
            <TransactionCardSimple key={tx.id} transaction={tx} />
          ))}
        </div>
      )}

      {/* Loading indicator when refreshing */}
      {isLoading && transactions.length > 0 && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
            <span className="text-sm font-medium">Refreshing transactions...</span>
          </div>
        </div>
      )}
    </div>
  );
}






