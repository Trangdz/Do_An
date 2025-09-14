import { ethers, type BigNumberish } from 'ethers';
import { CONTRACT_ADDRESSES } from '../types';

// Contract ABIs (simplified for demo)
export const LENDING_POOL_ABI = [
  'function getAccountData(address user) external view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)',
  'function getReserveData(address asset) external view returns (uint256 reserveCash, uint256 totalDebt, uint256 utilizationWad, uint256 liquidityRateRayPerSec, uint256 variableBorrowRateRayPerSec, uint256 liquidityIndexRay, uint256 variableBorrowIndexRay, uint8 decimals, bool isBorrowable, uint16 liquidationThreshold, uint16 ltv, uint16 reserveFactor, uint16 liquidationBonus, uint16 closeFactor)',
  'function getUserReserveData(address user, address asset) external view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)',
  'function lend(address asset, uint256 amount) external',
  'function withdraw(address asset, uint256 amount) external',
  'function borrow(address asset, uint256 amount) external',
  'function repay(address asset, uint256 amount, address onBehalfOf) external returns (uint256)',
  'function liquidationCall(address debtAsset, address collateralAsset, address user, uint256 debtAmount) external',
  'function accruePublic(address asset) external',
  'function WETH() external view returns (address)',
  'function DAI() external view returns (address)',
  'event ReserveDataUpdated(address indexed asset, uint256 utilizationWad, uint256 liquidityRateRayPerSec, uint256 variableBorrowRateRayPerSec, uint256 liquidityIndexRay, uint256 variableBorrowIndexRay)',
  'event Supplied(address indexed user, address indexed asset, uint256 amount)',
  'event Withdrawn(address indexed user, address indexed asset, uint256 amount)',
  'event Borrowed(address indexed user, address indexed asset, uint256 amount)',
  'event Repaid(address indexed user, address indexed onBehalfOf, address indexed asset, uint256 amount)',
  'event Liquidated(address indexed liquidator, address indexed user, address indexed debtAsset, address indexed collateralAsset, uint256 debtAmount, uint256 collateralAmount)',
] as const;

export const PRICE_ORACLE_ABI = [
  'function getAssetPrice1e18(address asset) external view returns (uint256)',
  'function setAssetPrice(address asset, uint256 price) external',
] as const;

export const ERC20_ABI = [
  'function balanceOf(address owner) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)',
] as const;

// Contract instances
export class ContractManager {
  private provider: ethers.Provider;
  private signer: ethers.Signer | null = null;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
  }

  setSigner(signer: ethers.Signer) {
    this.signer = signer;
  }

  getLendingPool(): ethers.Contract {
    const contract = new ethers.Contract(
      CONTRACT_ADDRESSES.LENDING_POOL,
      LENDING_POOL_ABI,
      this.signer || this.provider
    );
    return contract;
  }

  getPriceOracle(): ethers.Contract {
    const contract = new ethers.Contract(
      CONTRACT_ADDRESSES.PRICE_ORACLE,
      PRICE_ORACLE_ABI,
      this.signer || this.provider
    );
    return contract;
  }

  getERC20(address: string): ethers.Contract {
    const contract = new ethers.Contract(
      address,
      ERC20_ABI,
      this.signer || this.provider
    );
    return contract;
  }

  // Helper methods for common operations
  async getAccountData(userAddress: string) {
    const pool = this.getLendingPool();
    return await pool.getAccountData(userAddress);
  }

  async getReserveData(assetAddress: string) {
    const pool = this.getLendingPool();
    return await pool.getReserveData(assetAddress);
  }

  async getUserReserveData(userAddress: string, assetAddress: string) {
    const pool = this.getLendingPool();
    return await pool.getUserReserveData(userAddress, assetAddress);
  }

  async getAssetPrice(assetAddress: string) {
    const oracle = this.getPriceOracle();
    return await oracle.getAssetPrice1e18(assetAddress);
  }

  async getTokenBalance(userAddress: string, assetAddress: string) {
    const token = this.getERC20(assetAddress);
    return await token.balanceOf(userAddress);
  }

  async getTokenAllowance(userAddress: string, assetAddress: string, spenderAddress: string) {
    const token = this.getERC20(assetAddress);
    return await token.allowance(userAddress, spenderAddress);
  }

  async approveToken(assetAddress: string, spenderAddress: string, amount: bigint) {
    if (!this.signer) throw new Error('No signer available');
    
    const token = this.getERC20(assetAddress);
    const tx = await token.approve(spenderAddress, amount);
    return await tx.wait();
  }

  async supply(assetAddress: string, amount: bigint) {
    if (!this.signer) throw new Error('No signer available');
    
    const pool = this.getLendingPool();
    const tx = await pool.lend(assetAddress, amount, { gasLimit: 1000000 });
    return await tx.wait();
  }

  async withdraw(assetAddress: string, amount: bigint) {
    if (!this.signer) throw new Error('No signer available');
    
    const pool = this.getLendingPool();
    const tx = await pool.withdraw(assetAddress, amount, { gasLimit: 1000000 });
    return await tx.wait();
  }

  async borrow(assetAddress: string, amount: bigint) {
    if (!this.signer) throw new Error('No signer available');
    
    const pool = this.getLendingPool();
    const tx = await pool.borrow(assetAddress, amount, { gasLimit: 1000000 });
    return await tx.wait();
  }

  async repay(assetAddress: string, amount: bigint, onBehalfOf: string) {
    if (!this.signer) throw new Error('No signer available');
    
    const pool = this.getLendingPool();
    const tx = await pool.repay(assetAddress, amount, onBehalfOf, { gasLimit: 1000000 });
    return await tx.wait();
  }

  async liquidate(debtAsset: string, collateralAsset: string, user: string, debtAmount: bigint) {
    if (!this.signer) throw new Error('No signer available');
    
    const pool = this.getLendingPool();
    const tx = await pool.liquidationCall(debtAsset, collateralAsset, user, debtAmount, { gasLimit: 2000000 });
    return await tx.wait();
  }

  // Event listeners
  onReserveDataUpdated(callback: (event: any) => void) {
    const pool = this.getLendingPool();
    return pool.on('ReserveDataUpdated', callback);
  }

  onSupplied(callback: (event: any) => void) {
    const pool = this.getLendingPool();
    return pool.on('Supplied', callback);
  }

  onWithdrawn(callback: (event: any) => void) {
    const pool = this.getLendingPool();
    return pool.on('Withdrawn', callback);
  }

  onBorrowed(callback: (event: any) => void) {
    const pool = this.getLendingPool();
    return pool.on('Borrowed', callback);
  }

  onRepaid(callback: (event: any) => void) {
    const pool = this.getLendingPool();
    return pool.on('Repaid', callback);
  }

  onLiquidated(callback: (event: any) => void) {
    const pool = this.getLendingPool();
    return pool.on('Liquidated', callback);
  }

  // Remove all listeners
  removeAllListeners() {
    const pool = this.getLendingPool();
    pool.removeAllListeners();
  }
}
