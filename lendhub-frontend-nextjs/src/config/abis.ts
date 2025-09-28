// Contract ABIs for LendHub v2

export const POOL_ABI = [
  // View functions
  'function getAccountData(address user) external view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)',
  'function getReserveData(address asset) external view returns (uint256 reserveCash, uint256 totalDebt, uint256 utilizationWad, uint256 liquidityRateRayPerSec, uint256 variableBorrowRateRayPerSec, uint256 liquidityIndexRay, uint256 variableBorrowIndexRay, uint8 decimals, bool isBorrowable, uint16 liquidationThreshold, uint16 ltv, uint16 reserveFactor, uint16 liquidationBonus, uint16 closeFactor)',
  'function getUserReserveData(address user, address asset) external view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)',
  'function reserves(address asset) external view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)',
  'function userReserves(address user, address asset) external view returns (uint256 supplyBalance1e18, uint256 borrowBalance1e18, bool isCollateral)',
  
  // Write functions
  'function lend(address asset, uint256 amount) external',
  'function withdraw(address asset, uint256 requested) external returns (uint256 amount1e18)',
  'function borrow(address asset, uint256 amount) external',
  'function repay(address asset, uint256 amount, address onBehalfOf) external returns (uint256)',
  'function liquidationCall(address debtAsset, address collateralAsset, address user, uint256 debtAmount) external',
  'function accruePublic(address asset) external',
  
  // Events
  'event ReserveDataUpdated(address indexed asset, uint256 utilizationWad, uint256 liquidityRateRayPerSec, uint256 variableBorrowRateRayPerSec, uint256 liquidityIndexRay, uint256 variableBorrowIndexRay)',
  'event Supplied(address indexed user, address indexed asset, uint256 amount)',
  'event Withdrawn(address indexed user, address indexed asset, uint256 amount)',
  'event Borrowed(address indexed user, address indexed asset, uint256 amount)',
  'event Repaid(address indexed user, address indexed onBehalfOf, address indexed asset, uint256 amount)',
  'event Liquidated(address indexed liquidator, address indexed user, address indexed debtAsset, address indexed collateralAsset, uint256 debtAmount, uint256 collateralAmount)',
] as const;

export const ERC20_ABI = [
  // View functions
  'function balanceOf(address owner) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)',
  'function totalSupply() external view returns (uint256)',
  
  // Write functions
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
] as const;

export const ORACLE_ABI = [
  // View functions
  'function getAssetPrice1e18(address asset) external view returns (uint256)',
  'function getAssetPrice(address asset) external view returns (uint256)',
  
  // Write functions (for testing)
  'function setAssetPrice(address asset, uint256 price) external',
  
  // Events
  'event AssetPriceUpdated(address indexed asset, uint256 oldPrice, uint256 newPrice)',
] as const;

// Interest Rate Model ABI (if needed)
export const INTEREST_RATE_MODEL_ABI = [
  'function getBorrowRate(uint256 cash, uint256 borrows, uint256 reserves) external view returns (uint256)',
  'function getSupplyRate(uint256 cash, uint256 borrows, uint256 reserves, uint256 reserveFactorMantissa) external view returns (uint256)',
] as const;
