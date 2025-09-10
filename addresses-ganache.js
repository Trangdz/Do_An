// LendHub v1 - Ganache Addresses
// Deploy with: npx hardhat run scripts/deploy-ganache.js --network ganache

// Mock Oracle
const MOCK_ORACLE_ADDRESS = "0x..."; // Update after deployment

// Risk Manager
const RISK_MANAGER_ADDRESS = "0x..."; // Update after deployment

// Lending Pool V2
const LENDING_POOL_V2_ADDRESS = "0x..."; // Update after deployment

// Mock Tokens
const USDC_ADDRESS = "0x..."; // 6 decimals
const DAI_ADDRESS = "0x...";  // 18 decimals
const WETH_ADDRESS = "0x..."; // 18 decimals
const LINK_ADDRESS = "0x..."; // 18 decimals

// ETH address (for compatibility)
const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

// Test accounts (Ganache default)
const ACCOUNT1 = "0x5A61D0993a1068A57152c8e0af44B17D6b2E2B11";
const ACCOUNT2 = "0x876FF3A3A5cD015BA6B407d53Ad004A5827a13B0";
const ACCOUNT3 = "0x9BeD0F4C7bD54a9A9531Ac6aAf4C9B3CD335e364";

// Token configuration
const TOKEN_CONFIG = {
  USDC: {
    address: USDC_ADDRESS,
    decimals: 6,
    symbol: "USDC",
    name: "USD Coin",
    isCollateral: true,
    collateralFactor: 8000, // 80%
    borrowFactor: 8000,     // 80%
    price: "1.00" // $1.00
  },
  DAI: {
    address: DAI_ADDRESS,
    decimals: 18,
    symbol: "DAI",
    name: "Dai Stablecoin",
    isCollateral: true,
    collateralFactor: 8000, // 80%
    borrowFactor: 8000,     // 80%
    price: "1.00" // $1.00
  },
  WETH: {
    address: WETH_ADDRESS,
    decimals: 18,
    symbol: "WETH",
    name: "Wrapped Ether",
    isCollateral: true,
    collateralFactor: 8500, // 85%
    borrowFactor: 8500,     // 85%
    price: "2000.00" // $2000.00
  },
  LINK: {
    address: LINK_ADDRESS,
    decimals: 18,
    symbol: "LINK",
    name: "ChainLink Token",
    isCollateral: true,
    collateralFactor: 7000, // 70%
    borrowFactor: 7000,     // 70%
    price: "10.00" // $10.00
  }
};

// Risk parameters
const RISK_PARAMS = {
  MAX_LTV: 8000,              // 80% max loan-to-value
  LIQUIDATION_THRESHOLD: 8500, // 85% liquidation threshold
  LIQUIDATION_BONUS: 500,      // 5% liquidation bonus
  BASE_RATE: 200,              // 2% base rate
  RATE_SLOPE_1: 400,           // 4% slope 1
  RATE_SLOPE_2: 10000,         // 100% slope 2
  OPTIMAL_UTILIZATION: 8000    // 80% optimal utilization
};

module.exports = {
  // Contract addresses
  MOCK_ORACLE_ADDRESS,
  RISK_MANAGER_ADDRESS,
  LENDING_POOL_V2_ADDRESS,
  USDC_ADDRESS,
  DAI_ADDRESS,
  WETH_ADDRESS,
  LINK_ADDRESS,
  ETH_ADDRESS,
  
  // Test accounts
  ACCOUNT1,
  ACCOUNT2,
  ACCOUNT3,
  
  // Configuration
  TOKEN_CONFIG,
  RISK_PARAMS
};
