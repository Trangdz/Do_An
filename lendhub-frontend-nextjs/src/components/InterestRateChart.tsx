import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AssetRateHistory } from '../hooks/useInterestRateHistory';

interface InterestRateChartProps {
  history: AssetRateHistory;
  isLoading: boolean;
  error: string | null;
  onClearHistory?: () => void;
}

// Color palette for different assets
const ASSET_COLORS = [
  { supply: '#10b981', borrow: '#ef4444' }, // ETH - Green/Red
  { supply: '#3b82f6', borrow: '#f97316' }, // DAI - Blue/Orange
  { supply: '#8b5cf6', borrow: '#ec4899' }, // USDC - Purple/Pink
  { supply: '#f59e0b', borrow: '#14b8a6' }, // LINK - Amber/Teal
];

export function InterestRateChart({ history, isLoading, error, onClearHistory }: InterestRateChartProps) {
  // Transform history data for recharts
  const chartData = useMemo(() => {
    const assets = Object.values(history);
    if (assets.length === 0) return [];

    // Get all unique timestamps
    const allTimestamps = new Set<number>();
    assets.forEach(asset => {
      asset.history.forEach(point => allTimestamps.add(point.timestamp));
    });

    // Sort timestamps
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    // Build data points
    return sortedTimestamps.map(timestamp => {
      const dataPoint: any = { timestamp };

      // Find the time label from any asset
      for (const asset of assets) {
        const point = asset.history.find(p => p.timestamp === timestamp);
        if (point) {
          dataPoint.time = point.time;
          break;
        }
      }

      // Add data for each asset
      Object.entries(history).forEach(([address, assetData]) => {
        const point = assetData.history.find(p => p.timestamp === timestamp);
        if (point) {
          dataPoint[`${assetData.symbol}_Supply`] = point.supplyAPR;
          dataPoint[`${assetData.symbol}_Borrow`] = point.borrowAPR;
          dataPoint[`${assetData.symbol}_Utilization`] = point.utilization;
        }
      });

      return dataPoint;
    });
  }, [history]);

  // Get asset list with colors
  const assetList = useMemo(() => {
    return Object.entries(history).map(([address, data], index) => ({
      address,
      symbol: data.symbol,
      color: ASSET_COLORS[index % ASSET_COLORS.length]
    }));
  }, [history]);

  if (isLoading && chartData.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading interest rate data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center text-red-600">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="font-semibold">Error loading chart data</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-lg font-semibold mb-2">No interest rate data available</p>
          <p className="text-sm">Chart will update automatically every 5 seconds</p>
          <div className="mt-4 flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">Waiting for data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600">Live Updates</span>
          </div>
          <span className="text-xs text-gray-400">
            {chartData.length} data points
          </span>
        </div>
        {onClearHistory && (
          <button
            onClick={onClearHistory}
            className="text-xs text-red-600 hover:text-red-700 font-medium"
          >
            Clear History
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
        {assetList.map(asset => (
          <div key={asset.address} className="space-y-1">
            <div className="font-semibold text-sm text-gray-700">{asset.symbol}</div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="flex items-center space-x-1">
                <div 
                  className="w-3 h-0.5 rounded" 
                  style={{ backgroundColor: asset.color.supply }}
                />
                <span className="text-gray-600">Supply</span>
              </div>
              <div className="flex items-center space-x-1">
                <div 
                  className="w-3 h-0.5 rounded" 
                  style={{ 
                    backgroundColor: asset.color.borrow,
                    backgroundImage: `repeating-linear-gradient(90deg, ${asset.color.borrow}, ${asset.color.borrow} 2px, transparent 2px, transparent 4px)`
                  }}
                />
                <span className="text-gray-600">Borrow</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 11, fill: '#6b7280' }}
              interval="preserveStartEnd"
              axisLine={{ stroke: '#d1d5db' }}
              tickLine={{ stroke: '#d1d5db' }}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
              tickLine={{ stroke: '#d1d5db' }}
              domain={[0, 'auto']}
              tickFormatter={(value) => `${value.toFixed(2)}%`}
              label={{ value: 'APR (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
            />
            <Tooltip 
              formatter={(value: any, name: string) => {
                const numValue = Number(value);
                const displayName = name.replace('_', ' ');
                return [`${numValue.toFixed(4)}%`, displayName];
              }}
              labelFormatter={(label) => `Time: ${label}`}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                padding: '12px'
              }}
              labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            
            {/* Render lines for each asset */}
            {assetList.map((asset, index) => (
              <React.Fragment key={asset.address}>
                {/* Supply APR - Solid line */}
                <Line
                  type="monotone"
                  dataKey={`${asset.symbol}_Supply`}
                  stroke={asset.color.supply}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: asset.color.supply }}
                  activeDot={{ r: 5, fill: asset.color.supply }}
                  connectNulls={true}
                  name={`${asset.symbol} Supply APR`}
                  animationDuration={300}
                />
                
                {/* Borrow APR - Dashed line */}
                <Line
                  type="monotone"
                  dataKey={`${asset.symbol}_Borrow`}
                  stroke={asset.color.borrow}
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: asset.color.borrow }}
                  activeDot={{ r: 5, fill: asset.color.borrow }}
                  connectNulls={true}
                  name={`${asset.symbol} Borrow APR`}
                  animationDuration={300}
                />
              </React.Fragment>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Status Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
        <div className="flex items-center space-x-4">
          <span>
            Last update: {chartData.length > 0 ? chartData[chartData.length - 1].time : 'N/A'}
          </span>
          <span className="flex items-center space-x-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span>Auto-refresh: 5s</span>
          </span>
        </div>
        {isLoading && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Updating...</span>
          </div>
        )}
      </div>
    </div>
  );
}

