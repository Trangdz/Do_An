import React, { useMemo } from 'react';
import { Transaction } from '../hooks/useTransactionHistory';

interface TransactionAnalyticsProps {
  transactions: Transaction[];
  totalVolume: number;
  totalFees: number;
}

export function TransactionAnalytics({ transactions, totalVolume, totalFees }: TransactionAnalyticsProps) {
  const analytics = useMemo(() => {
    if (transactions.length === 0) {
      return {
        dailyVolume: [],
        hourlyDistribution: Array(24).fill(0),
        assetDistribution: {},
        typeDistribution: {},
        avgTransactionSize: 0,
        mostActiveHour: 0,
        mostActiveAsset: 'N/A',
        mostActiveType: 'N/A',
        totalTransactions: 0,
        uniqueUsers: 0,
        avgGasFee: 0,
        totalGasUsed: 0
      };
    }

    // Calculate daily volume for last 30 days
    const now = Date.now() / 1000;
    const dailyVolume = Array(30).fill(0).map((_, i) => {
      const dayStart = now - (i * 86400);
      const dayEnd = dayStart + 86400;
      return transactions
        .filter(tx => tx.timestamp >= dayStart && tx.timestamp < dayEnd)
        .reduce((sum, tx) => sum + parseFloat(tx.amountUSD), 0);
    }).reverse();

    // Calculate hourly distribution
    const hourlyDistribution = Array(24).fill(0);
    transactions.forEach(tx => {
      const hour = new Date(tx.timestamp * 1000).getHours();
      hourlyDistribution[hour]++;
    });

    // Asset distribution
    const assetDistribution = transactions.reduce((acc, tx) => {
      acc[tx.assetSymbol] = (acc[tx.assetSymbol] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Type distribution
    const typeDistribution = transactions.reduce((acc, tx) => {
      acc[tx.type] = (acc[tx.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Other metrics
    const avgTransactionSize = totalVolume / transactions.length;
    const mostActiveHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));
    const mostActiveAsset = Object.entries(assetDistribution)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
    const mostActiveType = Object.entries(typeDistribution)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
    const uniqueUsers = new Set(transactions.map(tx => tx.user)).size;
    const avgGasFee = transactions.reduce((sum, tx) => sum + parseFloat(tx.txFeeUSD || '0'), 0) / transactions.length;
    const totalGasUsed = transactions.reduce((sum, tx) => sum + parseInt(tx.gasUsed || '0'), 0);

    return {
      dailyVolume,
      hourlyDistribution,
      assetDistribution,
      typeDistribution,
      avgTransactionSize,
      mostActiveHour,
      mostActiveAsset,
      mostActiveType,
      totalTransactions: transactions.length,
      uniqueUsers,
      avgGasFee,
      totalGasUsed
    };
  }, [transactions, totalVolume, totalFees]);

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const formatDate = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">📊</span>
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Transactions</p>
              <p className="text-2xl font-bold text-blue-700">{analytics.totalTransactions}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">👥</span>
            </div>
            <div>
              <p className="text-sm text-green-600 font-medium">Unique Users</p>
              <p className="text-2xl font-bold text-green-700">{analytics.uniqueUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">💰</span>
            </div>
            <div>
              <p className="text-sm text-purple-600 font-medium">Avg Transaction</p>
              <p className="text-2xl font-bold text-purple-700">${analytics.avgTransactionSize.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">⛽</span>
            </div>
            <div>
              <p className="text-sm text-orange-600 font-medium">Avg Gas Fee</p>
              <p className="text-2xl font-bold text-orange-700">${analytics.avgGasFee.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Most Active Hour</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{formatHour(analytics.mostActiveHour)}</div>
            <p className="text-sm text-gray-600">
              {analytics.hourlyDistribution[analytics.mostActiveHour]} transactions
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Most Active Asset</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{analytics.mostActiveAsset}</div>
            <p className="text-sm text-gray-600">
              {analytics.assetDistribution[analytics.mostActiveAsset] || 0} transactions
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Most Active Type</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{analytics.mostActiveType}</div>
            <p className="text-sm text-gray-600">
              {analytics.typeDistribution[analytics.mostActiveType] || 0} transactions
            </p>
          </div>
        </div>
      </div>

      {/* Hourly Distribution Chart */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Activity by Hour</h3>
        <div className="grid grid-cols-12 gap-2">
          {analytics.hourlyDistribution.map((count, hour) => (
            <div key={hour} className="text-center">
              <div className="text-xs text-gray-500 mb-1">{formatHour(hour)}</div>
              <div 
                className="bg-blue-500 rounded-t-sm transition-all duration-300 hover:bg-blue-600"
                style={{ 
                  height: `${Math.max(4, (count / Math.max(...analytics.hourlyDistribution)) * 100)}px`,
                  minHeight: '4px'
                }}
                title={`${count} transactions at ${formatHour(hour)}`}
              />
              <div className="text-xs text-gray-600 mt-1">{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Asset Distribution */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Asset Distribution</h3>
        <div className="space-y-3">
          {Object.entries(analytics.assetDistribution)
            .sort(([,a], [,b]) => b - a)
            .map(([asset, count]) => (
              <div key={asset} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{asset.charAt(0)}</span>
                  </div>
                  <span className="font-medium text-gray-900">{asset}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(count / analytics.totalTransactions) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600 w-12 text-right">{count}</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Type Distribution */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Transaction Type Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(analytics.typeDistribution)
            .sort(([,a], [,b]) => b - a)
            .map(([type, count]) => {
              const colors = {
                Lend: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                Withdraw: 'bg-blue-50 text-blue-700 border-blue-200',
                Borrow: 'bg-amber-50 text-amber-700 border-amber-200',
                Repay: 'bg-purple-50 text-purple-700 border-purple-200',
                Liquidate: 'bg-red-50 text-red-700 border-red-200'
              };
              
              return (
                <div key={type} className={`${colors[type as keyof typeof colors]} rounded-xl p-4 text-center border-2`}>
                  <p className="text-sm font-medium mb-1">{type}</p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}






