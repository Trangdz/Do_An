import React from 'react';
import { Transaction } from '../hooks/useTransactionHistory';

interface TransactionCardSimpleProps {
  transaction: Transaction;
}

const TYPE_COLORS = {
  Lend: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Withdraw: 'bg-blue-100 text-blue-800 border-blue-200',
  Borrow: 'bg-amber-100 text-amber-800 border-amber-200',
  Repay: 'bg-purple-100 text-purple-800 border-purple-200',
  Liquidate: 'bg-red-100 text-red-800 border-red-200'
};

const TYPE_LABELS = {
  Lend: 'LEND',
  Withdraw: 'WITHDRAW',
  Borrow: 'BORROW',
  Repay: 'REPAY',
  Liquidate: 'LIQUIDATE'
};

export function TransactionCardSimple({ transaction }: TransactionCardSimpleProps) {
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

  // Get transaction-specific details based on type
  const getTransactionDetails = () => {
    switch (transaction.type) {
      case 'Lend':
        return {
          title: 'LEND TOKEN',
          description: `Supplied ${formatAmount(transaction.amount)} ${transaction.assetSymbol} to the lending pool`,
          details: [
            { label: 'SUPPLIER', value: formatAddress(transaction.user) },
            { label: 'TOKEN CONTRACT', value: formatAddress(transaction.asset) },
            { label: 'AMOUNT SUPPLIED', value: `${formatAmount(transaction.amount)} ${transaction.assetSymbol}` },
            { label: 'USD VALUE', value: `$${parseFloat(transaction.amountUSD).toLocaleString()}` }
          ]
        };
      case 'Borrow':
        return {
          title: 'BORROW TOKEN',
          description: `Borrowed ${formatAmount(transaction.amount)} ${transaction.assetSymbol} from the lending pool`,
          details: [
            { label: 'BORROWER', value: formatAddress(transaction.user) },
            { label: 'TOKEN CONTRACT', value: formatAddress(transaction.asset) },
            { label: 'AMOUNT BORROWED', value: `${formatAmount(transaction.amount)} ${transaction.assetSymbol}` },
            { label: 'USD VALUE', value: `$${parseFloat(transaction.amountUSD).toLocaleString()}` }
          ]
        };
      case 'Withdraw':
        return {
          title: 'WITHDRAW TOKEN',
          description: `Withdrew ${formatAmount(transaction.amount)} ${transaction.assetSymbol} from the lending pool`,
          details: [
            { label: 'WITHDRAWER', value: formatAddress(transaction.user) },
            { label: 'TOKEN CONTRACT', value: formatAddress(transaction.asset) },
            { label: 'AMOUNT WITHDRAWN', value: `${formatAmount(transaction.amount)} ${transaction.assetSymbol}` },
            { label: 'USD VALUE', value: `$${parseFloat(transaction.amountUSD).toLocaleString()}` }
          ]
        };
      case 'Repay':
        return {
          title: 'REPAY DEBT',
          description: `Repaid ${formatAmount(transaction.amount)} ${transaction.assetSymbol} debt`,
          details: [
            { label: 'REPAYER', value: formatAddress(transaction.user) },
            { label: 'TOKEN CONTRACT', value: formatAddress(transaction.asset) },
            { label: 'AMOUNT REPAID', value: `${formatAmount(transaction.amount)} ${transaction.assetSymbol}` },
            { label: 'USD VALUE', value: `$${parseFloat(transaction.amountUSD).toLocaleString()}` }
          ]
        };
      case 'Liquidate':
        return {
          title: 'LIQUIDATE POSITION',
          description: `Liquidated position and seized ${formatAmount(transaction.amount)} ${transaction.assetSymbol}`,
          details: [
            { label: 'LIQUIDATOR', value: formatAddress(transaction.user) },
            { label: 'COLLATERAL TOKEN', value: formatAddress(transaction.asset) },
            { label: 'AMOUNT SEIZED', value: `${formatAmount(transaction.amount)} ${transaction.assetSymbol}` },
            { label: 'USD VALUE', value: `$${parseFloat(transaction.amountUSD).toLocaleString()}` }
          ]
        };
      default:
        return {
          title: 'TRANSACTION',
          description: 'Blockchain transaction',
          details: [
            { label: 'USER', value: formatAddress(transaction.user) },
            { label: 'CONTRACT', value: formatAddress(transaction.asset) },
            { label: 'AMOUNT', value: `${formatAmount(transaction.amount)} ${transaction.assetSymbol}` },
            { label: 'USD VALUE', value: `$${parseFloat(transaction.amountUSD).toLocaleString()}` }
          ]
        };
    }
  };

  const txDetails = getTransactionDetails();

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Top Section - Transaction Hash and Type */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-xs text-gray-500 font-medium mb-1">TX HASH</div>
            <div className="text-sm font-mono text-gray-900 break-all">
              {transaction.hash}
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${TYPE_COLORS[transaction.type]}`}>
            {txDetails.title}
          </div>
        </div>
        <div className="mt-2">
          <p className="text-sm text-gray-600">{txDetails.description}</p>
        </div>
      </div>

      {/* Bottom Section - Transaction-specific Details */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Transaction Details */}
          <div className="space-y-4">
            {txDetails.details.map((detail, index) => (
              <div key={index}>
                <div className="text-xs text-gray-500 font-medium mb-1">{detail.label}</div>
                <div className="text-sm font-mono text-gray-900 break-all">
                  {detail.value}
                </div>
              </div>
            ))}
            
            {/* Transaction Type Info */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 font-medium mb-1">TRANSACTION TYPE</div>
              <div className="text-sm text-gray-700">
                {transaction.type === 'Lend' && 'Supplying tokens to earn interest'}
                {transaction.type === 'Borrow' && 'Borrowing tokens against collateral'}
                {transaction.type === 'Withdraw' && 'Withdrawing supplied tokens'}
                {transaction.type === 'Repay' && 'Repaying borrowed tokens'}
                {transaction.type === 'Liquidate' && 'Liquidating undercollateralized position'}
              </div>
            </div>
          </div>

          {/* Right Column - Technical Details */}
          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-500 font-medium mb-1">GAS USED</div>
              <div className="text-sm font-mono text-gray-900">
                {parseInt(transaction.gasUsed || '0').toLocaleString()}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 font-medium mb-1">GAS PRICE</div>
              <div className="text-sm font-mono text-gray-900">
                {parseInt(transaction.gasPrice || '0').toLocaleString()} wei
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 font-medium mb-1">GAS FEE (ETH)</div>
              <div className="text-sm font-mono text-gray-900">
                {transaction.txFee} ETH
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Network fee paid in ETH
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 font-medium mb-1">GAS FEE (USD)</div>
              <div className="text-sm font-semibold text-gray-900">
                ${transaction.txFeeUSD || '0'}
              </div>
            </div>

            {/* Token Info */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-xs text-gray-500 font-medium mb-1">TRANSACTION TOKEN</div>
              <div className="text-sm font-semibold text-blue-700">
                {transaction.assetSymbol}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Contract: {formatAddress(transaction.asset)}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info Row */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>Block: #{transaction.blockNumber.toLocaleString()}</span>
              <span>•</span>
              <span>{formatDate(transaction.timestamp)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                ✓ Success
              </span>
              <a
                href={`https://etherscan.io/tx/${transaction.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                View on Etherscan →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
