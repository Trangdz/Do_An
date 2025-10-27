import React from 'react';
import { Transaction } from '../hooks/useTransactionHistory';

interface TransactionCardDetailedProps {
  transaction: Transaction;
}

const TYPE_COLORS = {
  Lend: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Withdraw: 'bg-blue-100 text-blue-800 border-blue-200',
  Borrow: 'bg-amber-100 text-amber-800 border-amber-200',
  Repay: 'bg-purple-100 text-purple-800 border-purple-200',
  Liquidate: 'bg-red-100 text-red-800 border-red-200'
};

const TYPE_ICONS = {
  Lend: '💰',
  Withdraw: '⬅️',
  Borrow: '📤',
  Repay: '✅',
  Liquidate: '⚡'
};

export function TransactionCardDetailed({ transaction }: TransactionCardDetailedProps) {
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get transaction-specific details
  const getTransactionInfo = () => {
    switch (transaction.type) {
      case 'Lend':
        return {
          title: 'LEND TOKEN',
          description: `Supplied ${formatAmount(transaction.amount)} ${transaction.assetSymbol} to earn interest`,
          mainToken: transaction.assetSymbol,
          mainAmount: `${formatAmount(transaction.amount)} ${transaction.assetSymbol}`,
          mainValue: `$${parseFloat(transaction.amountUSD).toLocaleString()}`,
          actor: 'Supplier',
          actorAddress: transaction.user
        };
      case 'Borrow':
        return {
          title: 'BORROW TOKEN',
          description: `Borrowed ${formatAmount(transaction.amount)} ${transaction.assetSymbol} against collateral`,
          mainToken: transaction.assetSymbol,
          mainAmount: `${formatAmount(transaction.amount)} ${transaction.assetSymbol}`,
          mainValue: `$${parseFloat(transaction.amountUSD).toLocaleString()}`,
          actor: 'Borrower',
          actorAddress: transaction.user
        };
      case 'Withdraw':
        return {
          title: 'WITHDRAW TOKEN',
          description: `Withdrew ${formatAmount(transaction.amount)} ${transaction.assetSymbol} from supply`,
          mainToken: transaction.assetSymbol,
          mainAmount: `${formatAmount(transaction.amount)} ${transaction.assetSymbol}`,
          mainValue: `$${parseFloat(transaction.amountUSD).toLocaleString()}`,
          actor: 'Withdrawer',
          actorAddress: transaction.user
        };
      case 'Repay':
        return {
          title: 'REPAY DEBT',
          description: `Repaid ${formatAmount(transaction.amount)} ${transaction.assetSymbol} debt`,
          mainToken: transaction.assetSymbol,
          mainAmount: `${formatAmount(transaction.amount)} ${transaction.assetSymbol}`,
          mainValue: `$${parseFloat(transaction.amountUSD).toLocaleString()}`,
          actor: 'Repayer',
          actorAddress: transaction.user
        };
      case 'Liquidate':
        return {
          title: 'LIQUIDATE POSITION',
          description: `Liquidated position and seized ${formatAmount(transaction.amount)} ${transaction.assetSymbol}`,
          mainToken: transaction.assetSymbol,
          mainAmount: `${formatAmount(transaction.amount)} ${transaction.assetSymbol}`,
          mainValue: `$${parseFloat(transaction.amountUSD).toLocaleString()}`,
          actor: 'Liquidator',
          actorAddress: transaction.user
        };
      default:
        return {
          title: 'TRANSACTION',
          description: 'Blockchain transaction',
          mainToken: transaction.assetSymbol,
          mainAmount: `${formatAmount(transaction.amount)} ${transaction.assetSymbol}`,
          mainValue: `$${parseFloat(transaction.amountUSD).toLocaleString()}`,
          actor: 'User',
          actorAddress: transaction.user
        };
    }
  };

  const txInfo = getTransactionInfo();

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{TYPE_ICONS[transaction.type]}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{txInfo.title}</h3>
              <p className="text-sm text-gray-600">{txInfo.description}</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${TYPE_COLORS[transaction.type]}`}>
            {transaction.type}
          </div>
        </div>
        
        <div className="text-xs text-gray-500 font-mono break-all">
          TX: {transaction.hash}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Transaction Details */}
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 font-medium mb-2">TRANSACTION DETAILS</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{txInfo.actor}:</span>
                  <span className="text-sm font-mono text-gray-900">{formatAddress(txInfo.actorAddress)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Token Contract:</span>
                  <span className="text-sm font-mono text-gray-900">{formatAddress(transaction.asset)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="text-sm font-semibold text-gray-900">{txInfo.mainAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">USD Value:</span>
                  <span className="text-sm font-semibold text-green-600">{txInfo.mainValue}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 font-medium mb-2">TOKEN INFORMATION</div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{transaction.assetSymbol.charAt(0)}</span>
                </div>
                <div>
                  <div className="text-lg font-semibold text-blue-700">{transaction.assetSymbol}</div>
                  <div className="text-xs text-gray-500">ERC-20 Token</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Technical Details */}
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 font-medium mb-2">GAS INFORMATION</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Gas Used:</span>
                  <span className="text-sm font-mono text-gray-900">{parseInt(transaction.gasUsed || '0').toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Gas Price:</span>
                  <span className="text-sm font-mono text-gray-900">{parseInt(transaction.gasPrice || '0').toLocaleString()} wei</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Network Fee:</span>
                  <span className="text-sm font-mono text-gray-900">{transaction.txFee} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Fee USD:</span>
                  <span className="text-sm font-semibold text-red-600">${transaction.txFeeUSD || '0'}</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 font-medium mb-2">BLOCKCHAIN INFO</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Block Number:</span>
                  <span className="text-sm font-mono text-gray-900">#{transaction.blockNumber.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Timestamp:</span>
                  <span className="text-sm text-gray-900">{formatDate(transaction.timestamp)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    ✓ Success
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Transaction processed on Ethereum network
            </div>
            <a
              href={`https://etherscan.io/tx/${transaction.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              View on Etherscan
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}


















