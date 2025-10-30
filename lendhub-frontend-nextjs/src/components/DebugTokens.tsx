/**
 * Debug Component để kiểm tra tất cả tokens
 */

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface DebugTokensProps {
  provider: ethers.Provider | null;
  poolAddress: string;
  userAddress: string;
  tokens: any[];
}

export function DebugTokens({ provider, poolAddress, userAddress, tokens }: DebugTokensProps) {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const checkAllTokens = async () => {
    if (!provider || !poolAddress || !userAddress) return;
    
    setIsLoading(true);
    const newResults: any[] = [];
    
    const abi = [
      'function userReserves(address user, address asset) view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)',
      'function reserves(address asset) view returns (tuple(uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate))'
    ];
    
    const pool = new ethers.Contract(poolAddress, abi, provider);
    
    for (const token of tokens) {
      try {
        console.log('🔍 Checking token:', token.symbol, token.address);
        
        // Check supply position
        const userReserve = await pool.userReserves(userAddress, token.address);
        const supplyPrincipal = userReserve.supply.principal;
        const borrowPrincipal = userReserve.borrow.principal;
        
        // Get reserve data
        const reserve = await pool.reserves(token.address);
        
        const result = {
          symbol: token.symbol,
          address: token.address,
          supplyPrincipal: Number(supplyPrincipal) / 1e18,
          borrowPrincipal: Number(borrowPrincipal) / 1e18,
          liquidityIndex: Number(reserve.liquidityIndex),
          liquidityRate: Number(reserve.liquidityRateRayPerSec),
          lastUpdateTimestamp: Number(reserve.lastUpdate),
          hasPosition: supplyPrincipal > BigInt(0) || borrowPrincipal > BigInt(0)
        };
        
        newResults.push(result);
        console.log('✅ Token result:', result);
        
      } catch (error) {
        console.error('❌ Error checking token:', token.symbol, error);
        newResults.push({
          symbol: token.symbol,
          address: token.address,
          error: error.message
        });
      }
    }
    
    setResults(newResults);
    setIsLoading(false);
  };
  
  useEffect(() => {
    checkAllTokens();
  }, [provider, poolAddress, userAddress]);
  
  return (
    <div className="border-2 border-red-300 p-4 rounded-lg bg-red-50">
      <div className="text-sm text-red-600 mb-2">
        🔍 DEBUG ALL TOKENS {isLoading ? '⏳' : '✅'}
      </div>
      <button 
        onClick={checkAllTokens}
        disabled={isLoading}
        className="px-3 py-1 bg-red-500 text-white rounded text-xs mb-2"
      >
        {isLoading ? 'Checking...' : 'Refresh'}
      </button>
      
      <div className="text-xs space-y-1">
        {results.map((result, index) => (
          <div key={index} className="flex justify-between">
            <span className="font-semibold">{result.symbol}:</span>
            <span className={result.hasPosition ? 'text-green-600' : 'text-gray-500'}>
              {result.error ? `Error: ${result.error}` : 
               result.hasPosition ? 
                 `Supply: ${result.supplyPrincipal.toFixed(4)}, Borrow: ${result.borrowPrincipal.toFixed(4)}` :
                 'No position'
              }
            </span>
          </div>
        ))}
      </div>
      
      <div className="text-xs mt-2 text-gray-500">
        Total tokens checked: {results.length}
      </div>
    </div>
  );
}

