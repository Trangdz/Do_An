import { ethers } from 'ethers';

/**
 * Calculate APR (Annual Percentage Rate) from Ray per second rate
 * 
 * @param rateRayPerSec - Interest rate in Ray (1e27) per second from contract
 * @returns APR as percentage (e.g., 5.25 for 5.25%)
 */
export function rayPerSecToAPR(rateRayPerSec: bigint): number {
  const SECONDS_PER_YEAR = 365 * 24 * 60 * 60; // 31,536,000
  const RAY = BigInt(10 ** 27);
  
  // Convert rate per second to rate per year
  // ratePerYear = ratePerSec * secondsPerYear
  const ratePerYear = rateRayPerSec * BigInt(SECONDS_PER_YEAR);
  
  // Convert from Ray (1e27) to percentage (1e2)
  // APR% = (ratePerYear / 1e27) * 100
  const aprBigInt = (ratePerYear * BigInt(100)) / RAY;
  
  // Convert to number for display
  return Number(aprBigInt) / 100; // Divide by 100 to get decimal places
}

/**
 * Calculate Utilization Rate
 * 
 * @param totalBorrowed - Total amount borrowed (in token's native decimals)
 * @param totalSupplied - Total amount supplied (in token's native decimals)
 * @returns Utilization as percentage (e.g., 75.5 for 75.5%)
 */
export function calculateUtilization(
  totalBorrowed: bigint,
  totalSupplied: bigint
): number {
  if (totalSupplied === BigInt(0) || totalBorrowed === BigInt(0)) {
    return 0;
  }
  
  // Utilization = (borrowed / supplied) * 100
  const utilization = (totalBorrowed * BigInt(10000)) / totalSupplied;
  return Number(utilization) / 100;
}

/**
 * Get reserve data including APRs from LendingPool contract
 * 
 * @param provider - Ethers provider
 * @param poolAddress - LendingPool contract address
 * @param assetAddress - Token address
 * @returns Reserve data with APRs and utilization
 */
export async function getReserveAPRData(
  provider: ethers.Provider,
  poolAddress: string,
  assetAddress: string
): Promise<{
  supplyAPR: number;
  borrowAPR: number;
  utilization: number;
  totalSupplied: string;
  totalBorrowed: string;
}> {
  try {
    // LendingPool ABI
    const poolABI = [
      'function reserves(address asset) external view returns (tuple(uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 lastUpdate, uint8 decimals, uint16 reserveFactorBps, uint16 ltvBps, uint16 liquidationThresholdBps, uint16 liquidationBonusBps, uint16 closeFactorBps, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec) reserve)',
      'function getInterestRateModel() external view returns (address)'
    ];
    
    const pool = new ethers.Contract(poolAddress, poolABI, provider);
    
    // Get reserve data
    const reserve = await pool.reserves(assetAddress);
    
    // Get InterestRateModel address
    const irmAddress = await pool.getInterestRateModel();
    
    // InterestRateModel ABI
    const irmABI = [
      'function getRates(uint256 cash, uint256 debtNow, uint16 reserveFactorBps, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec) external pure returns (uint64 borrowRateRayPerSec, uint64 supplyRateRayPerSec)'
    ];
    
    const irm = new ethers.Contract(irmAddress, irmABI, provider);
    
    // Calculate current rates
    const rates = await irm.getRates(
      reserve.reserveCash,
      reserve.totalDebtPrincipal,
      reserve.reserveFactorBps,
      reserve.optimalUBps,
      reserve.baseRateRayPerSec,
      reserve.slope1RayPerSec,
      reserve.slope2RayPerSec
    );
    
    // Convert rates to APR
    const supplyAPR = rayPerSecToAPR(rates.supplyRateRayPerSec);
    const borrowAPR = rayPerSecToAPR(rates.borrowRateRayPerSec);
    
    // Calculate utilization
    const utilization = calculateUtilization(
      reserve.totalDebtPrincipal,
      reserve.reserveCash + reserve.totalDebtPrincipal
    );
    
    // Format totals (convert from 1e18 to token decimals)
    const decimals = reserve.decimals;
    const conversionFactor = BigInt(10 ** (18 - decimals));
    const totalSupplied = ethers.formatUnits(
      (reserve.reserveCash + reserve.totalDebtPrincipal) / conversionFactor,
      decimals
    );
    const totalBorrowed = ethers.formatUnits(
      reserve.totalDebtPrincipal / conversionFactor,
      decimals
    );
    
    return {
      supplyAPR,
      borrowAPR,
      utilization,
      totalSupplied,
      totalBorrowed
    };
  } catch (error) {
    console.error('Error getting reserve APR data:', error);
    return {
      supplyAPR: 0,
      borrowAPR: 0,
      utilization: 0,
      totalSupplied: '0',
      totalBorrowed: '0'
    };
  }
}

/**
 * Format APR for display
 * 
 * @param apr - APR as number (e.g., 5.25)
 * @returns Formatted string (e.g., "5.25%")
 */
export function formatAPR(apr: number): string {
  if (apr === 0) return '0%';
  if (apr < 0.01) return '<0.01%';
  if (apr < 1) return apr.toFixed(2) + '%';
  return apr.toFixed(2) + '%';
}

/**
 * Format Utilization for display
 * 
 * @param utilization - Utilization as number (e.g., 75.5)
 * @returns Formatted string (e.g., "75.50%")
 */
export function formatUtilization(utilization: number): string {
  if (utilization === 0) return '0%';
  return utilization.toFixed(2) + '%';
}

