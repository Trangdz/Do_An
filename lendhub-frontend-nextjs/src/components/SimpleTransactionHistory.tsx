import React, { useEffect, useMemo, useState } from 'react';

interface SimpleTransactionHistoryProps {
  provider: any;
  poolAddress: string;
  oracleAddress: string;
  userAddress?: string;
}

export function SimpleTransactionHistory({ 
  provider, 
  poolAddress, 
  oracleAddress, 
  userAddress 
}: SimpleTransactionHistoryProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Build demo data on client after mount to avoid SSR/CSR timestamp mismatch
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
  }, []);

  const demoTransactions = useMemo(() => {
    const base = now ?? Math.floor(Date.now() / 1000);
    return [
      {
        id: '1',
        hash: '0xaa1ada5b30c79b59fcd7fa56e2fd7ae337b1098f69c7665c8ff49dac7ec62b40',
        type: 'Lend',
        user: '0x7e85AbC4b76fa7d9835E1865d76Ef20C6D9d2d8D',
        assetSymbol: 'WETH',
        amount: '1.5',
        amountUSD: '3,750.00',
        gasUsed: '28,668',
        timestamp: base - 3600,
        blockNumber: 12345678
      },
      {
        id: '2',
        hash: '0x89954256678e4079702fe311ad472d408d563e169f79ae554b264cb4096ca638',
        type: 'Borrow',
        user: '0x7e85AbC4b76fa7d9835E1865d76Ef20C6D9d2d8D',
        assetSymbol: 'DAI',
        amount: '1000',
        amountUSD: '1,000.00',
        gasUsed: '28,656',
        timestamp: base - 7200,
        blockNumber: 12345675
      }
    ];
  }, [now]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white">Lịch sử giao dịch chi tiết</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsLoading(!isLoading)}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-slate-800/80">
            <div className="text-sm text-slate-400 mb-2">Total Volume</div>
            <div className="text-3xl font-bold text-white">$4,750.00</div>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-slate-800/80">
            <div className="text-sm text-slate-400 mb-2">Total Fees</div>
            <div className="text-3xl font-bold text-white">$12.50</div>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-slate-800/80">
            <div className="text-sm text-slate-400 mb-2">Transactions</div>
            <div className="text-3xl font-bold text-white">2</div>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-slate-800/80">
            <div className="text-sm text-slate-400 mb-2">Success Rate</div>
            <div className="text-3xl font-bold text-green-400">100%</div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-4">
          {demoTransactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 hover:bg-slate-800/80 hover:border-slate-600/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl group"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  <div>
                    <div className="text-sm text-slate-400 mb-2 font-medium">TX HASH:</div>
                    <div className="text-blue-400 font-mono text-sm break-all bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                      {tx.hash}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-400 mb-2 font-medium">FROM ADDRESS:</div>
                    <div className="text-white font-mono text-sm bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                      {formatAddress(tx.user)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-400 mb-2 font-medium">GAS USED:</div>
                    <div className="text-white font-mono text-sm bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                      {parseInt(tx.gasUsed).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <div>
                    <div className="text-sm text-slate-400 mb-2 font-medium">TO CONTRACT:</div>
                    <div className="text-white font-mono text-sm bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                      {formatAddress('0x8a03C1413D29c5f43B6f878c81567682B29615eF')}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-400 mb-2 font-medium">VALUE:</div>
                    <div className="text-white font-mono text-sm bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                      0.000000 ETH
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
                      CONTRACT CALL
                    </button>
                  </div>
                </div>
              </div>

              {/* Transaction Type and Amount */}
              <div className="mt-6 pt-6 border-t border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
                      {tx.type}
                    </div>
                    <div className="text-white font-medium">
                      {tx.amount} {tx.assetSymbol}
                    </div>
                    <div className="text-slate-400 bg-slate-900/50 px-3 py-1 rounded-lg text-sm">
                      ${tx.amountUSD}
                    </div>
                  </div>
                  <div className="text-slate-400 text-sm bg-slate-900/50 px-3 py-1 rounded-lg">
                    {formatDate(tx.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading indicator */}
        {isLoading && (
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
