// Contract configuration from environment variables
export const CONFIG = {
  RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:7545',
  CHAIN_ID: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '1337', 10), // 1337
  CHAIN_ID_HEX: process.env.NEXT_PUBLIC_CHAIN_ID_HEX || '0x539',
  
  // Contract addresses
  LENDING_POOL: process.env.NEXT_PUBLIC_POOL || '0x830EB67c689a14AaCB2aa34ea1155B75421bB398',
  PRICE_ORACLE: process.env.NEXT_PUBLIC_ORACLE || '0xDfa319d63707d856160721348aE8CC0d23FE8E61',
  WETH: process.env.NEXT_PUBLIC_WETH || '0x44c761c85c07dF39225d6261d0F8F38bbD665f08',
  
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
      address: process.env.NEXT_PUBLIC_WETH || '0x44c761c85c07dF39225d6261d0F8F38bbD665f08', // Use correct WETH address
      symbol: 'WETH',
      name: 'Wrapped Ethereum',
      decimals: 18,
      isBorrowable: false,
      isCollateral: true,
    },
    {
      address: process.env.NEXT_PUBLIC_DAI || '0x4371dC041552920b6C6615f9321016F31598923B',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      isBorrowable: true,
      isCollateral: false,
    },
    {
      address: process.env.NEXT_PUBLIC_USDC || '0x2CE0ea0Ea03bDba8C35820E591324B1aF6191308',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
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
