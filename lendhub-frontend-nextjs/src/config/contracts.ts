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
  RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545',
  CHAIN_ID: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '5777', 10), // 5777
  CHAIN_ID_HEX: process.env.NEXT_PUBLIC_CHAIN_ID_HEX || '0x1691', // 5777 in hex
  
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
      aggregatorAddress: '0x196D00ed91AD5bB7D04A5D5d9D08B9Af409DC5B9', // ETH aggregator
    },
    {
      address: WETHAddress, // Auto-imported from addresses.js
      symbol: 'WETH',
      name: 'Wrapped Ethereum',
      decimals: 18,
      isBorrowable: false,
      isCollateral: true,
      aggregatorAddress: '0xb7Aa0Fbb942f417dF91AfFF017d18ACB46ca3EDe', // WETH aggregator
    },
    {
      address: DAIAddress, // Auto-imported from addresses.js
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      isBorrowable: true,
      isCollateral: false,
      aggregatorAddress: '0x2eE3279658A6cdB5bEbb2C8c61984B28bD4AdD5D', // DAI aggregator
    },
    {
      address: USDCAddress, // Auto-imported from addresses.js
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      isBorrowable: true,
      isCollateral: false,
      aggregatorAddress: '0x6E9274953B75209F31d7153bb1cb991De497a9c7', // USDC aggregator
    },
    {
      address: LINKAddress, // Auto-imported from addresses.js
      symbol: 'LINK',
      name: 'Chainlink',
      decimals: 18,
      isBorrowable: true,
      isCollateral: false,
      aggregatorAddress: '0xfd33359850924Aa50B1eDd38F6A9a085c32c3219', // LINK aggregator
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
