import { useState, useEffect } from 'react';
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
}

export function useReserveData(assetSymbol: string | null) {
  const [reserveData, setReserveData] = useState<ReserveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assetSymbol) {
      setReserveData(null);
      return;
    }

    const assetAddress = getAssetAddress(assetSymbol);
    if (!assetAddress) {
      setReserveData(null);
      return;
    }

    const fetchReserveData = async () => {
      try {
        setLoading(true);
        setError(null);

        const rpcProvider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
        const lendingPool = new ethers.Contract(LendingPoolAddress, POOL_ABI, rpcProvider);
        
        const reserve = await lendingPool.reserves(assetAddress);

        setReserveData({
          ltvBps: Number(reserve.ltvBps),
          liqThresholdBps: Number(reserve.liqThresholdBps),
          liqBonusBps: Number(reserve.liqBonusBps),
          reserveFactorBps: Number(reserve.reserveFactorBps),
          isBorrowable: reserve.isBorrowable,
        });
      } catch (err: any) {
        console.error('Error fetching reserve data:', err);
        setError(err.message || 'Failed to fetch reserve data');
        setReserveData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReserveData();
  }, [assetSymbol]);

  return { reserveData, loading, error };
}

