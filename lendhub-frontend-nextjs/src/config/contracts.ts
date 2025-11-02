import { 
  LendingPoolAddress, 
  PriceOracleAddress, 
  WETHAddress, 
  DAIAddress, 
  USDCAddress, 
  LINKAddress 
} from '../addresses.js';

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
      aggregatorAddress: '0xAD523115cd35a8d4E60B3C0953E0E0ac10418309',
    },
    {
      address: WETHAddress, // Auto-imported from addresses.js
      symbol: 'WETH',
      name: 'Wrapped Ethereum',
      decimals: 18,
      isBorrowable: false,
      isCollateral: true,
      aggregatorAddress: '0x045857BDEAE7C1c7252d611eB24eB55564198b4C',
    },
    {
      address: DAIAddress, // Auto-imported from addresses.js
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      isBorrowable: true,
      isCollateral: false,
      aggregatorAddress: '0x413b1AfCa96a3df5A686d8BFBF93d30688a7f7D9',
    },
    {
      address: USDCAddress, // Auto-imported from addresses.js
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      isBorrowable: true,
      isCollateral: false,
      aggregatorAddress: '0x2b5A4e5493d4a54E717057B127cf0C000C876f9B',
    },
    {
      address: LINKAddress, // Auto-imported from addresses.js
      symbol: 'LINK',
      name: 'Chainlink',
      decimals: 18,
      isBorrowable: true,
      isCollateral: false,
      aggregatorAddress: '0x02df3a3F960393F5B349E40A599FEda91a7cc1A7',
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
