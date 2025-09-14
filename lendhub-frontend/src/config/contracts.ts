// Contract configuration from environment variables
export const CONFIG = {
  RPC_URL: import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:7545',
  CHAIN_ID: parseInt(import.meta.env.VITE_CHAIN_ID_HEX || '0x539', 16), // 1337
  CHAIN_ID_HEX: import.meta.env.VITE_CHAIN_ID_HEX || '0x539',
  
  // Contract addresses
  LENDING_POOL: import.meta.env.VITE_POOL || '0x0F1ebc6539925818AEfAB5fA3F907a49dDa6112B',
  PRICE_ORACLE: import.meta.env.VITE_ORACLE || '0x16386a69239723c62356E0D48625A599bEdc1D90',
  
  // Token configuration
  TOKENS: [
    {
      address: import.meta.env.VITE_WETH || '0xc6Be86871C74dd0e26a40EBE4a0fFbA50912dCE7',
      symbol: 'WETH',
      name: 'Wrapped Ethereum',
      decimals: 18,
      isBorrowable: false,
      isCollateral: true,
    },
    {
      address: import.meta.env.VITE_DAI || '0x871F08ecD57077234CF86e02f212A405554EDABf',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      isBorrowable: true,
      isCollateral: false,
    },
    {
      address: import.meta.env.VITE_USDC || '0x0000000000000000000000000000000000000000',
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
