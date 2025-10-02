import { ethers } from 'ethers';

/**
 * Calculate APR (Annual Percentage Rate) from Ray per second rate
 * 
 * @param rateRayPerSec - Interest rate in Ray (1e27) per second from contract
 * @returns APR as percentage (e.g., 5.25 for 5.25%)
 */
export function rayPerSecToAPR(rateRayPerSec: bigint): number {
  const SECONDS_PER_YEAR = BigInt(365 * 24 * 60 * 60); // 31,536,000
  const RAY = BigInt(10 ** 27);
  
  // Convert rate per second to rate per year
  // ratePerYear = ratePerSec * secondsPerYear
  const ratePerYear = rateRayPerSec * SECONDS_PER_YEAR;
  
  // Convert from Ray (1e27) to percentage with precision
  // APR% = (ratePerYear / 1e27) * 100
  // To preserve precision, multiply by 10000 first (for 4 decimal places)
  const aprBigInt = (ratePerYear * BigInt(10000)) / RAY;
  
  // Convert to number and divide by 100 to get percentage with 2 decimals
  return Number(aprBigInt) / 100;
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
    console.log('🔍 Fetching APR data for:', assetAddress);
    console.log('   Pool:', poolAddress);
    
    // Validate addresses
    if (!poolAddress || poolAddress === '0x0000000000000000000000000000000000000000') {
      console.error('❌ Invalid pool address');
      throw new Error('Invalid pool address');
    }
    
    if (!assetAddress || assetAddress === '0x0000000000000000000000000000000000000000') {
      console.error('❌ Invalid asset address');
      throw new Error('Invalid asset address');
    }
    
    // LendingPool ABI - Simple version without tuple names
    const poolABI = [
      'function reserves(address) external view returns (uint128, uint128, uint128, uint128, uint64, uint64, uint16, uint16, uint16, uint16, uint16, uint8, bool, uint16, uint64, uint64, uint64, uint40)',
      'function interestRateModel() external view returns (address)'
    ];
    
    const pool = new ethers.Contract(poolAddress, poolABI, provider);
    
    // Get reserve data
    console.log('📊 Calling reserves()...');
    const reserveRaw = await pool.reserves(assetAddress);
    
    // Check if reserve is initialized
    if (!reserveRaw || reserveRaw.length === 0) {
      console.error('❌ Reserve not initialized for:', assetAddress);
      throw new Error('Reserve not initialized');
    }
    
    console.log('📦 Raw reserve data length:', reserveRaw.length);
    console.log('📦 Reserve raw:', reserveRaw);
    
    // Extract only what we need from tuple (safer approach)
    const reserve = {
      reserveCash: reserveRaw[0],                    // uint128
      totalDebtPrincipal: reserveRaw[1],             // uint128
      reserveFactorBps: reserveRaw[6],               // uint16
      optimalUBps: reserveRaw[13],                   // uint16
      baseRateRayPerSec: reserveRaw[14],             // uint64
      slope1RayPerSec: reserveRaw[15],               // uint64
      slope2RayPerSec: reserveRaw[16]                // uint64
    };
    
    console.log('✅ Reserve data:', {
      cash: reserve.reserveCash.toString(),
      debt: reserve.totalDebtPrincipal.toString(),
      optimalU: reserve.optimalUBps.toString()
    });
    
    // Get InterestRateModel address
    const irmAddress = await pool.interestRateModel();
    
    // InterestRateModel ABI
    const irmABI = [
      'function getRates(uint256 cash, uint256 debtNow, uint16 reserveFactorBps, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec) external pure returns (uint64 borrowRateRayPerSec, uint64 supplyRateRayPerSec)'
    ];
    
    const irm = new ethers.Contract(irmAddress, irmABI, provider);
    
    console.log('🔧 IRM Parameters:', {
      cash: reserve.reserveCash.toString(),
      debt: reserve.totalDebtPrincipal.toString(),
      reserveFactorBps: reserve.reserveFactorBps.toString(),
      optimalUBps: reserve.optimalUBps.toString(),
      baseRate: reserve.baseRateRayPerSec.toString(),
      slope1: reserve.slope1RayPerSec.toString(),
      slope2: reserve.slope2RayPerSec.toString()
    });
    
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
    
    console.log('📊 Raw Rates from IRM:', {
      borrowRateRayPerSec: rates.borrowRateRayPerSec.toString(),
      supplyRateRayPerSec: rates.supplyRateRayPerSec.toString()
    });
    
    // Convert rates to APR
    const supplyAPR = rayPerSecToAPR(rates.supplyRateRayPerSec);
    const borrowAPR = rayPerSecToAPR(rates.borrowRateRayPerSec);
    
    console.log('💰 APR Results:', {
      supplyAPR: supplyAPR.toFixed(4) + '%',
      borrowAPR: borrowAPR.toFixed(4) + '%'
    });
    
    // Calculate utilization
    const utilization = calculateUtilization(
      reserve.totalDebtPrincipal,
      reserve.reserveCash + reserve.totalDebtPrincipal
    );
    
    console.log('📈 Utilization:', utilization.toFixed(2) + '%');
    
    // Format totals (values are in 1e18 precision in contract)
    // Simply format as strings without conversion
    const totalSupplied = ethers.formatUnits(
      reserve.reserveCash + reserve.totalDebtPrincipal,
      18
    );
    const totalBorrowed = ethers.formatUnits(
      reserve.totalDebtPrincipal,
      18
    );
    
    return {
      supplyAPR,
      borrowAPR,
      utilization,
      totalSupplied,
      totalBorrowed
    };
  } catch (error: any) {
    console.error('❌ Error getting reserve APR data:', error);
    
    // Log detailed error info for debugging
    if (error.code === 'BAD_DATA') {
      console.error('   Reason: Contract returned empty data (0x)');
      console.error('   Possible causes:');
      console.error('   1. Reserve not initialized');
      console.error('   2. Wrong contract address');
      console.error('   3. Wrong network');
      console.error('   4. Provider not connected');
    }
    
    // Return zeros silently (don't crash the UI)
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

