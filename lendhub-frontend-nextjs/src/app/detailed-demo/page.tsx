'use client';

import React, { useState } from 'react';
import { TransactionCardDetailed } from '../../components/TransactionCardDetailed';

// Demo transaction data with detailed information
const demoTransactions = [
  {
    id: 'demo-1',
    hash: '0xaa1ada5b30c79b59fcd7fa56e2fd7ae337b1098f69c7665c8ff49dac7ec62b40',
    type: 'Lend' as const,
    user: '0x7e85a2d8d1234567890abcdef1234567890abcd',
    asset: '0x8a031234567890abcdef1234567890abcdef15ef',
    assetSymbol: 'WETH',
    amount: '1.5',
    amountUSD: '3750.00',
    timestamp: Math.floor(Date.now() / 1000) - 3600,
    blockNumber: 12345678,
    status: 'success' as const,
    gasUsed: '28',
    gasPrice: '20000000000',
    txFee: '0.00000056',
    txFeeUSD: '0.001'
  },
  {
    id: 'demo-2',
    hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    type: 'Borrow' as const,
    user: '0x1234567890123456789012345678901234567890',
    asset: '0x9876543210987654321098765432109876543210',
    assetSymbol: 'DAI',
    amount: '500.00',
    amountUSD: '500.00',
    timestamp: Math.floor(Date.now() / 1000) - 7200,
    blockNumber: 12345677,
    status: 'success' as const,
    gasUsed: '25000',
    gasPrice: '20000000000',
    txFee: '0.0005',
    txFeeUSD: '1.00'
  },
  {
    id: 'demo-3',
    hash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
    type: 'Repay' as const,
    user: '0x1234567890123456789012345678901234567890',
    asset: '0x9876543210987654321098765432109876543210',
    assetSymbol: 'DAI',
    amount: '250.00',
    amountUSD: '250.00',
    timestamp: Math.floor(Date.now() / 1000) - 10800,
    blockNumber: 12345676,
    status: 'success' as const,
    gasUsed: '22000',
    gasPrice: '20000000000',
    txFee: '0.00044',
    txFeeUSD: '0.88'
  },
  {
    id: 'demo-4',
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    type: 'Withdraw' as const,
    user: '0xD6e829E38a15397c84b47E07CCB532216c6EEA22',
    asset: '0x66cCB8c0E63D4268615d3Ff77bf48f10C367Cb35',
    assetSymbol: 'USDC',
    amount: '300.00',
    amountUSD: '300.00',
    timestamp: Math.floor(Date.now() / 1000) - 14400,
    blockNumber: 12345675,
    status: 'success' as const,
    gasUsed: '24000',
    gasPrice: '20000000000',
    txFee: '0.00048',
    txFeeUSD: '0.96'
  },
  {
    id: 'demo-5',
    hash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    type: 'Liquidate' as const,
    user: '0x5555555555555555555555555555555555555555',
    asset: '0x1111111111111111111111111111111111111111',
    assetSymbol: 'WETH',
    amount: '2.5',
    amountUSD: '5000.00',
    timestamp: Math.floor(Date.now() / 1000) - 18000,
    blockNumber: 12345674,
    status: 'success' as const,
    gasUsed: '35000',
    gasPrice: '25000000000',
    txFee: '0.000875',
    txFeeUSD: '1.75'
  }
];

export default function DetailedDemoPage() {
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter transactions
  const filteredTransactions = demoTransactions.filter(tx => {
    const matchesType = filterType === 'All' || tx.type === filterType;
    const matchesSearch = searchQuery === '' || 
      tx.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.assetSymbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.user.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-6">
              <a
                href="/"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </a>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">Detailed Transaction View</h1>
            </div>
            
            <div className="flex items-center space-x-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>Detailed Demo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Detailed Transaction History</h1>
              <p className="text-gray-600 mt-2">
                Clear separation between transaction tokens and gas fees
                {' • '}
                <span className="font-semibold text-blue-600">{filteredTransactions.length}</span> transactions
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-500">Total Volume</div>
              <div className="text-2xl font-bold text-green-600">$9,800.00</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-500">Total Gas Fees</div>
              <div className="text-2xl font-bold text-red-600">$4.74</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-500">WETH Transactions</div>
              <div className="text-2xl font-bold text-purple-600">1</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-500">USDC Transactions</div>
              <div className="text-2xl font-bold text-blue-600">1</div>
            </div>
          </div>

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
              Try adjusting your search filters to find what you're looking for.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredTransactions.map((tx) => (
              <TransactionCardDetailed key={tx.id} transaction={tx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
