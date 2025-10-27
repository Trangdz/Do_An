'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function OverviewPage() {
  const pages = [
    {
      title: '📜 Transaction History',
      description: 'Real-time transaction history with detailed information',
      href: '/history',
      color: 'blue',
      features: ['Live blockchain scanning', 'Transaction details', 'Gas fee tracking', 'USD value calculation']
    },
    {
      title: '📈 Analytics',
      description: 'Advanced analytics and statistics dashboard',
      href: '/analytics',
      color: 'indigo',
      features: ['Volume analytics', 'User statistics', 'Market trends', 'Performance metrics']
    },
    {
      title: '🔍 Transaction Test',
      description: 'Real-time transaction detection testing',
      href: '/transaction-test',
      color: 'green',
      features: ['Live monitoring', 'Block scanning', 'Event detection', 'Error handling']
    },
    {
      title: '🎨 Demo',
      description: 'Demo interface with sample data',
      href: '/simple-demo',
      color: 'slate',
      features: ['Sample transactions', 'UI demonstration', 'Component showcase', 'Design preview']
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'from-blue-50 to-cyan-50 border-blue-200 text-blue-700',
      indigo: 'from-indigo-50 to-purple-50 border-indigo-200 text-indigo-700',
      green: 'from-green-50 to-emerald-50 border-green-200 text-green-700',
      slate: 'from-slate-50 to-gray-50 border-slate-200 text-slate-700'
    };
    return colors[color as keyof typeof colors] || colors.slate;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🏠 LendHub v2 Overview
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive DeFi lending platform with real-time transaction monitoring
            </p>
          </div>

          {/* System Status */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">System Status</CardTitle>
              <CardDescription className="text-gray-600">
                Current system capabilities and features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="font-semibold text-green-700">Transaction Detection</div>
                  <div className="text-sm text-green-600">Real-time blockchain monitoring</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl mb-2">📊</div>
                  <div className="font-semibold text-blue-700">Analytics</div>
                  <div className="text-sm text-blue-600">Advanced statistics & insights</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl mb-2">🎨</div>
                  <div className="font-semibold text-purple-700">UI/UX</div>
                  <div className="text-sm text-purple-600">Modern responsive design</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Pages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pages.map((page, index) => (
              <Card key={index} className={`shadow-lg border-0 bg-gradient-to-br ${getColorClasses(page.color)} hover:shadow-xl transition-all duration-300`}>
                <CardHeader>
                  <CardTitle className="text-xl font-bold">{page.title}</CardTitle>
                  <CardDescription className="text-gray-600">
                    {page.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Features:</h4>
                      <ul className="text-sm space-y-1">
                        {page.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center">
                            <span className="w-2 h-2 bg-current rounded-full mr-2"></span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button 
                      asChild
                      className="w-full"
                    >
                      <a href={page.href}>
                        Visit {page.title}
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Technical Details */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">Technical Implementation</CardTitle>
              <CardDescription className="text-gray-600">
                How the transaction detection system works
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Blockchain Integration</h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Real-time event listening from LendingPool contract</li>
                    <li>• Automatic block scanning with incremental updates</li>
                    <li>• Error handling and retry mechanisms</li>
                    <li>• Local storage caching for performance</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Data Processing</h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Token symbol and decimal fetching</li>
                    <li>• Price oracle integration for USD values</li>
                    <li>• Gas fee calculation and tracking</li>
                    <li>• Transaction deduplication and validation</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">
              🚀 LendHub v2 • Built with Next.js, TypeScript, and Tailwind CSS
            </p>
            <p className="text-xs mt-2">
              Real-time blockchain monitoring • Auto-refresh capabilities • Modern UI/UX
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}












