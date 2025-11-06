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
  CHAIN_ID: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '5777', 10), // 5777
  CHAIN_ID_HEX: process.env.NEXT_PUBLIC_CHAIN_ID_HEX || '0x1691', // 5777 in hex
  
  // Contract addresses (auto-imported from addresses.js)
  LENDING_POOL: LendingPoolAddress,
  PRICE_ORACLE: PriceOracleAddress,
  WETH: WETHAddress,
  // Optional: MultiPriceAggregator (string address via env). Fallback to latest deployed address
  MULTI_PRICE_AGGREGATOR: process.env.NEXT_PUBLIC_MULTI_PRICE_AGGREGATOR || '0x1de99f8B97E975506b17275300998442ee9b7Acf',
  
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
      aggregatorAddress: '0xCb215B63885E7fbE526c3eb60E0DBf346B95eb25', // ETH aggregator
    },
    {
      address: WETHAddress, // Auto-imported from addresses.js
      symbol: 'WETH',
      name: 'Wrapped Ethereum',
      decimals: 18,
      isBorrowable: false,
      isCollateral: true,
      aggregatorAddress: '0x2B8e8EFd011c9B43765D9f7b32D54eFe3fbc5eCd', // WETH aggregator
    },
    {
      address: DAIAddress, // Auto-imported from addresses.js
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      isBorrowable: true,
      isCollateral: false,
      aggregatorAddress: '0x3F584c47bB8Eb94E004A8f412c778681E3DBe4B7', // DAI aggregator
    },
    {
      address: USDCAddress, // Auto-imported from addresses.js
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      isBorrowable: true,
      isCollateral: false,
      aggregatorAddress: '0xE61cD632ef12182Cfce5B5A086f6f5e7bDf322C9', // USDC aggregator
    },
    {
      address: LINKAddress, // Auto-imported from addresses.js
      symbol: 'LINK',
      name: 'Chainlink',
      decimals: 18,
      isBorrowable: true,
      isCollateral: false,
      aggregatorAddress: '0x5b69cB58C4A20797C6F5C1a9e1b7BE2E0d9b801D', // LINK aggregator
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
