import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import useLendContext from '@/context/useLendContext';
import { RewardDistributorAddress, RewardAccumulatorAddress } from '@/addresses';
import { CONFIG } from '@/config/contracts';
import { isUserRejection, getFriendlyErrorMessage } from '@/lib/errorHandler';

// RewardDistributor ABI
const REWARD_DISTRIBUTOR_ABI = [
  'function getClaimableReward(address user) view returns (uint256)',
  'function claimReward()',
  'function totalDistributed() view returns (uint256)',
];

// RewardAccumulator ABI (for pending rewards)
const REWARD_ACCUMULATOR_ABI = [
  'function calculatePendingReward(address user) view returns (uint256)',
];

export function useRewardDistributor() {
  const { metamaskDetails, provider, signer } = useLendContext();
  const [claimableReward, setClaimableReward] = useState<string>('0');
  const [pendingReward, setPendingReward] = useState<string>('0'); // Pending reward not yet accumulated
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    console.log('🎁 ===== useRewardDistributor Hook =====');
    console.log('🎁 Effect triggered with:', {
      currentAccount: metamaskDetails.currentAccount,
      hasProvider: !!provider,
      rewardDistributorAddress: RewardDistributorAddress,
      rewardAccumulatorAddress: RewardAccumulatorAddress
    });
    
    // Only check for account - we use RPC provider directly, don't need context provider
    if (!metamaskDetails.currentAccount) {
      console.log('🎁 ⚠️ Missing account, resetting rewards');
      console.log('🎁 Account:', metamaskDetails.currentAccount);
      setClaimableReward('0');
      setPendingReward('0');
      return;
    }
    
    // Check if RewardDistributor address is valid
    if (!RewardDistributorAddress || RewardDistributorAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('⚠️ RewardDistributor address not set');
      setClaimableReward('0');
      setPendingReward('0');
      return;
    }

    const fetchRewards = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // ALWAYS use direct RPC provider for read operations to avoid MetaMask circuit breaker
        // Only use MetaMask provider (signer) for transactions
        const rpcProvider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
        const useProvider = rpcProvider; // Force RPC for reads
        
        console.log('🎁 Using RPC provider for reward reads (avoids circuit breaker)');
        console.log('🎁 Fetching reward from:', RewardDistributorAddress);
        console.log('🎁 User address:', metamaskDetails.currentAccount);
        
        // Fetch claimable reward (already accumulated)
        const distributorContract = new ethers.Contract(RewardDistributorAddress, REWARD_DISTRIBUTOR_ABI, useProvider);
        console.log('🎁 Calling getClaimableReward...');
        const rewardWei = await distributorContract.getClaimableReward(metamaskDetails.currentAccount);
        const rewardAmount = ethers.formatEther(rewardWei);
        console.log('🎁 ✅ Claimable reward:', rewardAmount, 'LENDX');
        console.log('🎁 ✅ Raw claimable reward (wei):', rewardWei.toString());
        console.log('🎁 Setting claimableReward state to:', rewardAmount);
        setClaimableReward(rewardAmount);
        
        // Fetch pending reward (not yet accumulated, will be accumulated on next interaction)
        if (RewardAccumulatorAddress && RewardAccumulatorAddress !== '0x0000000000000000000000000000000000000000') {
          try {
            console.log('Fetching pending reward from:', RewardAccumulatorAddress);
            const accumulatorContract = new ethers.Contract(RewardAccumulatorAddress, REWARD_ACCUMULATOR_ABI, useProvider);
            const pendingWei = await accumulatorContract.calculatePendingReward(metamaskDetails.currentAccount);
            const pendingAmount = ethers.formatEther(pendingWei);
            console.log('🎁 ✅ Pending reward:', pendingAmount, 'LENDX');
            console.log('🎁 ✅ Raw pending reward (wei):', pendingWei.toString());
            console.log('🎁 Setting pendingReward state to:', pendingAmount);
            setPendingReward(pendingAmount);
          } catch (err: any) {
            // RewardAccumulator might not be deployed yet
            console.warn('⚠️ RewardAccumulator not available:', err.message);
            setPendingReward('0');
          }
        } else {
          console.warn('⚠️ RewardAccumulator address not set');
          setPendingReward('0');
        }
      } catch (err: any) {
        console.error('❌ Error fetching rewards:', err);
        console.error('❌ Error details:', {
          message: err.message,
          code: err.code,
          data: err.data,
          stack: err.stack
        });
        setError(err.message || 'Failed to fetch reward');
        setClaimableReward('0');
        setPendingReward('0');
      } finally {
        setLoading(false);
      }
    };

    fetchRewards();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchRewards, 30000);
    return () => clearInterval(interval);
  }, [metamaskDetails.currentAccount]); // Removed provider dependency - we use RPC provider directly

  const claimReward = async () => {
    // Check if wallet is connected
    if (!metamaskDetails.currentAccount) {
      const error = new Error('Please connect your wallet first');
      setError(error.message);
      throw error;
    }

    // Check if signer is available (needed for transactions)
    // Try to get signer from provider if not available from context
    let txSigner = signer;
    if (!txSigner && metamaskDetails.provider) {
      try {
        txSigner = await metamaskDetails.provider.getSigner();
        console.log('🎁 Got signer from provider');
      } catch (err) {
        console.warn('🎁 Could not get signer from provider:', err);
      }
    }
    
    if (!txSigner) {
      const error = new Error('Wallet signer not available. Please wait a moment and try again.');
      setError(error.message);
      throw error;
    }

    if (!RewardDistributorAddress || RewardDistributorAddress === '0x0000000000000000000000000000000000000000') {
      const error = new Error('RewardDistributor contract not configured');
      setError(error.message);
      throw error;
    }

    try {
      setClaiming(true);
      setError(null);
      
      console.log('🎁 Claiming reward...');
      console.log('🎁 User:', metamaskDetails.currentAccount);
      console.log('🎁 Contract:', RewardDistributorAddress);
      
      const contract = new ethers.Contract(RewardDistributorAddress, REWARD_DISTRIBUTOR_ABI, txSigner);
      const tx = await contract.claimReward();
      console.log('🎁 Transaction sent:', tx.hash);
      
      await tx.wait();
      console.log('🎁 ✅ Transaction confirmed!');
      
      // Refresh claimable reward after successful claim
      const rpcProvider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      const readContract = new ethers.Contract(RewardDistributorAddress, REWARD_DISTRIBUTOR_ABI, rpcProvider);
      const rewardWei = await readContract.getClaimableReward(metamaskDetails.currentAccount);
      const newReward = ethers.formatEther(rewardWei);
      console.log('🎁 New claimable reward:', newReward, 'LENDX');
      setClaimableReward(newReward);
      
      return tx;
    } catch (err: any) {
      console.error('❌ Error claiming reward:', err);
      
      // Handle user rejection gracefully
      if (isUserRejection(err)) {
        // Don't set error state for user rejection - they already know they cancelled
        setError(null);
        // Throw a clean error that can be caught by UI
        const userRejectionError = new Error('Transaction cancelled');
        userRejectionError.name = 'UserRejection';
        throw userRejectionError;
      }
      
      // For other errors, set friendly error message
      const errorMessage = getFriendlyErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setClaiming(false);
    }
  };

  return {
    claimableReward,
    pendingReward, // Reward that will be accumulated on next interaction
    totalReward: (parseFloat(claimableReward) + parseFloat(pendingReward)).toFixed(6), // Total (claimable + pending)
    loading,
    error,
    claiming,
    claimReward,
    refresh: () => {
      // Trigger refresh by updating dependency
      if (metamaskDetails.currentAccount) {
        const fetchRewards = async () => {
          try {
            // Use RPC provider for reads
            const rpcProvider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
            const distributorContract = new ethers.Contract(RewardDistributorAddress, REWARD_DISTRIBUTOR_ABI, rpcProvider);
            const rewardWei = await distributorContract.getClaimableReward(metamaskDetails.currentAccount);
            setClaimableReward(ethers.formatEther(rewardWei));
            
            if (RewardAccumulatorAddress && RewardAccumulatorAddress !== '0x0000000000000000000000000000000000000000') {
              try {
                const accumulatorContract = new ethers.Contract(RewardAccumulatorAddress, REWARD_ACCUMULATOR_ABI, rpcProvider);
                const pendingWei = await accumulatorContract.calculatePendingReward(metamaskDetails.currentAccount);
                setPendingReward(ethers.formatEther(pendingWei));
              } catch (err: any) {
                setPendingReward('0');
              }
            }
          } catch (err: any) {
            console.error('Error refreshing reward:', err);
          }
        };
        fetchRewards();
      }
    },
  };
}










































