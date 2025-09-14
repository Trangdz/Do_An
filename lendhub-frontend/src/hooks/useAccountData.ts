import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONFIG } from '../config/contracts';
import { POOL_ABI } from '../config/abis';
import { toNumber, formatCurrency } from '../lib/math';

export interface AccountData {
  collateralValue: number;
  debtValue: number;
  healthFactor: number;
  isLoading: boolean;
  error: string | null;
}

export function useAccountData(
  provider: ethers.Provider | null,
  address: string | null
): AccountData {
  const [collateralValue, setCollateralValue] = useState<number>(0);
  const [debtValue, setDebtValue] = useState<number>(0);
  const [healthFactor, setHealthFactor] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAccountData = useCallback(async () => {
    if (!provider || !address) {
      setCollateralValue(0);
      setDebtValue(0);
      setHealthFactor(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contract = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, provider);
      const [collateral, debt, hf] = await contract.getAccountData(address);
      
      setCollateralValue(toNumber(collateral));
      setDebtValue(toNumber(debt));
      setHealthFactor(toNumber(hf));
    } catch (err: any) {
      console.error('Error loading account data:', err);
      setError(err.message || 'Failed to load account data');
      // Set default values on error
      setCollateralValue(0);
      setDebtValue(0);
      setHealthFactor(0);
    } finally {
      setIsLoading(false);
    }
  }, [provider, address]);

  useEffect(() => {
    loadAccountData();
  }, [loadAccountData]);

  // Poll account data every 10 seconds
  useEffect(() => {
    if (!provider || !address) return;

    const interval = setInterval(loadAccountData, 10000);
    return () => clearInterval(interval);
  }, [loadAccountData, provider, address]);

  return {
    collateralValue,
    debtValue,
    healthFactor,
    isLoading,
    error,
  };
}
