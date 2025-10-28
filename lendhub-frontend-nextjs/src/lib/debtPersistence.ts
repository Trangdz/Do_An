/**
 * Debt Persistence Service
 * 
 * Loads user debt and interest data from MongoDB/backend
 * Persists data across page reloads and tab closures
 */

interface UserPosition {
  asset: string;
  supply: {
    principal: string;
    snapshotIndex: string;
    currentIndex: string;
    balance: string;
    balanceWithInterest: string;
    interest: string;
    rateAPY: number;
    rateRayPerSec: string;
    valueUSD: number;
    isCollateral: boolean;
  };
  debt: {
    principal: string;
    snapshotIndex: string;
    currentIndex: string;
    balance: string;
    balanceWithInterest: string;
    interest: string;
    rateAPY: number;
    rateRayPerSec: string;
    valueUSD: number;
  };
  reserve: {
    liquidityIndex: string;
    borrowIndex: string;
    lastUpdate: string;
    utilization: number;
  };
}

interface UserPositionsData {
  user: string;
  positions: UserPosition[];
  totalCollateralUSD: number;
  totalDebtUSD: number;
  healthFactor: number;
  updatedAt: string;
  lastUpdateTimestamp: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Fetch user positions from backend API
 */
export async function fetchUserPositions(userAddress: string): Promise<UserPositionsData | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/positions/${userAddress}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error fetching user positions:', error);
    return null;
  }
}

/**
 * Get cached user positions from localStorage
 */
export function getCachedUserPositions(userAddress: string): UserPositionsData | null {
  try {
    const key = `userPositions:${userAddress}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      const data = JSON.parse(cached);
      // Check if cache is still fresh (less than 5 minutes old)
      const cacheAge = Date.now() - (data.cachedAt || 0);
      if (cacheAge < 5 * 60 * 1000) {
        return data;
      }
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting cached positions:', error);
    return null;
  }
}

/**
 * Cache user positions to localStorage
 */
export function cacheUserPositions(userAddress: string, data: UserPositionsData): void {
  try {
    const key = `userPositions:${userAddress}`;
    const dataWithCache = {
      ...data,
      cachedAt: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(dataWithCache));
  } catch (error) {
    console.error('❌ Error caching positions:', error);
  }
}

/**
 * Calculate estimated current balance with interest since last update
 * Uses client-side simulation for real-time updates
 */
export function calculateEstimatedBalance(
  principal: bigint,
  snapshotIndex: bigint,
  lastKnownIndex: bigint,
  lastUpdateTimestamp: number,
  rateRayPerSec: bigint
): bigint {
  if (principal === 0n || snapshotIndex === 0n) {
    return principal;
  }

  // Estimate current index based on time passed
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = currentTime - lastUpdateTimestamp;

  if (timeDiff <= 0) {
    // Use last known index
    return (principal * lastKnownIndex) / snapshotIndex;
  }

  // Contract formula: multiplier = 1e27 + (rateRayPerSec × timeDiff)
  const RAY = BigInt(1e27);
  const multiplier = RAY + (rateRayPerSec * BigInt(timeDiff));

  // Contract formula: newIndex = rayMul(lastKnownIndex, multiplier)
  // rayMul(a, b) = (a * b) / 1e27
  const estimatedIndex = (lastKnownIndex * multiplier) / RAY;

  // Calculate balance: balance = principal × (estimatedIndex / snapshotIndex)
  return (principal * estimatedIndex) / snapshotIndex;
}

/**
 * Get user position for a specific asset
 */
export function getUserPositionForAsset(
  positionsData: UserPositionsData | null,
  assetAddress: string
): UserPosition | null {
  if (!positionsData) return null;
  
  return positionsData.positions.find(p => 
    p.asset.toLowerCase() === assetAddress.toLowerCase()
  ) || null;
}

/**
 * Get real-time balance for a position (with simulated interest since last update)
 */
export function getRealtimeBalance(
  position: UserPosition | null,
  isSupply: boolean = true
): bigint {
  if (!position) return 0n;

  const data = isSupply ? position.supply : position.debt;
  
  const principal = BigInt(data.principal);
  const snapshotIndex = BigInt(data.snapshotIndex);
  const lastKnownIndex = BigInt(data.currentIndex);
  const lastUpdate = position.reserve.lastUpdate;
  const rateRayPerSec = BigInt(data.rateRayPerSec);

  // Calculate estimated balance with interest accrued since last update
  return calculateEstimatedBalance(
    principal,
    snapshotIndex,
    lastKnownIndex,
    parseInt(lastUpdate),
    rateRayPerSec
  );
}

/**
 * Load user positions with fallback to cache
 */
export async function loadUserPositions(
  userAddress: string,
  useCache: boolean = true
): Promise<UserPositionsData | null> {
  // Try cache first if enabled
  if (useCache) {
    const cached = getCachedUserPositions(userAddress);
    if (cached) {
      console.log('✅ Loaded positions from cache');
      return cached;
    }
  }

  // Fetch from API
  const data = await fetchUserPositions(userAddress);
  if (data) {
    cacheUserPositions(userAddress, data);
    console.log('✅ Loaded positions from API');
    return data;
  }

  // If API fails, try cache as fallback
  if (!useCache) {
    const cached = getCachedUserPositions(userAddress);
    if (cached) {
      console.log('⚠️ API failed, using cache');
      return cached;
    }
  }

  return null;
}

