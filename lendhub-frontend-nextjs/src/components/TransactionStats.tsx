import React from 'react';
import { Transaction } from '../hooks/useTransactionHistory';

interface TransactionStatsProps {
  transactions: Transaction[];
  totalVolume: number;
  totalFees: number;
  transactionStats: {
    totalLend: number;
    totalWithdraw: number;
    totalBorrow: number;
    totalRepay: number;
    totalLiquidate: number;
  };
}

export function TransactionStats({ 
  transactions, 
  totalVolume, 
  totalFees, 
  transactionStats 
}: TransactionStatsProps) {
  // Calculate additional stats
  const totalTransactions = transactions.length;
  const avgTransactionValue = totalTransactions > 0 ? totalVolume / totalTransactions : 0;
  const avgGasFee = totalTransactions > 0 ? totalFees / totalTransactions : 0;

  // Get most active asset
  const assetCounts = transactions.reduce((acc, tx) => {
    acc[tx.assetSymbol] = (acc[tx.assetSymbol] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostActiveAsset = Object.entries(assetCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

  // Get recent activity (last 24 hours)
  const now = Date.now() / 1000;
  const last24Hours = transactions.filter(tx => now - tx.timestamp < 86400).length;

  const stats = [
    {
      label: 'Total Volume',
      value: `$${totalVolume.toLocaleString()}`,
      icon: '💰',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Total Fees',
      value: `$${totalFees.toLocaleString()}`,
      icon: '⛽',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      label: 'Total Transactions',
      value: totalTransactions.toLocaleString(),
      icon: '📊',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Avg Transaction',
      value: `$${avgTransactionValue.toLocaleString()}`,
      icon: '📈',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      label: 'Avg Gas Fee',
      value: `$${avgGasFee.toFixed(2)}`,
      icon: '⛽',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      label: 'Last 24h',
      value: last24Hours.toString(),
      icon: '🕐',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ];

  const typeStats = [
    { type: 'Lend', count: transactionStats.totalLend, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { type: 'Withdraw', count: transactionStats.totalWithdraw, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { type: 'Borrow', count: transactionStats.totalBorrow, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { type: 'Repay', count: transactionStats.totalRepay, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { type: 'Liquidate', count: transactionStats.totalLiquidate, color: 'text-red-600', bgColor: 'bg-red-50' }
  ];

  return (
    <div className="space-y-8">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`${stat.bgColor} rounded-2xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Transaction Type Breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Transaction Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {typeStats.map((typeStat, index) => (
            <div
              key={index}
              className={`${typeStat.bgColor} rounded-xl p-4 text-center border border-gray-200`}
            >
              <p className="text-sm text-gray-600 font-medium mb-1">{typeStat.type}</p>
              <p className={`text-2xl font-bold ${typeStat.color}`}>{typeStat.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-2xl">🏆</span>
            <h4 className="text-lg font-bold text-gray-900">Most Active Asset</h4>
          </div>
          <p className="text-2xl font-bold text-blue-600">{mostActiveAsset}</p>
          <p className="text-sm text-gray-600 mt-1">
            {assetCounts[mostActiveAsset] || 0} transactions
          </p>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-2xl">📈</span>
            <h4 className="text-lg font-bold text-gray-900">Activity Trend</h4>
          </div>
          <p className="text-2xl font-bold text-green-600">{last24Hours}</p>
          <p className="text-sm text-gray-600 mt-1">
            transactions in last 24 hours
          </p>
        </div>
      </div>
    </div>
  );
}

