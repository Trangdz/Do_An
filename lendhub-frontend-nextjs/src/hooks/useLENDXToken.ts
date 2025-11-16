import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import useLendContext from '@/context/useLendContext';
// @ts-ignore - addresses.js is a JS file
const addresses = require('@/addresses');
import { CONFIG } from '@/config/contracts';

const LENDXTokenAddress = addresses.LENDXTokenAddress;

// LENDX Token ABI (simplified)
const LENDX_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

export function useLENDXToken() {
  const { metamaskDetails } = useLendContext();
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🎁 ===== useLENDXToken Hook =====');
    console.log('🎁 Effect triggered with:', {
      currentAccount: metamaskDetails.currentAccount,
      hasProvider: !!metamaskDetails.provider,
      lendxTokenAddress: LENDXTokenAddress
    });
    
    // Only check for account - we use RPC provider directly, don't need context provider
    if (!metamaskDetails.currentAccount) {
      console.log('🎁 ⚠️ Missing account, resetting balance');
      setBalance('0');
      return;
    }
    
    if (!LENDXTokenAddress || LENDXTokenAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('LENDXToken address not set');
      setBalance('0');
      return;
    }

    const fetchBalance = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // ALWAYS use direct RPC provider for read operations to avoid MetaMask circuit breaker
        // Only use MetaMask provider (signer) for transactions
        const rpcProvider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
        const useProvider = rpcProvider; // Force RPC for reads
        
        console.log('🎁 Using RPC provider for LENDX balance read (avoids circuit breaker)');
        console.log('🎁 Fetching LENDX balance from:', LENDXTokenAddress);
        console.log('🎁 User address:', metamaskDetails.currentAccount);
        const contract = new ethers.Contract(LENDXTokenAddress, LENDX_ABI, useProvider);
        console.log('🎁 Calling balanceOf...');
        const balanceWei = await contract.balanceOf(metamaskDetails.currentAccount);
        const balanceAmount = ethers.formatEther(balanceWei);
        console.log('🎁 ✅ LENDX balance:', balanceAmount);
        console.log('🎁 ✅ Raw LENDX balance (wei):', balanceWei.toString());
        console.log('🎁 Setting balance state to:', balanceAmount);
        setBalance(balanceAmount);
      } catch (err: any) {
        console.error('❌ Error fetching LENDX balance:', err);
        console.error('❌ Error details:', {
          message: err.message,
          code: err.code,
          data: err.data,
          stack: err.stack
        });
        setError(err.message || 'Failed to fetch balance');
        setBalance('0');
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
    
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [metamaskDetails.currentAccount]); // Removed provider dependency - we use RPC provider directly

  return { balance, loading, error };
}

/**
 * Hook to check if user has proposal rights (LENDX >= 10000)
 */
export function useProposalRights() {
  const { balance, loading } = useLENDXToken();
  const MIN_PROPOSAL_BALANCE = 10000; // Minimum LENDX required to create proposals
  
  const balanceNumber = parseFloat(balance || '0');
  const hasProposalRights = balanceNumber >= MIN_PROPOSAL_BALANCE;
  
  return {
    hasProposalRights,
    balance: balanceNumber,
    minRequired: MIN_PROPOSAL_BALANCE,
    loading
  };
}

