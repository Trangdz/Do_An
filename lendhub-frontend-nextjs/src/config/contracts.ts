import { 
  LendingPoolAddress, 
  PriceOracleAddress, 
  WETHAddress, 
  DAIAddress, 
  USDCAddress, 
  LINKAddress 
} from '../addresses';

// Contract configuration from environment variables
export const CONFIG = {
  RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:7545',
  CHAIN_ID: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '1337', 10), // 1337
  CHAIN_ID_HEX: process.env.NEXT_PUBLIC_CHAIN_ID_HEX || '0x539',
  
  // Contract addresses (auto-imported from addresses.js)
  LENDING_POOL: LendingPoolAddress,
  PRICE_ORACLE: PriceOracleAddress,
  WETH: WETHAddress,
  
  // Token configuration
  TOKENS: [
    {
      address: '0x0000000000000000000000000000000000000000', // ETH native token
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      isBorrowable: false,
      isCollateral: false,
      isNative: true,
    },
    {
      address: WETHAddress, // Auto-imported from addresses.js
      symbol: 'WETH',
      name: 'Wrapped Ethereum',
      decimals: 18,
      isBorrowable: false,
      isCollateral: true,
    },
    {
      address: DAIAddress, // Auto-imported from addresses.js
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      isBorrowable: true,
      isCollateral: false,
    },
    {
      address: USDCAddress, // Auto-imported from addresses.js
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      isBorrowable: true,
      isCollateral: false,
    },
    {
      address: LINKAddress, // Auto-imported from addresses.js
      symbol: 'LINK',
      name: 'Chainlink',
      decimals: 18,
      isBorrowable: true,
      isCollateral: false,
    },
  ],
} as const;

// Network configuration
export const NETWORK_CONFIG = {
  chainId: CONFIG.CHAIN_ID,
  chainName: 'Ganache Local',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [CONFIG.RPC_URL],
  blockExplorerUrls: null,
};

// Helper functions
export function getTokenByAddress(address: string) {
  return CONFIG.TOKENS.find(token => 
    token.address.toLowerCase() === address.toLowerCase()
  );
}

export function getTokenBySymbol(symbol: string) {
  return CONFIG.TOKENS.find(token => 
    token.symbol.toLowerCase() === symbol.toLowerCase()
  );
}

export function isTokenBorrowable(address: string): boolean {
  const token = getTokenByAddress(address);
  return token?.isBorrowable || false;
}

export function isTokenCollateral(address: string): boolean {
  const token = getTokenByAddress(address);
  return token?.isCollateral || false;
}
