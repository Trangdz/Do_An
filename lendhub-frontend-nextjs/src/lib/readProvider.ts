import { ethers } from 'ethers';
import { CONFIG } from '@/config/contracts';

let cachedProvider: ethers.JsonRpcProvider | null = null;

/**
 * Returns a shared read-only provider that points to the configured RPC URL.
 * Falls back to `window.ethereum` provider only if RPC URL is unavailable.
 */
export function getReadProvider(fallback?: ethers.Provider | null): ethers.Provider {
  if (!cachedProvider) {
    try {
      cachedProvider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    } catch (error) {
      console.warn('[readProvider] Failed to init RPC provider, using fallback provider instead:', error);
    }
  }
  if (cachedProvider) return cachedProvider;
  if (fallback) return fallback;
  throw new Error('No RPC provider available. Please set CONFIG.RPC_URL.');
}

/**
 * Helper to instantiate a read-only contract with the shared provider.
 */
export function getReadOnlyContract<T extends ethers.BaseContract = ethers.Contract>(
  address: string,
  abi: readonly string[] | ethers.Interface | ethers.InterfaceAbi,
  fallbackProvider?: ethers.Provider | null
): T {
  const provider = getReadProvider(fallbackProvider);
  return new ethers.Contract(address, abi, provider) as T;
}

