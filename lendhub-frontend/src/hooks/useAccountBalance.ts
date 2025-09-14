import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { formatEther } from 'ethers';

export interface AccountBalance {
  ethBalance: string;
  ethBalanceFormatted: string;
  isLoading: boolean;
  error: string | null;
}

export function useAccountBalance(
  provider: ethers.Provider | null,
  address: string | null
): AccountBalance {
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [ethBalanceFormatted, setEthBalanceFormatted] = useState<string>('0.0000');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBalance = useCallback(async () => {
    if (!provider || !address) {
      setEthBalance('0');
      setEthBalanceFormatted('0.0000');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const balance = await provider.getBalance(address);
      const balanceFormatted = formatEther(balance);
      
      setEthBalance(balance.toString());
      setEthBalanceFormatted(parseFloat(balanceFormatted).toFixed(4));
    } catch (err: any) {
      console.error('Error loading ETH balance:', err);
      setError(err.message || 'Failed to load balance');
    } finally {
      setIsLoading(false);
    }
  }, [provider, address]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  // Poll balance every 5 seconds
  useEffect(() => {
    if (!provider || !address) return;

    const interval = setInterval(loadBalance, 5000);
    return () => clearInterval(interval);
  }, [loadBalance, provider, address]);

  return {
    ethBalance,
    ethBalanceFormatted,
    isLoading,
    error,
  };
}
