import { useState, useEffect, useCallback } from 'react';

export interface MongoTransaction {
  _id: string;
  hash: string;
  type: 'Lend' | 'Withdraw' | 'Borrow' | 'Repay' | 'Liquidate';
  user: string;
  asset: {
    address: string;
    symbol: string;
    decimals: number;
  };
  amount: string;
  amountUSD: string;
  timestamp: number;
  blockNumber: number;
  status: 'success' | 'pending' | 'failed';
  gasUsed?: string;
  gasPrice?: string;
  txFee?: string;
  txFeeUSD?: string;
}

interface UseMongoTransactionsReturn {
  transactions: MongoTransaction[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
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

/**
 * Hook to fetch transaction history from MongoDB via API
 */
export function useMongoTransactions(
  userAddress?: string,
  autoRefresh: boolean = true,
  refreshInterval: number = 15000 // Refresh every 15 seconds
): UseMongoTransactionsReturn {
  const [transactions, setTransactions] = useState<MongoTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate statistics
  const totalVolume = transactions.reduce((sum, tx) => sum + parseFloat(tx.amountUSD || '0'), 0);
  const totalFees = transactions.reduce((sum, tx) => sum + parseFloat(tx.txFeeUSD || '0'), 0);
  
  const transactionStats = {
    totalLend: transactions.filter(tx => tx.type === 'Lend').length,
    totalWithdraw: transactions.filter(tx => tx.type === 'Withdraw').length,
    totalBorrow: transactions.filter(tx => tx.type === 'Borrow').length,
    totalRepay: transactions.filter(tx => tx.type === 'Repay').length,
    totalLiquidate: transactions.filter(tx => tx.type === 'Liquidate').length,
  };

  // Fetch transactions from API
  const fetchTransactions = useCallback(async () => {
    if (!userAddress || userAddress === 'all') {
      // If no specific address, fetch all transactions
      const params = new URLSearchParams({
        limit: '100',
        offset: '0'
      });
      
      try {
        const response = await fetch(`/api/transactions?${params}`);
        const data = await response.json();
        
        if (data.success) {
          setTransactions(data.data.transactions || []);
          console.log(`✅ Fetched ${data.data.transactions?.length || 0} transactions from MongoDB (all users)`);
        }
      } catch (err) {
        console.error('Error fetching all transactions:', err);
        setError('Failed to fetch transactions');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        user: userAddress,
        limit: '100',
        offset: '0'
      });

      const response = await fetch(`/api/transactions?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }

      if (data.success) {
        setTransactions(data.data.transactions || []);
        console.log(`✅ Fetched ${data.data.transactions?.length || 0} transactions from MongoDB`);
      } else {
        throw new Error(data.error || 'API returned error');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch transactions';
      console.error('Error fetching transactions from MongoDB:', err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  // Initial fetch
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !userAddress) return;

    const intervalId = setInterval(() => {
      fetchTransactions();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchTransactions, userAddress]);

  const refetch = useCallback(async () => {
    await fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    isLoading,
    error,
    refetch,
    totalVolume,
    totalFees,
    transactionStats
  };
}
