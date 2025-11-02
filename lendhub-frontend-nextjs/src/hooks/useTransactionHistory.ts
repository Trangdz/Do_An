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
  gasUsed?: string;
  gasPrice?: string;
  txFee?: string;
  txFeeUSD?: string;
}

interface UseTransactionHistoryReturn {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  clearHistory: () => void;
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

  // Calculate statistics
  const totalVolume = transactions.reduce((sum, tx) => sum + parseFloat(tx.amountUSD), 0);
  const totalFees = transactions.reduce((sum, tx) => sum + parseFloat(tx.txFeeUSD || '0'), 0);
  
  const transactionStats = {
    totalLend: transactions.filter(tx => tx.type === 'Lend').length,
    totalWithdraw: transactions.filter(tx => tx.type === 'Withdraw').length,
    totalBorrow: transactions.filter(tx => tx.type === 'Borrow').length,
    totalRepay: transactions.filter(tx => tx.type === 'Repay').length,
    totalLiquidate: transactions.filter(tx => tx.type === 'Liquidate').length,
  };

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
      const getAssetSymbol = useCallback(async (assetAddress: string): Promise<string> => {
        try {
          const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
          const tokenContract = new ethers.Contract(assetAddress, ERC20_ABI, rpcProvider);
          return await tokenContract.symbol();
        } catch (err) {
          console.warn('Failed to get asset symbol for:', assetAddress);
          return 'UNKNOWN';
        }
      }, []);

      const getAssetDecimals = useCallback(async (assetAddress: string): Promise<number> => {
        try {
          const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
          const tokenContract = new ethers.Contract(assetAddress, ERC20_ABI, rpcProvider);
          const d: number = await tokenContract.decimals();
          return Number(d);
        } catch (err) {
          // Default to 18 if not an ERC20 or call fails
          return 18;
        }
      }, []);

      // Fetch asset price
      const getAssetPrice = useCallback(async (oracleAddress: string, assetAddress: string): Promise<number> => {
        try {
          const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
          const oracleABI = ['function getAssetPrice1e18(address) view returns (uint256)'];
          const oracle = new ethers.Contract(oracleAddress, oracleABI, rpcProvider);
          const price1e18 = await oracle.getAssetPrice1e18(assetAddress);
          return parseFloat(ethers.formatUnits(price1e18, 18));
        } catch (err) {
          console.warn('Failed to get asset price for:', assetAddress);
          return 0;
        }
      }, []);

      // Fetch transaction details including gas info
      const getTransactionDetails = useCallback(async (txHash: string): Promise<{gasUsed: string, gasPrice: string, txFee: string, txFeeUSD: string}> => {
        try {
          const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
          const tx = await rpcProvider.getTransaction(txHash);
          const receipt = await rpcProvider.getTransactionReceipt(txHash);
      
      if (!tx || !receipt) {
        return { gasUsed: '0', gasPrice: '0', txFee: '0', txFeeUSD: '0' };
      }

      const gasUsed = receipt.gasUsed.toString();
      const gasPrice = tx.gasPrice?.toString() || '0';
      const txFee = (BigInt(gasUsed) * BigInt(gasPrice)).toString();
      const txFeeETH = parseFloat(ethers.formatEther(txFee));
      const ethPrice = await getAssetPrice(oracleAddress, '0x0000000000000000000000000000000000000000'); // ETH price
      const txFeeUSD = (txFeeETH * ethPrice).toFixed(2);

      return {
        gasUsed,
        gasPrice,
        txFee: ethers.formatEther(txFee),
        txFeeUSD
      };
    } catch (err) {
      console.warn('Failed to get transaction details for:', txHash);
      return { gasUsed: '0', gasPrice: '0', txFee: '0', txFeeUSD: '0' };
    }
  }, [oracleAddress, getAssetPrice]);

  // Fetch transaction history
  const fetchTransactionHistory = useCallback(async () => {
    if (!poolAddress || poolAddress === '0x0000000000000000000000000000000000000000') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use RPC provider directly to avoid MetaMask circuit breaker
      const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
      const pool = new ethers.Contract(poolAddress, LENDING_POOL_ABI, rpcProvider);
      const currentBlock = await rpcProvider.getBlockNumber();
      // Use last scanned block from localStorage to avoid duplicates and speed up
      const lastScannedStr = localStorage.getItem(STORAGE_KEY + '_lastBlock');
      const lastScanned = lastScannedStr ? parseInt(lastScannedStr, 10) : Math.max(0, currentBlock - 2000);
      const fromBlock = Math.min(currentBlock, Math.max(0, lastScanned + 1));
      
      console.log(`🔍 Scanning blocks ${fromBlock} to ${currentBlock} (${currentBlock - fromBlock + 1} blocks)`);
      console.log(`📊 Last scanned: ${lastScanned}, Current: ${currentBlock}`);

      // Fetch all event types with error handling
      const [lendEvents, withdrawEvents, borrowEvents, repayEvents, liquidateEvents] = await Promise.all([
        pool.queryFilter(pool.filters.Lend(), fromBlock, currentBlock).catch(err => {
          console.warn('Failed to fetch Lend events:', err);
          return [];
        }),
        pool.queryFilter(pool.filters.Withdraw(), fromBlock, currentBlock).catch(err => {
          console.warn('Failed to fetch Withdraw events:', err);
          return [];
        }),
        pool.queryFilter(pool.filters.Borrow(), fromBlock, currentBlock).catch(err => {
          console.warn('Failed to fetch Borrow events:', err);
          return [];
        }),
        pool.queryFilter(pool.filters.Repay(), fromBlock, currentBlock).catch(err => {
          console.warn('Failed to fetch Repay events:', err);
          return [];
        }),
        pool.queryFilter(pool.filters.Liquidate(), fromBlock, currentBlock).catch(err => {
          console.warn('Failed to fetch Liquidate events:', err);
          return [];
        }),
      ]);

      console.log(`📈 Events found: Lend(${lendEvents.length}), Withdraw(${withdrawEvents.length}), Borrow(${borrowEvents.length}), Repay(${repayEvents.length}), Liquidate(${liquidateEvents.length})`);

      const allTransactions: Transaction[] = [];

      // Process Lend events
      for (const event of lendEvents) {
        if (userAddress && event.args?.user.toLowerCase() !== userAddress.toLowerCase()) continue;
        
        const assetAddr = event.args!.asset;
        const symbol = await getAssetSymbol(assetAddr);
        const decimals = await getAssetDecimals(assetAddr);
        const price = await getAssetPrice(oracleAddress, assetAddr);
        const amount = ethers.formatUnits(event.args!.amount, decimals);
        // USD = amountRaw * price / 1e18 using BigInt for precision
        const priceWei = BigInt(Math.trunc(price * 1e18).toString());
        const amountRaw = BigInt(event.args!.amount.toString());
        const usdWei = (amountRaw * priceWei) / BigInt(1e18);
        const amountUSD = parseFloat(ethers.formatUnits(usdWei, 18)).toFixed(2);
        const txDetails = await getTransactionDetails(event.transactionHash);
        const blk = await rpcProvider.getBlock(event.blockHash);

        allTransactions.push({
          id: `${event.transactionHash}-${event.index}`,
          hash: event.transactionHash,
          type: 'Lend',
          user: event.args!.user,
          asset: event.args!.asset,
          assetSymbol: symbol,
          amount,
          amountUSD,
          timestamp: blk?.timestamp ? Number(blk.timestamp) : Number(event.args!.timestamp),
          blockNumber: event.blockNumber,
          status: 'success',
          gasUsed: txDetails.gasUsed,
          gasPrice: txDetails.gasPrice,
          txFee: txDetails.txFee,
          txFeeUSD: txDetails.txFeeUSD
        });
      }

      // Process Withdraw events
      for (const event of withdrawEvents) {
        if (userAddress && event.args?.user.toLowerCase() !== userAddress.toLowerCase()) continue;
        
        const assetAddr = event.args!.asset;
        const symbol = await getAssetSymbol(assetAddr);
        const decimals = await getAssetDecimals(assetAddr);
        const price = await getAssetPrice(oracleAddress, assetAddr);
        const amount = ethers.formatUnits(event.args!.amount, decimals);
        const priceWei = BigInt(Math.trunc(price * 1e18).toString());
        const amountRaw = BigInt(event.args!.amount.toString());
        const usdWei = (amountRaw * priceWei) / BigInt(1e18);
        const amountUSD = parseFloat(ethers.formatUnits(usdWei, 18)).toFixed(2);
        const txDetails = await getTransactionDetails(event.transactionHash);
        const blk = await rpcProvider.getBlock(event.blockHash);

        allTransactions.push({
          id: `${event.transactionHash}-${event.index}`,
          hash: event.transactionHash,
          type: 'Withdraw',
          user: event.args!.user,
          asset: event.args!.asset,
          assetSymbol: symbol,
          amount,
          amountUSD,
          timestamp: blk?.timestamp ? Number(blk.timestamp) : Number(event.args!.timestamp),
          blockNumber: event.blockNumber,
          status: 'success',
          gasUsed: txDetails.gasUsed,
          gasPrice: txDetails.gasPrice,
          txFee: txDetails.txFee,
          txFeeUSD: txDetails.txFeeUSD
        });
      }

      // Process Borrow events
      for (const event of borrowEvents) {
        if (userAddress && event.args?.user.toLowerCase() !== userAddress.toLowerCase()) continue;
        
        const assetAddr = event.args!.asset;
        const symbol = await getAssetSymbol(assetAddr);
        const decimals = await getAssetDecimals(assetAddr);
        const price = await getAssetPrice(oracleAddress, assetAddr);
        const amount = ethers.formatUnits(event.args!.amount, decimals);
        const priceWei = BigInt(Math.trunc(price * 1e18).toString());
        const amountRaw = BigInt(event.args!.amount.toString());
        const usdWei = (amountRaw * priceWei) / BigInt(1e18);
        const amountUSD = parseFloat(ethers.formatUnits(usdWei, 18)).toFixed(2);
        const txDetails = await getTransactionDetails(event.transactionHash);
        const blk = await rpcProvider.getBlock(event.blockHash);

        allTransactions.push({
          id: `${event.transactionHash}-${event.index}`,
          hash: event.transactionHash,
          type: 'Borrow',
          user: event.args!.user,
          asset: event.args!.asset,
          assetSymbol: symbol,
          amount,
          amountUSD,
          timestamp: blk?.timestamp ? Number(blk.timestamp) : Number(event.args!.timestamp),
          blockNumber: event.blockNumber,
          status: 'success',
          gasUsed: txDetails.gasUsed,
          gasPrice: txDetails.gasPrice,
          txFee: txDetails.txFee,
          txFeeUSD: txDetails.txFeeUSD
        });
      }

      // Process Repay events
      for (const event of repayEvents) {
        if (userAddress && event.args?.user.toLowerCase() !== userAddress.toLowerCase()) continue;
        
        const assetAddr = event.args!.asset;
        const symbol = await getAssetSymbol(assetAddr);
        const decimals = await getAssetDecimals(assetAddr);
        const price = await getAssetPrice(oracleAddress, assetAddr);
        const amount = ethers.formatUnits(event.args!.amount, decimals);
        const priceWei = BigInt(Math.trunc(price * 1e18).toString());
        const amountRaw = BigInt(event.args!.amount.toString());
        const usdWei = (amountRaw * priceWei) / BigInt(1e18);
        const amountUSD = parseFloat(ethers.formatUnits(usdWei, 18)).toFixed(2);
        const txDetails = await getTransactionDetails(event.transactionHash);
        const blk = await rpcProvider.getBlock(event.blockHash);

        allTransactions.push({
          id: `${event.transactionHash}-${event.index}`,
          hash: event.transactionHash,
          type: 'Repay',
          user: event.args!.user,
          asset: event.args!.asset,
          assetSymbol: symbol,
          amount,
          amountUSD,
          timestamp: blk?.timestamp ? Number(blk.timestamp) : Number(event.args!.timestamp),
          blockNumber: event.blockNumber,
          status: 'success',
          gasUsed: txDetails.gasUsed,
          gasPrice: txDetails.gasPrice,
          txFee: txDetails.txFee,
          txFeeUSD: txDetails.txFeeUSD
        });
      }

      // Process Liquidate events
      for (const event of liquidateEvents) {
        if (userAddress && 
            event.args?.liquidator.toLowerCase() !== userAddress.toLowerCase() && 
            event.args?.borrower.toLowerCase() !== userAddress.toLowerCase()) continue;
        
        const assetAddr = event.args!.collateralAsset;
        const symbol = await getAssetSymbol(assetAddr);
        const decimals = await getAssetDecimals(assetAddr);
        const price = await getAssetPrice(oracleAddress, assetAddr);
        const amount = ethers.formatUnits(event.args!.collateralSeized, decimals);
        const priceWei = BigInt(Math.trunc(price * 1e18).toString());
        const amountRaw = BigInt(event.args!.collateralSeized.toString());
        const usdWei = (amountRaw * priceWei) / BigInt(1e18);
        const amountUSD = parseFloat(ethers.formatUnits(usdWei, 18)).toFixed(2);
        const txDetails = await getTransactionDetails(event.transactionHash);
        const blk = await rpcProvider.getBlock(event.blockHash);

        allTransactions.push({
          id: `${event.transactionHash}-${event.index}`,
          hash: event.transactionHash,
          type: 'Liquidate',
          user: event.args!.liquidator,
          asset: event.args!.collateralAsset,
          assetSymbol: symbol,
          amount,
          amountUSD,
          timestamp: blk?.timestamp ? Number(blk.timestamp) : Number(event.args!.timestamp),
          blockNumber: event.blockNumber,
          status: 'success',
          gasUsed: txDetails.gasUsed,
          gasPrice: txDetails.gasPrice,
          txFee: txDetails.txFee,
          txFeeUSD: txDetails.txFeeUSD
        });
      }

      // Dedupe by (hash + type + blockNumber + amount) to avoid double entries from overlaps
      const seen = new Set<string>();
      const uniqueTransactions: Transaction[] = [];
      for (const tx of allTransactions) {
        const key = `${tx.hash}-${tx.type}-${tx.blockNumber}-${tx.amount}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueTransactions.push(tx);
        }
      }

      // Sort by timestamp (newest first)
      uniqueTransactions.sort((a, b) => b.timestamp - a.timestamp);

      // Keep only last MAX_TRANSACTIONS
      const limitedTransactions = uniqueTransactions.slice(0, MAX_TRANSACTIONS);

      setTransactions(limitedTransactions);
      try { localStorage.setItem(STORAGE_KEY + '_lastBlock', String(currentBlock)); } catch {}
      console.log(`✅ Fetched ${limitedTransactions.length} transactions (from block ${fromBlock} to ${currentBlock})`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch transaction history';
      console.error('Error fetching transaction history:', err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [poolAddress, oracleAddress, userAddress, getAssetSymbol, getAssetPrice, getAssetDecimals]);

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
    refetch,
    totalVolume,
    totalFees,
    transactionStats
  };
}

