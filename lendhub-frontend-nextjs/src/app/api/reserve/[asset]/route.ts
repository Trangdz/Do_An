import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const POOL_ADDRESS = process.env.NEXT_PUBLIC_LENDING_POOL!;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';

const RESERVE_ABI = [
  'function reserves(address) view returns (tuple(uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate))'
];

const SECONDS_PER_YEAR = 31536000;

function calculateUtilization(reserve: any): number {
  const cash = Number(reserve.reserveCash);
  const debt = Number(reserve.totalDebtPrincipal);
  
  if (cash === 0 && debt === 0) return 0;
  if (debt === 0) return 0;
  
  return debt / (cash + debt) * 100;
}

function calculateAPR(rateRayPerSec: bigint): number {
  const rate = Number(rateRayPerSec);
  const apr = (rate * SECONDS_PER_YEAR / 1e27) * 100;
  return apr;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ asset: string }> }
) {
  try {
    const resolvedParams = await params;
    const assetAddress = resolvedParams.asset;
    
    if (!assetAddress || assetAddress === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json(
        { error: 'Invalid asset address' },
        { status: 400 }
      );
    }

    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const pool = new ethers.Contract(POOL_ADDRESS, RESERVE_ABI, provider);
    
    // Get reserve data
    const reserve = await pool.reserves(assetAddress);
    
    // Check if reserve is initialized
    if (!reserve || reserve.lastUpdate === 0) {
      return NextResponse.json({
        asset: assetAddress,
        isInitialized: false,
        message: 'Reserve not initialized'
      });
    }

    // Calculate derived values
    const utilization = calculateUtilization(reserve);
    const supplyAPR = calculateAPR(reserve.liquidityRateRayPerSec);
    const borrowAPR = calculateAPR(reserve.variableBorrowRateRayPerSec);
    
    const liquidityIndexNum = Number(reserve.liquidityIndex) / 1e27;
    const borrowIndexNum = Number(reserve.variableBorrowIndex) / 1e27;

    return NextResponse.json({
      asset: assetAddress,
      isInitialized: true,
      liquidityRate: Number(reserve.liquidityRateRayPerSec),
      liquidityIndex: liquidityIndexNum,
      variableBorrowIndex: borrowIndexNum,
      lastUpdate: Number(reserve.lastUpdate),
      utilization: utilization,
      supplyAPR: supplyAPR,
      borrowAPR: borrowAPR,
      reserveFactorBps: Number(reserve.reserveFactorBps),
      optimalUBps: Number(reserve.optimalUBps),
      baseRateRayPerSec: Number(reserve.baseRateRayPerSec),
      slope1RayPerSec: Number(reserve.slope1RayPerSec),
      slope2RayPerSec: Number(reserve.slope2RayPerSec),
      isBorrowable: reserve.isBorrowable,
      decimals: reserve.decimals,
      reserveCash: Number(reserve.reserveCash) / 1e18,
      totalDebtPrincipal: Number(reserve.totalDebtPrincipal) / 1e18
    });
  } catch (error: any) {
    console.error('Error fetching reserve data:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch reserve data',
        message: error.message,
        asset: (await params).asset
      },
      { status: 500 }
    );
  }
}


