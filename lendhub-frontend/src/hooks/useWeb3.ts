import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Web3Provider interface
interface Web3Provider {
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
}

const GANACHE_CHAIN_ID = 1337;
const GANACHE_RPC_URL = 'http://127.0.0.1:7545';

export function useWeb3(): Web3Provider {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  // Initialize provider
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(web3Provider);
      
      // Check if already connected
      checkConnection(web3Provider);
    }
  }, []);

  const checkConnection = async (web3Provider: ethers.Provider) => {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        
        const network = await web3Provider.getNetwork();
        setChainId(Number(network.chainId));
        
        const signer = await web3Provider.getSigner();
        setSigner(signer);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const network = await web3Provider.getNetwork();
      const currentChainId = Number(network.chainId);

      // Check if connected to Ganache
      if (currentChainId !== GANACHE_CHAIN_ID) {
        await switchChain(GANACHE_CHAIN_ID);
      }

      setAccount(accounts[0]);
      setIsConnected(true);
      setChainId(currentChainId);
      setProvider(web3Provider);
      
      const signer = await web3Provider.getSigner();
      setSigner(signer);

      // Set up event listeners with error handling
      try {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        window.ethereum.on('disconnect', handleDisconnect);
      } catch (error) {
        console.warn('MetaMask event listeners setup failed:', error);
      }

    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setIsConnected(false);
    setChainId(null);
    setProvider(null);
    setSigner(null);
    
    // Remove event listeners
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
      window.ethereum.removeListener('disconnect', handleDisconnect);
    }
  }, []);

  const switchChain = useCallback(async (targetChainId: number) => {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (error: any) {
      // If chain doesn't exist, add it
      if (error.code === 4902) {
        await addGanacheNetwork();
      } else {
        throw error;
      }
    }
  }, []);

  const addGanacheNetwork = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${GANACHE_CHAIN_ID.toString(16)}`,
            chainName: 'Ganache Local',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: [GANACHE_RPC_URL],
            blockExplorerUrls: null,
          },
        ],
      });
    } catch (error) {
      console.error('Error adding Ganache network:', error);
      throw error;
    }
  }, []);

  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      disconnect();
    } else {
      setAccount(accounts[0]);
    }
  }, [disconnect]);

  const handleChainChanged = useCallback((chainId: string) => {
    const newChainId = parseInt(chainId, 16);
    setChainId(newChainId);
    
    if (newChainId !== GANACHE_CHAIN_ID) {
      console.warn('Please switch to Ganache network');
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  return {
    isConnected,
    account,
    chainId,
    connect,
    disconnect,
    switchChain,
  };
}

// Hook for contract interactions
export function useContractManager() {
  const { provider, signer } = useWeb3();
  
  if (!provider) {
    return null;
  }

  // This will be imported from utils/contracts.ts
  // For now, return null to avoid circular dependency
  return null;
}
