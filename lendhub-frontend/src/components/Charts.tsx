import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { RateChartData, PriceChartData } from '../types';
import { formatNumber, formatPercentage, formatCurrency } from '../utils/math';

interface ChartsProps {
  rateData: RateChartData[];
  priceData: PriceChartData[];
}

export function Charts({ rateData, priceData }: ChartsProps) {
  const [activeTab, setActiveTab] = useState<'rates' | 'prices'>('rates');

  // Mock data for demonstration
  const mockRateData: RateChartData[] = [
    { timestamp: Date.now() - 3600000, supplyRate: 2.5, borrowRate: 3.2, utilization: 0.65 },
    { timestamp: Date.now() - 3000000, supplyRate: 2.8, borrowRate: 3.5, utilization: 0.68 },
    { timestamp: Date.now() - 2400000, supplyRate: 3.1, borrowRate: 3.8, utilization: 0.72 },
    { timestamp: Date.now() - 1800000, supplyRate: 3.4, borrowRate: 4.1, utilization: 0.75 },
    { timestamp: Date.now() - 1200000, supplyRate: 3.7, borrowRate: 4.4, utilization: 0.78 },
    { timestamp: Date.now() - 600000, supplyRate: 4.0, borrowRate: 4.7, utilization: 0.82 },
    { timestamp: Date.now(), supplyRate: 4.3, borrowRate: 5.0, utilization: 0.85 },
  ];

  const mockPriceData: PriceChartData[] = [
    { timestamp: Date.now() - 3600000, price: 1600, symbol: 'ETH' },
    { timestamp: Date.now() - 3000000, price: 1580, symbol: 'ETH' },
    { timestamp: Date.now() - 2400000, price: 1620, symbol: 'ETH' },
    { timestamp: Date.now() - 1800000, price: 1590, symbol: 'ETH' },
    { timestamp: Date.now() - 1200000, price: 1610, symbol: 'ETH' },
    { timestamp: Date.now() - 600000, price: 1570, symbol: 'ETH' },
    { timestamp: Date.now(), price: 1600, symbol: 'ETH' },
  ];

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground">
            {formatTime(label)}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PriceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground">
            {formatTime(label)}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Analytics</CardTitle>
        <CardDescription>
          Real-time charts for interest rates and asset prices
        </CardDescription>
        <div className="flex space-x-2">
          <Button
            variant={activeTab === 'rates' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('rates')}
          >
            Interest Rates
          </Button>
          <Button
            variant={activeTab === 'prices' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('prices')}
          >
            Asset Prices
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activeTab === 'rates' ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockRateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTime}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="supplyRate"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Supply Rate"
                />
                <Line
                  type="monotone"
                  dataKey="borrowRate"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Borrow Rate"
                />
                <Line
                  type="monotone"
                  dataKey="utilization"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Utilization"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockPriceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTime}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value)}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<PriceTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
