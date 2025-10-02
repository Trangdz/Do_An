import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { safeEstimate, repayWithDebug, debugRepayError, GasResult, DebugStep, RepayParams } from '../lib/debugHelpers';

export interface UseRepayDebugReturn {
  isDebugging: boolean;
  debugSteps: DebugStep[];
  lastGasResult: GasResult | null;
  executeRepayWithDebug: (
    signer: ethers.Signer,
    tokenAddress: string,
    amount: bigint,
    decimals: number
  ) => Promise<ethers.TransactionResponse>;
  debugRepayError: (error: any, repayParams: RepayParams) => Promise<DebugStep[]>;
  clearDebug: () => void;
}

export function useRepayDebug(): UseRepayDebugReturn {
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([]);
  const [lastGasResult, setLastGasResult] = useState<GasResult | null>(null);

  const executeRepayWithDebug = useCallback(async (
    signer: ethers.Signer,
    tokenAddress: string,
    amount: bigint,
    decimals: number
  ): Promise<ethers.TransactionResponse> => {
    setIsDebugging(true);
    setDebugSteps([]);
    setLastGasResult(null);

    try {
      console.log('🔍 Starting repay with debug...');
      
      const tx = await repayWithDebug(signer, tokenAddress, amount, decimals);
      
      console.log('✅ Repay successful:', tx.hash);
      return tx;
    } catch (error: any) {
      console.error('❌ Repay failed:', error);
      
      // Try to debug the error
      const userAddress = await signer.getAddress();
      const poolAddress = process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS || '';
      
      const poolContract = new ethers.Contract(
        poolAddress,
        [
          'function repay(address asset, uint256 amount, address onBehalfOf) external returns (uint256)',
          'function getBorrowBalance(address user, address asset) external view returns (uint256)',
          'function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)'
        ],
        signer
      );

      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function approve(address spender, uint256 amount) external returns (bool)',
          'function allowance(address owner, address spender) external view returns (uint256)',
          'function balanceOf(address account) external view returns (uint256)'
        ],
        signer
      );

      const repayParams: RepayParams = {
        poolContract,
        tokenContract,
        userAddress,
        tokenAddress,
        amount,
        decimals
      };

      const debugSteps = await debugRepayError(error, repayParams);
      setDebugSteps(debugSteps);
      
      throw error;
    } finally {
      setIsDebugging(false);
    }
  }, []);

  const debugRepayErrorCallback = useCallback(async (error: any, repayParams: RepayParams): Promise<DebugStep[]> => {
    setIsDebugging(true);
    
    try {
      const steps = await debugRepayError(error, repayParams);
      setDebugSteps(steps);
      return steps;
    } finally {
      setIsDebugging(false);
    }
  }, []);

  const clearDebug = useCallback(() => {
    setDebugSteps([]);
    setLastGasResult(null);
  }, []);

  return {
    isDebugging,
    debugSteps,
    lastGasResult,
    executeRepayWithDebug,
    debugRepayError: debugRepayErrorCallback,
    clearDebug
  };
}
