import React, { useState, useEffect } from 'react';
import { useTransactionHistory, Transaction } from '../hooks/useTransactionHistory';

interface DetailedTransactionHistoryProps {
  provider: any;
  poolAddress: string;
  oracleAddress: string;
  userAddress?: string;
}

export function DetailedTransactionHistory({ 
  provider, 
  poolAddress, 
  oracleAddress, 
  userAddress 
}: DetailedTransactionHistoryProps) {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [txDetails, setTxDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const { 
    transactions, 
    isLoading, 
    error, 
    clearHistory, 
    refetch,
    totalVolume,
    totalFees,
    transactionStats
  } = useTransactionHistory(
    provider,
    poolAddress,
    oracleAddress,
    userAddress,
    true,
    15000
  );

  // Fetch detailed transaction information
  const fetchTransactionDetails = async (tx: Transaction) => {
    if (!provider) return;
    
    setIsLoadingDetails(true);
    try {
      const txReceipt = await provider.getTransactionReceipt(tx.hash);
      const txData = await provider.getTransaction(tx.hash);
      
      if (txReceipt && txData) {
        setTxDetails({
          gasUsed: txReceipt.gasUsed.toString(),
          gasPrice: txData.gasPrice?.toString() || '0',
          effectiveGasPrice: txReceipt.gasPrice?.toString() || '0',
          status: txReceipt.status === 1 ? 'Success' : 'Failed',
          from: txData.from,
          to: txData.to,
          value: txData.value?.toString() || '0',
          nonce: txData.nonce,
          blockHash: txReceipt.blockHash,
          transactionIndex: txReceipt.transactionIndex,
          logs: txReceipt.logs,
          contractAddress: txReceipt.contractAddress
        });
      }
    } catch (error) {
      console.error('Error fetching transaction details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatValue = (value: string) => {
    const ethValue = parseFloat(value) / 1e18;
    return ethValue.toFixed(6);
  };

  const formatGasPrice = (gasPrice: string) => {
    const gwei = parseFloat(gasPrice) / 1e9;
    return `${gwei.toFixed(2)} Gwei`;
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

  const getStatusColor = (status: string) => {
    return status === 'Success' ? 'text-green-600' : 'text-red-600';
  };

  const getStatusBg = (status: string) => {
    return status === 'Success' ? 'bg-green-50' : 'bg-red-50';
  };

  if (isLoading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading transaction history...</p>
        </div>
      </div>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="font-semibold">Error loading transactions</p>
          <p className="text-sm mt-2">{error}</p>
          <button
            onClick={refetch}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
                onClick={refetch}
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
        {userAddress && transactions.length > 0 && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-slate-800/80">
              <div className="text-sm text-slate-400 mb-2">Total Volume</div>
              <div className="text-3xl font-bold text-white">${totalVolume.toLocaleString()}</div>
            </div>
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-slate-800/80">
              <div className="text-sm text-slate-400 mb-2">Total Fees</div>
              <div className="text-3xl font-bold text-white">${totalFees.toLocaleString()}</div>
            </div>
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-slate-800/80">
              <div className="text-sm text-slate-400 mb-2">Transactions</div>
              <div className="text-3xl font-bold text-white">{transactions.length}</div>
            </div>
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-slate-800/80">
              <div className="text-sm text-slate-400 mb-2">Success Rate</div>
              <div className="text-3xl font-bold text-green-400">100%</div>
            </div>
          </div>
        )}

        {/* Transaction List */}
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-32 h-32 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-8">
                <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">No transactions found</h3>
              <p className="text-slate-400 max-w-md mx-auto text-lg">
                Transactions will appear here once you start lending, borrowing, or interacting with the protocol.
              </p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 hover:bg-slate-800/80 hover:border-slate-600/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl group"
                onClick={() => {
                  setSelectedTx(tx);
                  fetchTransactionDetails(tx);
                }}
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
                        {parseInt(tx.gasUsed || '0').toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <div>
                      <div className="text-sm text-slate-400 mb-2 font-medium">TO CONTRACT:</div>
                      <div className="text-white font-mono text-sm bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                        {formatAddress(poolAddress)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-slate-400 mb-2 font-medium">VALUE:</div>
                      <div className="text-white font-mono text-sm bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                        {formatValue(txDetails?.value || '0')} ETH
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
                        ${parseFloat(tx.amountUSD).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-slate-400 text-sm bg-slate-900/50 px-3 py-1 rounded-lg">
                      {formatDate(tx.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Transaction Details Modal */}
        {selectedTx && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800/95 backdrop-blur-md rounded-2xl border border-slate-700/50 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-white">Transaction Details</h2>
                  <button
                    onClick={() => setSelectedTx(null)}
                    className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {isLoadingDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Transaction Hash */}
                    <div>
                      <div className="text-sm text-slate-400 mb-3 font-medium">Transaction Hash</div>
                      <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                        <div className="text-blue-400 font-mono text-sm break-all">
                          {selectedTx.hash}
                        </div>
                      </div>
                    </div>

                    {/* From/To */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="text-sm text-slate-400 mb-3 font-medium">From</div>
                        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                          <div className="text-white font-mono text-sm">
                            {formatAddress(selectedTx.user)}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400 mb-3 font-medium">To</div>
                        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                          <div className="text-white font-mono text-sm">
                            {formatAddress(poolAddress)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gas Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <div className="text-sm text-slate-400 mb-3 font-medium">Gas Used</div>
                        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                          <div className="text-white font-mono text-sm">
                            {txDetails?.gasUsed ? parseInt(txDetails.gasUsed).toLocaleString() : 'Loading...'}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400 mb-3 font-medium">Gas Price</div>
                        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                          <div className="text-white font-mono text-sm">
                            {txDetails?.gasPrice ? formatGasPrice(txDetails.gasPrice) : 'Loading...'}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400 mb-3 font-medium">Status</div>
                        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                          <div className={`font-mono text-sm ${getStatusColor(txDetails?.status || 'Success')}`}>
                            {txDetails?.status || 'Success'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Transaction Value */}
                    <div>
                      <div className="text-sm text-slate-400 mb-3 font-medium">Value</div>
                      <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                        <div className="text-white font-mono text-sm">
                          {txDetails?.value ? formatValue(txDetails.value) : '0.000000'} ETH
                        </div>
                      </div>
                    </div>

                    {/* Block Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="text-sm text-slate-400 mb-3 font-medium">Block Number</div>
                        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                          <div className="text-white font-mono text-sm">
                            #{selectedTx.blockNumber.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400 mb-3 font-medium">Timestamp</div>
                        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                          <div className="text-white font-mono text-sm">
                            {formatDate(selectedTx.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Transaction Type and Amount */}
                    <div>
                      <div className="text-sm text-slate-400 mb-3 font-medium">Transaction Type</div>
                      <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                        <div className="text-white font-mono text-sm">
                          {selectedTx.type} - {selectedTx.amount} {selectedTx.assetSymbol} (${parseFloat(selectedTx.amountUSD).toLocaleString()})
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator when refreshing */}
        {isLoading && transactions.length > 0 && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
              <span className="font-medium">Refreshing transactions...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
