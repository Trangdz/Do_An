import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONFIG } from '../config/contracts';
import { POOL_ABI, ORACLE_ABI, ERC20_ABI } from '../config/abis';
import { toNumber, formatCurrency } from '../lib/math';

export interface SimpleTokenData {
  symbol: string;
  address: string;
  price: number;
  totalSupply: number;
  totalBorrow: number;
  availableLiquidity: number;
  supplyAPR: number;
  borrowAPR: number;
  utilization: number;
  // User data
  userSupply: number;        // Amount supplied to pool
  userBorrow: number;        // Amount borrowed from pool
  userBalance: number;       // Amount in wallet (for ERC20 tokens)
  userSupplyUSD: number;
  userBorrowUSD: number;
  userBalanceUSD: number;    // USD value of wallet balance
}

export interface SimplePoolData {
  tokens: SimpleTokenData[];
  ethBalance: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  refresh: () => void;
  addSimulatedWeth: (amount: number) => void;
}

export function usePoolDataSimple(
  provider: ethers.Provider | null,
  signer: ethers.Signer | null,
  address: string | null
): SimplePoolData {
  const [tokens, setTokens] = useState<SimpleTokenData[]>([]);
  const [ethBalance, setEthBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(0);
  const [simulatedWethBalance, setSimulatedWethBalance] = useState(0);

  const loadData = useCallback(async () => {
    if (!provider) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load real balances for all tokens
      if (address) {
        const ethBalanceWei = await provider.getBalance(address);
        const ethBalanceEth = Number(ethers.formatEther(ethBalanceWei));
        setEthBalance(ethBalanceEth);
        console.log('✅ Real ETH balance loaded:', ethBalanceEth);
      }
      
      // Load real token data with actual balances
      console.log('🔄 Loading real token data with actual balances');
      
      const tokenDataPromises = CONFIG.TOKENS.map(async (token) => {
        let userSupply = 0;    // Amount supplied to pool
        let userBorrow = 0;    // Amount borrowed from pool
        let userBalance = 0;   // Amount in wallet
        
        if (address) {
          try {
            if (token.isNative) {
              // For ETH, use the balance we already loaded
              userBalance = ethBalance;
              userSupply = 0; // ETH is not supplied to pool directly
            } else {
              // For ERC20 tokens, load wallet balance from contract
              console.log(`🔄 Loading ${token.symbol} balance from contract:`, token.address);
              
              try {
                const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider);
                const balanceWei = await tokenContract.balanceOf(address);
                userBalance = Number(ethers.formatUnits(balanceWei, token.decimals));
                
                console.log(`✅ Loaded ${token.symbol} wallet balance:`, userBalance);
                console.log(`📊 Raw balance Wei:`, balanceWei.toString());
                console.log(`📊 Formatted balance:`, userBalance);
              } catch (contractError) {
                console.warn(`❌ Contract ${token.symbol} not found or error:`, contractError.message);
                
                // For WETH, try to simulate balance if contract not found
                if (token.symbol === 'WETH') {
                  // Simulate WETH balance based on ETH balance
                  userBalance = ethBalance * 0.8; // Simulate 80% of ETH as WETH
                  console.log(`🔄 Simulating WETH balance:`, userBalance);
                } else {
                  userBalance = 0;
                }
              }
              
              // Load pool supply/borrow from lending pool contract
              // TODO: Load from lending pool contract
              userSupply = 0; // Will be loaded from pool contract
              userBorrow = 0; // Will be loaded from pool contract
            }
          } catch (error) {
            console.warn(`Failed to load balance for ${token.symbol}:`, error);
            userBalance = 0;
            userSupply = 0;
            userBorrow = 0;
          }
        }
        
        const price = token.symbol === 'ETH' ? 1600 : token.symbol === 'WETH' ? 1600 : 1;
        
        return {
          symbol: token.symbol,
          address: token.address,
          price: price,
          totalSupply: 1000000, // 1M total supply
          totalBorrow: 200000,  // 200K total borrow
          availableLiquidity: 800000, // 800K available
          supplyAPR: 0.03, // 3% supply APR
          borrowAPR: 0.05, // 5% borrow APR
          utilization: 0.2, // 20% utilization
          liquidationThreshold: 80,
          userSupply: userSupply,    // Amount in pool
          userBorrow: userBorrow,    // Amount borrowed
          userBalance: userBalance,  // Amount in wallet
          userSupplyUSD: userSupply * price,
          userBorrowUSD: userBorrow * price,
          userBalanceUSD: userBalance * price,
        };
      });
      
      const mockTokenData = await Promise.all(tokenDataPromises);

      setTokens(mockTokenData);
      setLastUpdated(Date.now());
      setError(null);
      
      console.log('✅ SIMULATION: Mock data loaded successfully');

    } catch (error: any) {
      console.error('Error loading pool data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [provider, address, simulatedWethBalance]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadData();
    
    // Poll every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Function to add simulated WETH balance
  const addSimulatedWeth = useCallback((amount: number) => {
    setSimulatedWethBalance(prev => prev + amount);
    console.log('🔄 SIMULATION: Added WETH balance:', amount, 'Total:', simulatedWethBalance + amount);
  }, [simulatedWethBalance]);

  return {
    tokens,
    ethBalance,
    isLoading,
    error,
    lastUpdated,
    refresh: loadData,
    addSimulatedWeth,
  };
}