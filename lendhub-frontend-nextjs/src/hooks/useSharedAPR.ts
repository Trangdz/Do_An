import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

type APRKey = string; // `${pool}-${asset}`

interface APRData {
  supplyAPR: number; // percent, e.g. 0.24 -> 0.24%
  borrowAPR: number; // percent
  utilization: number; // percent
  available: number; // raw units (not USD)
  isLoading: boolean;
  error?: string;
  updatedAt: number;
}

const SECONDS_PER_YEAR = 31536000;
const RAY = 1e27;

const store: Map<APRKey, APRData> = new Map();
const listeners: Map<APRKey, Set<() => void>> = new Map();
const timers: Map<APRKey, any> = new Map();
const blockThrottleTimers: Map<APRKey, any> = new Map();

function getKey(poolAddress: string, assetAddress: string): APRKey {
  const pool = poolAddress?.toLowerCase() || '';
  const asset = assetAddress?.toLowerCase() || '';
  return `${pool}-${asset}`;
}

async function fetchAPR(
  provider: ethers.Provider,
  poolAddress: string,
  assetAddress: string
): Promise<APRData> {
  const abi = [
    'function reserves(address asset) view returns (tuple(uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate))'
  ];

  try {
    const pool = new ethers.Contract(poolAddress, abi, provider);
    const r = await pool.reserves(assetAddress);

    // Check if reserve is initialized (lastUpdate == 0 means not initialized)
    if (!r || r.lastUpdate === 0) {
      return {
        supplyAPR: 0,
        borrowAPR: 0,
        utilization: 0,
        available: 0,
        isLoading: false,
        error: 'Reserve not initialized',
        updatedAt: Date.now()
      };
    }

    // rates (per second, decimal)
    const liquidityRatePerSec = Number(r.liquidityRateRayPerSec) / RAY;
    const variableBorrowRatePerSec = Number(r.variableBorrowRateRayPerSec) / RAY;

    const supplyAPR = liquidityRatePerSec * SECONDS_PER_YEAR * 100; // percent
    const borrowAPR = variableBorrowRatePerSec * SECONDS_PER_YEAR * 100; // percent

    // CRITICAL: The lending pool contract stores reserveCash with 18 decimals (WAD format)
    // This is a standard practice in DeFi protocols - all amounts are normalized to 18 decimals
    // regardless of the actual token decimals (e.g., USDC has 6 decimals, but reserveCash is stored with 18)
    // Therefore, we MUST format reserveCash with 18 decimals, NOT with reserve.decimals
    const RESERVE_CASH_DECIMALS = 18; // Contract stores reserveCash with 18 decimals (WAD format)
    const reserveCash = Number(ethers.formatUnits(r.reserveCash, RESERVE_CASH_DECIMALS));
    const totalDebt = Number(ethers.formatUnits(r.totalDebtPrincipal, RESERVE_CASH_DECIMALS));
    const sum = reserveCash + totalDebt;
    const utilization = sum > 0 ? (totalDebt / sum) * 100 : 0;

    return {
      supplyAPR,
      borrowAPR,
      utilization,
      // Convert to token units
      available: reserveCash,
      isLoading: false,
      updatedAt: Date.now()
    };
  } catch (error: any) {
    // Handle errors gracefully - return zeros if reserve not initialized
    const errorMessage = error?.message || 'Unknown error';
    const isReserveNotInitialized = 
      errorMessage.includes('Reserve not initialized') ||
      error?.code === 'CALL_EXCEPTION' ||
      error?.code === 'BAD_DATA';
    
    return {
      supplyAPR: 0,
      borrowAPR: 0,
      utilization: 0,
      available: 0,
      isLoading: false,
      error: isReserveNotInitialized ? undefined : errorMessage,
      updatedAt: Date.now()
    };
  }
}

export function useSharedAPR(
  provider: ethers.Provider | null, // No longer used, kept for API compatibility
  poolAddress: string,
  assetAddress: string,
  refreshMs: number = 30000,
  reactToBlocks: boolean = true
) {
  const key = getKey(poolAddress, assetAddress);
  const [data, setData] = useState<APRData>(() => {
    return store.get(key) || {
      supplyAPR: 0,
      borrowAPR: 0,
      utilization: 0,
      available: 0,
      isLoading: true,
      updatedAt: 0
    };
  });

  useEffect(() => {
    if (!poolAddress || !assetAddress) return;

    // Use RPC provider directly to avoid MetaMask circuit breaker
    const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');

    // Subscribe
    if (!listeners.has(key)) listeners.set(key, new Set());
    const subs = listeners.get(key)!;
    const notify = () => setData({ ...(store.get(key) as APRData) });
    subs.add(notify);

    // Start polling if not started
    const start = async () => {
      const doFetch = async () => {
        try {
          const next = await fetchAPR(rpcProvider, poolAddress, assetAddress);
          store.set(key, next);
          listeners.get(key)?.forEach(fn => fn());
        } catch (e: any) {
          const err: APRData = {
            supplyAPR: 0,
            borrowAPR: 0,
            utilization: 0,
            available: 0,
            isLoading: false,
            error: e?.message || 'Failed to fetch APR',
            updatedAt: Date.now()
          };
          store.set(key, err);
          listeners.get(key)?.forEach(fn => fn());
        }
      };

      if (!timers.has(key)) {
        // Align first tick to wall clock so all cards refresh cùng lúc
        const delay = refreshMs - (Date.now() % refreshMs);
        const timeout = setTimeout(() => {
          doFetch();
          const interval = setInterval(doFetch, refreshMs);
          timers.set(key, interval);
        }, delay);
        timers.set(key, timeout);
        // kick off immediately for first render and notify after fetch
        doFetch();
      }
      // If we already have cached data from previous subscribers, push it now
      if (store.has(key)) notify();

      // Optional: react immediately to new blocks (throttled)
      // Use polling instead of event listeners to avoid MetaMask circuit breaker
      if (reactToBlocks) {
        const throttleWindowMs = Math.max(2000, Math.floor(refreshMs / 4));
        const trigger = () => {
          if (blockThrottleTimers.get(key)) return;
          doFetch();
          const t = setTimeout(() => blockThrottleTimers.delete(key), throttleWindowMs);
          blockThrottleTimers.set(key, t);
        };

        // Always use polling instead of event listeners to avoid circuit breaker
        let lastBlock = -1;
        const poll = async () => {
          try {
            const n = await rpcProvider.getBlockNumber();
            if (n !== lastBlock) {
              lastBlock = n;
              trigger();
            }
          } catch (_) { /* ignore transient errors */ }
        };
        const interval = setInterval(poll, throttleWindowMs);
        // kick once
        poll();
        const cleanup = () => clearInterval(interval);
        (notify as any).__removeBlockListener = cleanup;
      }
    };

    start();

    return () => {
      subs.delete(notify);
      // cleanup possible block listener
      const remover = (notify as any).__removeBlockListener as undefined | (() => void);
      if (remover) remover();
    };
  }, [poolAddress, assetAddress, key, refreshMs]);

  return data;
}

// Allow manual refresh right after local tx success
export async function triggerAPRRefresh(
  provider: ethers.Provider, // No longer used, kept for API compatibility
  poolAddress: string,
  assetAddress: string
) {
  const key = `${poolAddress.toLowerCase()}-${assetAddress.toLowerCase()}`;
  try {
    // Use RPC provider directly to avoid MetaMask circuit breaker
    const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
    const next = await fetchAPR(rpcProvider, poolAddress, assetAddress);
    store.set(key, next);
    listeners.get(key)?.forEach(fn => fn());
  } catch {
    // ignore
  }
}


