import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONFIG } from '@/config/contracts';
// @ts-ignore - addresses.js is a JS file
const addresses = require('@/addresses');
import { POOL_ABI } from '@/config/abis';

const LendingPoolAddress = addresses.LendingPoolAddress;
const WETHAddress = addresses.WETHAddress;
const DAIAddress = addresses.DAIAddress;
const USDCAddress = addresses.USDCAddress;
const LINKAddress = addresses.LINKAddress;

// Get the first non-zero address (in case of duplicates)
const getAssetAddress = (symbol: string): string | null => {
  const addresses: { [key: string]: string[] } = {
    'WETH': [WETHAddress],
    'DAI': [DAIAddress],
    'USDC': [USDCAddress],
    'LINK': [LINKAddress],
  };
  
  const addrList = addresses[symbol];
  if (!addrList || addrList.length === 0) return null;
  
  // Return first non-zero address
  for (const addr of addrList) {
    if (addr && addr !== '0x0000000000000000000000000000000000000000') {
      return addr;
    }
  }
  
  return null;
};

export interface ReserveData {
  ltvBps: number; // Loan-to-Value in basis points (e.g., 7500 = 75%)
  liqThresholdBps: number; // Liquidation threshold in basis points
  liqBonusBps: number; // Liquidation bonus in basis points
  reserveFactorBps: number; // Reserve factor in basis points
  isBorrowable: boolean;
  supplyCap?: string; // Max total supplied liquidity (tokens), 0 = unlimited
  borrowCap?: string; // Max total outstanding debt (tokens), 0 = unlimited
}

export function useReserveData(assetSymbol: string | null, refreshIntervalMs: number = 10000) {
  const [reserveData, setReserveData] = useState<ReserveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReserveData = useCallback(
    async (isInitialLoad: boolean = false, isCancelled?: () => boolean) => {
      if (!assetSymbol) {
        if (!isCancelled || !isCancelled()) {
          setReserveData(null);
          setLoading(false);
        }
        return;
      }

      const assetAddress = getAssetAddress(assetSymbol);
      if (!assetAddress) {
        if (!isCancelled || !isCancelled()) {
          setReserveData(null);
          setLoading(false);
        }
        return;
      }

      try {
        if (isInitialLoad) {
          setLoading(true);
        }
        setError(null);

        const rpcProvider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
        const lendingPool = new ethers.Contract(LendingPoolAddress, POOL_ABI, rpcProvider);

        // Fetch core reserve data + caps in parallel
        const [reserve, supplyCapRaw, borrowCapRaw] = await Promise.all([
          lendingPool.reserves(assetAddress),
          lendingPool.supplyCaps(assetAddress),
          lendingPool.borrowCaps(assetAddress),
        ]);

        if (isCancelled && isCancelled()) return;

        // Convert caps (stored in 1e18) to whole-token display strings
        const formatCap = (cap: any): string => {
          try {
            const capBig = BigInt(cap.toString());
            if (capBig === 0n) return '0';
            // Format to tokens (divide by 1e18) and strip trailing .0
            const tokens = ethers.formatUnits(capBig, 18);
            return tokens.replace(/\.0+$/, '');
          } catch {
            return '0';
          }
        };

        setReserveData({
          ltvBps: Number(reserve.ltvBps),
          liqThresholdBps: Number(reserve.liqThresholdBps),
          liqBonusBps: Number(reserve.liqBonusBps),
          reserveFactorBps: Number(reserve.reserveFactorBps),
          isBorrowable: reserve.isBorrowable,
          supplyCap: formatCap(supplyCapRaw),
          borrowCap: formatCap(borrowCapRaw),
        });
      } catch (err: any) {
        if (isCancelled && isCancelled()) return;
        console.error('Error fetching reserve data:', err);
        setError(err.message || 'Failed to fetch reserve data');
        setReserveData(null);
      } finally {
        if (isInitialLoad && (!isCancelled || !isCancelled())) {
          setLoading(false);
        }
      }
    },
    [assetSymbol]
  );

  useEffect(() => {
    let cancelled = false;

    const runFetch = (isInitial: boolean) => {
      fetchReserveData(isInitial, () => cancelled);
    };

    runFetch(true);

    if (refreshIntervalMs > 0) {
      const intervalId = setInterval(() => runFetch(false), refreshIntervalMs);
      return () => {
        cancelled = true;
        clearInterval(intervalId);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [fetchReserveData, refreshIntervalMs]);

  const refresh = useCallback(() => fetchReserveData(false), [fetchReserveData]);

  return { reserveData, loading, error, refresh };
}

