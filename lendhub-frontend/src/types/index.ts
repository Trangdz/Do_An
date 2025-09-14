import { type BigNumberish } from 'ethers';

// Contract Addresses (from deployment)
export const CONTRACT_ADDRESSES = {
  LENDING_POOL: '0x1235aFDCab4a91496Bd74B3C527E50f961484d74',
  PRICE_ORACLE: '0xE315EF5DA360EC7Cfd0c59fEdf9F21a1E2c75A6b',
  WETH: '0xb5d81ad8Cacf1F3462e4C264Fd1850E4448464DA',
  DAI: '0xD7C7F0F9DA99f7630FFE1336333db8818caa3fc2',
} as const;

// Token Information
export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  isBorrowable: boolean;
  isCollateral: boolean;
}

// Reserve Data from Contract
export interface ReserveData {
  reserveCash: BigNumberish;
  totalDebt: BigNumberish;
  utilizationWad: BigNumberish;
  liquidityRateRayPerSec: BigNumberish;
  variableBorrowRateRayPerSec: BigNumberish;
  liquidityIndexRay: BigNumberish;
  variableBorrowIndexRay: BigNumberish;
  decimals: number;
  isBorrowable: boolean;
  liquidationThreshold: number;
  ltv: number;
  reserveFactor: number;
  liquidationBonus: number;
  closeFactor: number;
}

// User Reserve Data
export interface UserReserveData {
  supplyBalance1e18: BigNumberish;
  borrowBalance1e18: BigNumberish;
  isCollateral: boolean;
}

// Account Data
export interface AccountData {
  collateralValue1e18: BigNumberish;
  debtValue1e18: BigNumberish;
  healthFactor1e18: BigNumberish;
}

// Market Data for UI
export interface MarketData {
  token: Token;
  reserveData: ReserveData;
  userReserveData?: UserReserveData;
  price: number;
  supplyAPR: number;
  borrowAPR: number;
  utilization: number;
  totalSupply: number;
  totalBorrow: number;
  availableLiquidity: number;
}

// Transaction Status
export type TransactionStatus = 'idle' | 'pending' | 'confirmed' | 'failed';

// Transaction Data
export interface Transaction {
  hash: string;
  status: TransactionStatus;
  type: 'supply' | 'withdraw' | 'borrow' | 'repay' | 'liquidation';
  amount: string;
  token: string;
  timestamp: number;
}

// Event Data
export interface ReserveDataUpdatedEvent {
  asset: string;
  utilizationWad: BigNumberish;
  liquidityRateRayPerSec: BigNumberish;
  variableBorrowRateRayPerSec: BigNumberish;
  liquidityIndexRay: BigNumberish;
  variableBorrowIndexRay: BigNumberish;
  blockNumber: number;
  timestamp: number;
}

export interface SuppliedEvent {
  user: string;
  asset: string;
  amount: BigNumberish;
  blockNumber: number;
  timestamp: number;
}

export interface WithdrawnEvent {
  user: string;
  asset: string;
  amount: BigNumberish;
  blockNumber: number;
  timestamp: number;
}

export interface BorrowedEvent {
  user: string;
  asset: string;
  amount: BigNumberish;
  blockNumber: number;
  timestamp: number;
}

export interface RepaidEvent {
  user: string;
  onBehalfOf: string;
  asset: string;
  amount: BigNumberish;
  blockNumber: number;
  timestamp: number;
}

export interface LiquidatedEvent {
  liquidator: string;
  user: string;
  debtAsset: string;
  collateralAsset: string;
  debtAmount: BigNumberish;
  collateralAmount: BigNumberish;
  blockNumber: number;
  timestamp: number;
}

// Chart Data
export interface ChartDataPoint {
  timestamp: number;
  value: number;
  label: string;
}

export interface RateChartData {
  timestamp: number;
  supplyRate: number;
  borrowRate: number;
  utilization: number;
}

export interface PriceChartData {
  timestamp: number;
  price: number;
  symbol: string;
}

// Constants
export const WAD = 1e18;
export const RAY = 1e27;
export const SECONDS_PER_YEAR = 365 * 24 * 3600;

// Error Types
export interface ContractError {
  code: string;
  message: string;
  data?: any;
}

// Web3 Provider
export interface Web3Provider {
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
}
