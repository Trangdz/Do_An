import { ethers } from 'ethers';

/**
 * Calculate APR (Annual Percentage Rate) from Ray per second rate
 * 
 * @param rateRayPerSec - Interest rate in Ray (1e27) per second from contract
 * @returns APR as percentage (e.g., 5.25 for 5.25%)
 */
export function rayPerSecToAPR(rateRayPerSec: bigint): number {
  if (rateRayPerSec === BigInt(0)) return 0;
  
  const SECONDS_PER_YEAR = BigInt(365 * 24 * 60 * 60); // 31,536,000
  const RAY = BigInt(10 ** 27);
  
  // Convert rate per second to rate per year
  // ratePerYear = ratePerSec * secondsPerYear
  const ratePerYear = rateRayPerSec * SECONDS_PER_YEAR;
  
  // Convert from Ray (1e27) to percentage with more precision
  // APR% = (ratePerYear / 1e27) * 100
  // Use more precision for small rates - multiply by 1000000 for 6 decimal places
  const aprBigInt = (ratePerYear * BigInt(1000000)) / RAY;
  
  // Convert to number and divide by 10000 to get percentage with 4 decimals
  // This preserves precision for small rates like 0.0086%
  return Number(aprBigInt) / 10000;
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
    
    // Handle zero address (native tokens like ETH) gracefully - return default values
    if (!assetAddress || assetAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('⚠️ Zero address or invalid asset address - returning default values (native token like ETH)');
      return {
        supplyAPR: 0,
        borrowAPR: 0,
        utilization: 0,
        totalSupplied: '0',
        totalBorrowed: '0',
      };
    }
    
    // LendingPool ABI - Map correctly to ReserveData struct (18 fields total)
    const poolABI = [
      'function reserves(address) external view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)',
      'function interestRateModel() external view returns (address)',
      'function _accrue(address) external' // For testing - not needed for read
    ];
    
    const pool = new ethers.Contract(poolAddress, poolABI, provider);
    
    // Get reserve data
    console.log('📊 Calling reserves()...');
    let reserveRaw;
    try {
      reserveRaw = await pool.reserves(assetAddress);
    } catch (callError: any) {
      // Silently return zero values if reserve not initialized
      if (callError.code === 'BAD_DATA' || callError.code === 'CALL_EXCEPTION') {
        console.debug('Reserve not initialized for:', assetAddress);
        return {
          supplyAPR: 0,
          borrowAPR: 0,
          utilization: 0,
          totalSupplied: '0',
          totalBorrowed: '0'
        };
      }
      throw callError;
    }
    
    // Check if reserve is initialized (lastUpdate == 0 means not initialized)
    if (!reserveRaw || reserveRaw.lastUpdate === 0) {
      console.debug('Reserve not initialized for:', assetAddress);
      return {
        supplyAPR: 0,
        borrowAPR: 0,
        utilization: 0,
        totalSupplied: '0',
        totalBorrowed: '0'
      };
    }
    
    console.log('📦 Reserve data retrieved, lastUpdate:', reserveRaw.lastUpdate.toString());
    
    // Extract fields from named tuple
    // Reserve already has updated rates from _accrue() - use them directly
    const reserveCash = reserveRaw.reserveCash;
    const totalDebtPrincipal = reserveRaw.totalDebtPrincipal;
    const liquidityRateRayPerSec = reserveRaw.liquidityRateRayPerSec;
    const variableBorrowRateRayPerSec = reserveRaw.variableBorrowRateRayPerSec;
    const reserveFactorBps = reserveRaw.reserveFactorBps;
    const decimals = reserveRaw.decimals || 18; // Default to 18 if not provided
    
    console.log('✅ Reserve data:', {
      cash: reserveCash.toString(),
      debt: totalDebtPrincipal.toString(),
      liquidityRate: liquidityRateRayPerSec.toString(),
      borrowRate: variableBorrowRateRayPerSec.toString(),
      reserveFactor: reserveFactorBps.toString(),
      decimals: decimals.toString()
    });
    
    // Use rates directly from reserve (already updated by _accrue())
    // These rates are already calculated based on current utilization
    console.log('📊 Using rates directly from reserve (already updated by _accrue()):', {
      liquidityRateRayPerSec: liquidityRateRayPerSec.toString(),
      variableBorrowRateRayPerSec: variableBorrowRateRayPerSec.toString()
    });
    
    // Convert rates to APR
    // Supply APR = liquidityRate (what suppliers earn)
    // Borrow APR = variableBorrowRate (what borrowers pay)
    const supplyAPR = rayPerSecToAPR(liquidityRateRayPerSec);
    const borrowAPR = rayPerSecToAPR(variableBorrowRateRayPerSec);
    
    console.log('💰 APR Results:', {
      supplyAPR: supplyAPR.toFixed(4) + '%',
      borrowAPR: borrowAPR.toFixed(4) + '%'
    });
    
    // Calculate utilization
    // Utilization = totalBorrowed / (reserveCash + totalBorrowed)
    const totalLiquidity = reserveCash + totalDebtPrincipal;
    const utilization = totalLiquidity > 0n
      ? calculateUtilization(totalDebtPrincipal, totalLiquidity)
      : 0;
    
    console.log('📈 Utilization:', utilization.toFixed(2) + '%');
    
    // Format totals using correct decimals from reserve
    const totalSupplied = ethers.formatUnits(
      totalLiquidity,
      decimals
    );
    const totalBorrowed = ethers.formatUnits(
      totalDebtPrincipal,
      decimals
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

