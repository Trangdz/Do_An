/**
 * On-Chain Interest Calculator
 * Tính toán lãi tích lũy từ dữ liệu on-chain theo chuẩn Aave
 */

export interface OnChainSnapshot {
  scaledBalance: number;           // Số dư gốc đã chuẩn hóa (user-level)
  liquidityIndex: number;          // Hệ số tích lũy lãi toàn pool hiện tại (asset-level)
  liquidityRate: number;           // APR theo RAY per second (1e27)
  lastUpdateTimestamp: number;     // Timestamp block gần nhất
  blockNumber?: number;             // Block number để theo dõi
  snapshotIndex?: number;           // Index khi user supply (user-level) - để tính balance đúng
}

const SECONDS_PER_YEAR = 31536000;
const RAY = 1e27;

/**
 * Tính liquidity index mới từ lastUpdateTimestamp đến hiện tại
 * Công thức Aave: newIndex = oldIndex × (1 + rate × deltaTime / SECONDS_PER_YEAR)
 */
export function calculateNewLiquidityIndex(
  oldLiquidityIndex: number,
  liquidityRate: number,
  lastUpdateTimestamp: number,
  currentTimestamp?: number
): number {
  const now = currentTimestamp || Math.floor(Date.now() / 1000);
  const deltaTime = now - lastUpdateTimestamp;
  
  if (deltaTime <= 0) {
    return oldLiquidityIndex;
  }
  
  // Công thức Aave: newIndex = oldIndex × (1 + rate × deltaTime / SECONDS_PER_YEAR)
  // liquidityRate là RAY per second, cần convert sang rate per year
  // ratePerYear = liquidityRate / SECONDS_PER_YEAR
  // multiplier = 1 + (liquidityRate / SECONDS_PER_YEAR) × deltaTime
  
  // Vì liquidityRate đã là RAY, ta cần:
  // multiplier = 1 + (liquidityRate / RAY) × (deltaTime / SECONDS_PER_YEAR)
  const rateDecimal = liquidityRate / RAY; // Convert RAY to decimal
  const multiplier = 1 + (rateDecimal * deltaTime) / SECONDS_PER_YEAR;
  
  return oldLiquidityIndex * multiplier;
}

/**
 * Tính actualBalance từ snapshot
 * Công thức: actualBalance = scaledBalance × newLiquidityIndex
 */
export function calculateActualBalance(snapshot: OnChainSnapshot): number {
  const newLiquidityIndex = calculateNewLiquidityIndex(
    snapshot.liquidityIndex,
    snapshot.liquidityRate,
    snapshot.lastUpdateTimestamp
  );
  
  return snapshot.scaledBalance * (newLiquidityIndex / RAY);
}

/**
 * Save snapshot to localStorage
 */
export function saveSnapshotToLocalStorage(
  key: string,
  snapshot: OnChainSnapshot
): void {
  try {
    const data = {
      ...snapshot,
      savedAt: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(data));
    console.log('💾 Saved snapshot to localStorage:', key, snapshot);
  } catch (error) {
    console.warn('⚠️ Failed to save snapshot:', error);
  }
}

/**
 * Load snapshot from localStorage
 */
export function loadSnapshotFromLocalStorage(
  key: string
): OnChainSnapshot | null {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const data = JSON.parse(stored);
      console.log('✅ Loaded snapshot from localStorage:', key, data);
      return {
        scaledBalance: data.scaledBalance,
        liquidityIndex: data.liquidityIndex,
        liquidityRate: data.liquidityRate,
        lastUpdateTimestamp: data.lastUpdateTimestamp,
        blockNumber: data.blockNumber
      };
    }
  } catch (error) {
    console.warn('⚠️ Failed to load snapshot:', error);
  }
  return null;
}

/**
 * Generate localStorage key
 */
export function getSnapshotKey(
  userAddress: string,
  assetAddress: string,
  isSupply: boolean = true
): string {
  return `onchain_snapshot_${userAddress.toLowerCase()}_${assetAddress.toLowerCase()}_${isSupply ? 'supply' : 'borrow'}`;
}

