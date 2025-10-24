import React from 'react';

// Demo component to show the beautiful transaction card design
export function TransactionCardDemo() {
  const demoTransactions = [
    {
      id: '1',
      hash: '0xaa1ada5b30c79b59fcd7fa56e2fd7ae337b1098f69c7665c8ff49dac7ec62b40',
      type: 'Lend',
      user: '0x7e85AbC4b76fa7d9835E1865d76Ef20C6D9d2d8D',
      assetSymbol: 'WETH',
      amount: '1.5',
      amountUSD: '3,750.00',
      gasUsed: '28,668',
      timestamp: Date.now() / 1000 - 3600, // 1 hour ago
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
      timestamp: Date.now() / 1000 - 7200, // 2 hours ago
      blockNumber: 12345675
    }
  ];

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
    <div className="detailed-history-container min-h-screen">
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="stats-card p-6">
            <div className="text-sm text-slate-400 mb-2">Total Volume</div>
            <div className="text-3xl font-bold text-gradient">$4,750.00</div>
          </div>
          <div className="stats-card p-6">
            <div className="text-sm text-slate-400 mb-2">Total Fees</div>
            <div className="text-3xl font-bold text-gradient">$12.50</div>
          </div>
          <div className="stats-card p-6">
            <div className="text-sm text-slate-400 mb-2">Transactions</div>
            <div className="text-3xl font-bold text-gradient">2</div>
          </div>
          <div className="stats-card p-6">
            <div className="text-sm text-slate-400 mb-2">Success Rate</div>
            <div className="text-3xl font-bold text-green-400">100%</div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-4">
          {demoTransactions.map((tx) => (
            <div
              key={tx.id}
              className="transaction-card p-6 cursor-pointer group"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  <div>
                    <div className="text-sm text-slate-400 mb-2 font-medium">TX HASH:</div>
                    <div className="text-blue-400 font-mono text-sm break-all data-field">
                      {tx.hash}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-400 mb-2 font-medium">FROM ADDRESS:</div>
                    <div className="text-white font-mono text-sm data-field">
                      {formatAddress(tx.user)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-400 mb-2 font-medium">GAS USED:</div>
                    <div className="text-white font-mono text-sm data-field">
                      {parseInt(tx.gasUsed).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <div>
                    <div className="text-sm text-slate-400 mb-2 font-medium">TO CONTRACT:</div>
                    <div className="text-white font-mono text-sm data-field">
                      {formatAddress('0x8a03C1413D29c5f43B6f878c81567682B29615eF')}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-400 mb-2 font-medium">VALUE:</div>
                    <div className="text-white font-mono text-sm data-field">
                      0.000000 ETH
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button className="contract-call-btn text-sm font-medium">
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
      </div>
    </div>
  );
}








