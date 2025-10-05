import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

export interface Transaction {
  id: string;
  hash: string;
  type: 'Lend' | 'Withdraw' | 'Borrow' | 'Repay' | 'Liquidate';
  user: string;
  asset: string;
  assetSymbol: string;
  amount: string;
  amountUSD: string;
  timestamp: number;
  blockNumber: number;
  status: 'success' | 'pending' | 'failed';
}

interface UseTransactionHistoryReturn {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  clearHistory: () => void;
  refetch: () => Promise<void>;
}

const STORAGE_KEY = 'lendhub_transaction_history';
const STORAGE_VERSION = '1.0';
const MAX_TRANSACTIONS = 100; // Keep last 100 transactions

const LENDING_POOL_ABI = [
  'event Lend(address indexed user, address indexed asset, uint256 amount, uint256 timestamp)',
  'event Withdraw(address indexed user, address indexed asset, uint256 amount, uint256 timestamp)',
  'event Borrow(address indexed user, address indexed asset, uint256 amount, uint256 timestamp)',
  'event Repay(address indexed user, address indexed asset, uint256 amount, uint256 timestamp)',
  'event Liquidate(address indexed liquidator, address indexed borrower, address indexed collateralAsset, address debtAsset, uint256 debtToCover, uint256 collateralSeized, uint256 timestamp)',
  'function reserves(address) view returns (tuple(uint256 totalSupply, uint256 totalBorrows, uint256 supplyRate, uint256 borrowRate, uint256 utilizationRate, uint256 lastUpdate, uint16 ltvBps, uint16 liquidationThreshold, uint16 liquidationBonus))'
];

const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)'
];

/**
 * Hook to fetch and listen to transaction history from LendingPool events
 */
export function useTransactionHistory(
  provider: ethers.Provider | null,
  poolAddress: string,
  oracleAddress: string,
  userAddress?: string, // Optional: filter by user
  autoRefresh: boolean = false, // Auto-refresh on new blocks
  refreshInterval: number = 10000 // Refresh every 10 seconds if autoRefresh is true
): UseTransactionHistoryReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedVersion = localStorage.getItem(STORAGE_KEY + '_version');
      
      if (stored && storedVersion === STORAGE_VERSION) {
        const parsed = JSON.parse(stored);
        setTransactions(parsed);
        console.log('📜 Loaded transaction history from localStorage');
      }
    } catch (err) {
      console.error('Failed to load transaction history:', err);
    }
  }, []);

  // Save to localStorage whenever transactions change
  useEffect(() => {
    if (transactions.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        localStorage.setItem(STORAGE_KEY + '_version', STORAGE_VERSION);
      } catch (err) {
        console.error('Failed to save transaction history:', err);
      }
    }
  }, [transactions]);

  // Fetch asset symbol
  const getAssetSymbol = useCallback(async (provider: ethers.Provider, assetAddress: string): Promise<string> => {
    try {
      const tokenContract = new ethers.Contract(assetAddress, ERC20_ABI, provider);
      return await tokenContract.symbol();
    } catch (err) {
      console.warn('Failed to get asset symbol for:', assetAddress);
      return 'UNKNOWN';
    }
  }, []);

  // Fetch asset price
  const getAssetPrice = useCallback(async (provider: ethers.Provider, oracleAddress: string, assetAddress: string): Promise<number> => {
    try {
      const oracleABI = ['function getAssetPrice1e18(address) view returns (uint256)'];
      const oracle = new ethers.Contract(oracleAddress, oracleABI, provider);
      const price1e18 = await oracle.getAssetPrice1e18(assetAddress);
      return parseFloat(ethers.formatUnits(price1e18, 18));
    } catch (err) {
      console.warn('Failed to get asset price for:', assetAddress);
      return 0;
    }
  }, []);

  // Fetch transaction history
  const fetchTransactionHistory = useCallback(async () => {
    if (!provider || !poolAddress || poolAddress === '0x0000000000000000000000000000000000000000') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const pool = new ethers.Contract(poolAddress, LENDING_POOL_ABI, provider);
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Last ~10k blocks (adjust as needed)

      // Fetch all event types
      const [lendEvents, withdrawEvents, borrowEvents, repayEvents, liquidateEvents] = await Promise.all([
        pool.queryFilter(pool.filters.Lend(), fromBlock, currentBlock),
        pool.queryFilter(pool.filters.Withdraw(), fromBlock, currentBlock),
        pool.queryFilter(pool.filters.Borrow(), fromBlock, currentBlock),
        pool.queryFilter(pool.filters.Repay(), fromBlock, currentBlock),
        pool.queryFilter(pool.filters.Liquidate(), fromBlock, currentBlock),
      ]);

      const allTransactions: Transaction[] = [];

      // Process Lend events
      for (const event of lendEvents) {
        if (userAddress && event.args?.user.toLowerCase() !== userAddress.toLowerCase()) continue;
        
        const symbol = await getAssetSymbol(provider, event.args!.asset);
        const price = await getAssetPrice(provider, oracleAddress, event.args!.asset);
        const amount = ethers.formatUnits(event.args!.amount, 18);
        const amountUSD = (parseFloat(amount) * price).toFixed(2);

        allTransactions.push({
          id: `${event.transactionHash}-${event.index}`,
          hash: event.transactionHash,
          type: 'Lend',
          user: event.args!.user,
          asset: event.args!.asset,
          assetSymbol: symbol,
          amount,
          amountUSD,
          timestamp: Number(event.args!.timestamp),
          blockNumber: event.blockNumber,
          status: 'success'
        });
      }

      // Process Withdraw events
      for (const event of withdrawEvents) {
        if (userAddress && event.args?.user.toLowerCase() !== userAddress.toLowerCase()) continue;
        
        const symbol = await getAssetSymbol(provider, event.args!.asset);
        const price = await getAssetPrice(provider, oracleAddress, event.args!.asset);
        const amount = ethers.formatUnits(event.args!.amount, 18);
        const amountUSD = (parseFloat(amount) * price).toFixed(2);

        allTransactions.push({
          id: `${event.transactionHash}-${event.index}`,
          hash: event.transactionHash,
          type: 'Withdraw',
          user: event.args!.user,
          asset: event.args!.asset,
          assetSymbol: symbol,
          amount,
          amountUSD,
          timestamp: Number(event.args!.timestamp),
          blockNumber: event.blockNumber,
          status: 'success'
        });
      }

      // Process Borrow events
      for (const event of borrowEvents) {
        if (userAddress && event.args?.user.toLowerCase() !== userAddress.toLowerCase()) continue;
        
        const symbol = await getAssetSymbol(provider, event.args!.asset);
        const price = await getAssetPrice(provider, oracleAddress, event.args!.asset);
        const amount = ethers.formatUnits(event.args!.amount, 18);
        const amountUSD = (parseFloat(amount) * price).toFixed(2);

        allTransactions.push({
          id: `${event.transactionHash}-${event.index}`,
          hash: event.transactionHash,
          type: 'Borrow',
          user: event.args!.user,
          asset: event.args!.asset,
          assetSymbol: symbol,
          amount,
          amountUSD,
          timestamp: Number(event.args!.timestamp),
          blockNumber: event.blockNumber,
          status: 'success'
        });
      }

      // Process Repay events
      for (const event of repayEvents) {
        if (userAddress && event.args?.user.toLowerCase() !== userAddress.toLowerCase()) continue;
        
        const symbol = await getAssetSymbol(provider, event.args!.asset);
        const price = await getAssetPrice(provider, oracleAddress, event.args!.asset);
        const amount = ethers.formatUnits(event.args!.amount, 18);
        const amountUSD = (parseFloat(amount) * price).toFixed(2);

        allTransactions.push({
          id: `${event.transactionHash}-${event.index}`,
          hash: event.transactionHash,
          type: 'Repay',
          user: event.args!.user,
          asset: event.args!.asset,
          assetSymbol: symbol,
          amount,
          amountUSD,
          timestamp: Number(event.args!.timestamp),
          blockNumber: event.blockNumber,
          status: 'success'
        });
      }

      // Process Liquidate events
      for (const event of liquidateEvents) {
        if (userAddress && 
            event.args?.liquidator.toLowerCase() !== userAddress.toLowerCase() && 
            event.args?.borrower.toLowerCase() !== userAddress.toLowerCase()) continue;
        
        const symbol = await getAssetSymbol(provider, event.args!.collateralAsset);
        const price = await getAssetPrice(provider, oracleAddress, event.args!.collateralAsset);
        const amount = ethers.formatUnits(event.args!.collateralSeized, 18);
        const amountUSD = (parseFloat(amount) * price).toFixed(2);

        allTransactions.push({
          id: `${event.transactionHash}-${event.index}`,
          hash: event.transactionHash,
          type: 'Liquidate',
          user: event.args!.liquidator,
          asset: event.args!.collateralAsset,
          assetSymbol: symbol,
          amount,
          amountUSD,
          timestamp: Number(event.args!.timestamp),
          blockNumber: event.blockNumber,
          status: 'success'
        });
      }

      // Sort by timestamp (newest first)
      allTransactions.sort((a, b) => b.timestamp - a.timestamp);

      // Keep only last MAX_TRANSACTIONS
      const limitedTransactions = allTransactions.slice(0, MAX_TRANSACTIONS);

      setTransactions(limitedTransactions);
      console.log(`✅ Fetched ${limitedTransactions.length} transactions`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch transaction history';
      console.error('Error fetching transaction history:', err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [provider, poolAddress, oracleAddress, userAddress, getAssetSymbol, getAssetPrice]);

  // Initial fetch
  useEffect(() => {
    fetchTransactionHistory();
  }, [fetchTransactionHistory]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !provider) return;

    const intervalId = setInterval(() => {
      fetchTransactionHistory();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchTransactionHistory, provider]);

  const clearHistory = useCallback(() => {
    setTransactions([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY + '_version');
  }, []);

  const refetch = useCallback(async () => {
    await fetchTransactionHistory();
  }, [fetchTransactionHistory]);

  return {
    transactions,
    isLoading,
    error,
    clearHistory,
    refetch
  };
}

