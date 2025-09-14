import { ethers } from 'ethers';
import { CONFIG, NETWORK_CONFIG } from '../config/contracts';

// Types
export interface WalletConnection {
  provider: ethers.Provider;
  signer: ethers.Signer;
  address: string;
  chainId: number;
}

// Global window interface
declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Connect to MetaMask wallet
 */
export async function connectWallet(): Promise<WalletConnection> {
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

    // Create provider and signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    
    // Get current network
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    // Check if connected to correct network
    if (chainId !== CONFIG.CHAIN_ID) {
      await switchToCorrectNetwork();
    }

    return {
      provider,
      signer,
      address,
      chainId,
    };
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
}

/**
 * Switch to correct network (Ganache)
 */
export async function switchToCorrectNetwork(): Promise<void> {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  try {
    // Try to switch to the correct network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CONFIG.CHAIN_ID_HEX }],
    });
  } catch (error: any) {
    // If network doesn't exist, add it
    if (error.code === 4902) {
      await addGanacheNetwork();
    } else {
      throw error;
    }
  }
}

/**
 * Add Ganache network to MetaMask
 */
export async function addGanacheNetwork(): Promise<void> {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [NETWORK_CONFIG],
    });
  } catch (error) {
    console.error('Error adding Ganache network:', error);
    throw error;
  }
}

/**
 * Get current wallet connection status
 */
export async function getWalletStatus(): Promise<{
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
}> {
  if (!window.ethereum) {
    return { isConnected: false, address: null, chainId: null };
  }

  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    
    return {
      isConnected: accounts.length > 0,
      address: accounts[0] || null,
      chainId: parseInt(chainId, 16),
    };
  } catch (error) {
    console.error('Error getting wallet status:', error);
    return { isConnected: false, address: null, chainId: null };
  }
}

/**
 * Disconnect wallet
 */
export function disconnectWallet(): void {
  // MetaMask doesn't have a disconnect method
  // This is just for UI state management
  console.log('Wallet disconnected');
}

/**
 * Listen to wallet events
 */
export function setupWalletListeners(
  onAccountsChanged: (accounts: string[]) => void,
  onChainChanged: (chainId: string) => void,
  onDisconnect: () => void
): () => void {
  if (!window.ethereum) {
    return () => {};
  }

  const handleAccountsChanged = (accounts: string[]) => {
    onAccountsChanged(accounts);
  };

  const handleChainChanged = (chainId: string) => {
    onChainChanged(chainId);
  };

  const handleDisconnect = () => {
    onDisconnect();
  };

  // Add event listeners
  window.ethereum.on('accountsChanged', handleAccountsChanged);
  window.ethereum.on('chainChanged', handleChainChanged);
  window.ethereum.on('disconnect', handleDisconnect);

  // Return cleanup function
  return () => {
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
      window.ethereum.removeListener('disconnect', handleDisconnect);
    }
  };
}

/**
 * Get provider for read-only operations
 */
export function getProvider(): ethers.Provider {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }
  return new ethers.BrowserProvider(window.ethereum);
}

/**
 * Get signer for write operations
 */
export async function getSigner(): Promise<ethers.Signer> {
  const provider = getProvider();
  return await provider.getSigner();
}
