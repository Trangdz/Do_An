// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import "../libraries/LendingMath.sol";
import "../models/ReserveUserModels.sol";
import "./InterestRateModel.sol";
import "../interfaces/IPriceOracle.sol";
import "../rewards/IAAVERewardDistributor.sol";

using LendingMath for uint256;
using ReserveUserModels for ReserveUserModels.ReserveData;

library RayMath {
    uint256 internal constant RAY = 1e27;

    function rayMul(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a * b) / RAY;
    }

    function rayDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a * RAY) / b;
    }
}

contract LendingPool is ReentrancyGuard, Pausable {
    using RayMath for uint256;
    using SafeERC20 for IERC20;
    address public owner = msg.sender;
    address public governor; // Governor contract address
    
    // Hardcoded addresses for demo (in production, these would be configurable)
    // Note: These addresses will be set during deployment
    address public WETH;
    address public DAI;
    // asset => ReserveData
    mapping(address => ReserveUserModels.ReserveData) public reserves;

    // user => asset => UserReserveData
 mapping(address => mapping(address => ReserveUserModels.UserReserveData)) public userReserves;

    InterestRateModel public immutable interestRateModel;
    IPriceOracle public immutable oracle;
    
    // Reward accumulator (optional - can be zero address if not set)
    address public rewardAccumulator;
    
    // AAVE-style reward distributor (optional - can be zero address if not set)
    IAAVERewardDistributor public rewardDistributor;

    constructor(address irm, address _oracle, address _weth, address _dai) {
        interestRateModel = InterestRateModel(irm);
        oracle = IPriceOracle(_oracle);
        WETH = _weth;
        DAI = _dai;
    }
    
    /**
     * @notice Set reward accumulator address (only owner)
     */
    function setRewardAccumulator(address _rewardAccumulator) external onlyOwner {
        rewardAccumulator = _rewardAccumulator;
    }
    
    /**
     * @notice Set AAVE-style reward distributor address (only owner)
     */
    function setRewardDistributor(address _rewardDistributor) external onlyOwner {
        rewardDistributor = IAAVERewardDistributor(_rewardDistributor);
    }
    
    /**
     * @notice Internal function to accumulate rewards for a user
     */
    function _accumulateRewards(address user) internal {
        if (rewardAccumulator != address(0)) {
            // Call reward accumulator to calculate and accumulate rewards
            // Using low-level call to avoid adding dependency
            (bool success, ) = rewardAccumulator.call(
                abi.encodeWithSignature("accumulateRewards(address)", user)
            );
            // Don't revert if reward accumulation fails (non-critical)
            if (!success) {
                // Silently fail - rewards are not critical for core functionality
            }
        }
    }
    
    /**
     * @notice Internal function to update supply balance in RewardAccumulator
     */
    function _updateSupplyReward(address user, address asset, uint256 supplyBalance) internal {
        if (rewardAccumulator != address(0)) {
            // Use call with sufficient gas limit
            // updateSupplyBalance does: read state, calculate, call RewardDistributor, update state
            // RewardDistributor.accumulateReward does: check auth, update mapping, emit event
            // Total gas needed: ~50000 for updateSupplyBalance + ~30000 for accumulateReward = ~80000
            // Use 200000 to be safe
            (bool success, bytes memory returnData) = rewardAccumulator.call{gas: 200000}(
                abi.encodeWithSignature("updateSupplyBalance(address,address,uint256)", user, asset, supplyBalance)
            );
            // Don't revert if reward update fails (non-critical)
            if (!success) {
                // Emit event for debugging (can be filtered out in production)
                // This helps identify why rewards aren't accumulating
                emit RewardUpdateFailed(user, asset, returnData);
            }
        }
    }
    
    // Event for debugging reward update failures
    event RewardUpdateFailed(address indexed user, address indexed asset, bytes returnData);
    
    /**
     * @notice Internal function to update borrow balance in RewardAccumulator
     */
    function _updateBorrowReward(address user, address asset, uint256 borrowBalance) internal {
        if (rewardAccumulator != address(0)) {
            // Use call with sufficient gas limit (same as _updateSupplyReward)
            (bool success, bytes memory returnData) = rewardAccumulator.call{gas: 200000}(
                abi.encodeWithSignature("updateBorrowBalance(address,address,uint256)", user, asset, borrowBalance)
            );
            // Don't revert if reward update fails (non-critical)
            if (!success) {
                // Emit event for debugging
                emit RewardUpdateFailed(user, asset, returnData);
            }
        }
    }
    
    /**
     * @notice Update user reward using AAVE-style reward distributor (internal helper)
     * @dev Called after supply, withdraw, borrow, repay actions
     * @param user User address
     * @param asset Asset address
     */
    function _updateUserReward(address user, address asset) internal {
        if (address(rewardDistributor) == address(0)) return;
        
        ReserveUserModels.ReserveData storage reserve = reserves[asset];
        
        // Get current balances (in 1e18)
        uint256 supplyBalance = _currentSupply(user, asset);
        uint256 borrowBalance = _currentDebt(user, asset);
        
        // Total supply = reserveCash (available liquidity) + totalDebtPrincipal (borrowed out)
        // This represents total tokens supplied by all users
        uint256 totalSupply = uint256(reserve.reserveCash) + uint256(reserve.totalDebtPrincipal);
        
        // Total borrow = totalDebtPrincipal (total amount borrowed by all users)
        uint256 totalBorrow = uint256(reserve.totalDebtPrincipal);
        
        // Call handleAction with try-catch to avoid reverting on reward update failure
        try rewardDistributor.handleAction(
            user,
            asset,
            supplyBalance,
            borrowBalance,
            totalSupply,
            totalBorrow
        ) {
            // Success - reward updated
        } catch (bytes memory returnData) {
            // Don't revert if reward update fails (non-critical)
            emit RewardUpdateFailed(user, asset, returnData);
        }
    }

    /// @notice Cập nhật index & rates cho asset
    function _accrue(address asset) internal {
        ReserveUserModels.ReserveData storage r = reserves[asset];

    // Khởi tạo nếu lần đầu
    if (r.lastUpdate == 0) {
        r.liquidityIndex = uint128(1e27);
        r.variableBorrowIndex = uint128(1e27);
        r.lastUpdate = uint40(block.timestamp);
    }

    uint256 dt = block.timestamp - uint256(r.lastUpdate);
    if (dt > 0) {
        // cập nhật index theo dt
        uint256 liqIndex = uint256(r.liquidityIndex);
        uint256 borIndex = uint256(r.variableBorrowIndex);
        liqIndex = RayMath.rayMul(liqIndex, 1e27 + uint256(r.liquidityRateRayPerSec) * dt);
        borIndex = RayMath.rayMul(borIndex, 1e27 + uint256(r.variableBorrowRateRayPerSec) * dt);
        r.liquidityIndex = uint128(liqIndex);
        r.variableBorrowIndex = uint128(borIndex);
        r.lastUpdate = uint40(block.timestamp);
    }

    // Lấy rates mới từ IRM theo trạng thái hiện tại
    (uint64 borrowRate, uint64 supplyRate) = interestRateModel.getRates(
        r.reserveCash,
        r.totalDebtPrincipal,
        r.reserveFactorBps,
        r.optimalUBps,
        r.baseRateRayPerSec,
        r.slope1RayPerSec,
        r.slope2RayPerSec
    );
    r.variableBorrowRateRayPerSec = borrowRate;
    r.liquidityRateRayPerSec = supplyRate;

    // U để log
    uint256 U = (r.totalDebtPrincipal == 0)
        ? 0
        : (uint256(r.totalDebtPrincipal) * 1e18) / (uint256(r.reserveCash) + uint256(r.totalDebtPrincipal));

    emit ReserveDataUpdated(
        asset,
        U,
        r.liquidityRateRayPerSec,
        r.variableBorrowRateRayPerSec,
        r.liquidityIndex,
        r.variableBorrowIndex
    );
}

    event ReserveDataUpdated(
        address indexed asset,
        uint256 utilizationWad,
        uint256 liquidityRateRayPerSec,
        uint256 variableBorrowRateRayPerSec,
        uint256 liquidityIndexRay,
        uint256 variableBorrowIndexRay
    );

    event Supplied(address indexed user, address indexed asset, uint256 amount);
    event Withdrawn(address indexed user, address indexed asset, uint256 amount);

 // ========== ERRORS ==========
    error InvalidAmount();
    error InsufficientLiquidity();
    error HealthFactorTooLow();
    error AssetNotInitialized();


    /// @notice Cho phép gọi accrue thủ công để demo/test (có thể bỏ modifier hoặc hạn chế sau)
    function accruePublic(address asset) external {
        _accrue(asset);
    }


    function _requireInited(address asset) internal view {
    if (reserves[asset].liquidityIndex == 0 && reserves[asset].lastUpdate == 0) {
        revert AssetNotInitialized();
    }
}

function _to1e18(uint256 amt, uint8 decimals) internal pure returns (uint256) {
    if (decimals == 18) return amt;
    if (decimals < 18)  return amt * (10 ** (18 - decimals));
    return amt / (10 ** (decimals - 18));
}

function _from1e18(uint256 amt1e18, uint8 decimals) internal pure returns (uint256) {
    if (decimals == 18) return amt1e18;
    if (decimals < 18)  return amt1e18 / (10 ** (18 - decimals));
    return amt1e18 * (10 ** (decimals - 18));
}

// đọc số dư hiện tại theo index
function _currentSupply(address user, address asset) internal view returns (uint256 supplyNow1e18) {
    ReserveUserModels.UserReserveData storage u = userReserves[user][asset];
    ReserveUserModels.ReserveData storage r = reserves[asset];
    if (u.supply.principal == 0) return 0;
    return LendingMath.valueByIndex(u.supply.principal, r.liquidityIndex, u.supply.index); // 1e18
}

function _currentDebt(address user, address asset) internal view returns (uint256 debtNow1e18) {
    ReserveUserModels.UserReserveData storage u = userReserves[user][asset];
    ReserveUserModels.ReserveData storage r = reserves[asset];
    if (u.borrow.principal == 0) return 0;
    return LendingMath.valueByIndex(u.borrow.principal, r.variableBorrowIndex, u.borrow.index); // 1e18
}

function _getAccountData(address user) internal view returns (
    uint256 collateralValue1e18,
    uint256 debtValue1e18,
    uint256 healthFactor1e18
) {
    // Loop through all initialized assets to calculate total collateral and debt
    for (uint256 i = 0; i < _allAssets.length; i++) {
        address asset = _allAssets[i];
        ReserveUserModels.ReserveData storage r = reserves[asset];
        ReserveUserModels.UserReserveData storage u = userReserves[user][asset];
        
        // Skip if reserve not initialized
        if (r.lastUpdate == 0) continue;
        
        // Get asset price
        uint256 price = oracle.getAssetPrice1e18(asset);
        if (price == 0) continue; // Skip if price not available
        
        // Calculate collateral value (weighted by LTV)
        // ONLY if user has enabled this asset as collateral
        uint256 supply = _currentSupply(user, asset);
        if (supply > 0 && u.useAsCollateral) {
            // collateralValue = supply * price * ltvBps / 10000
            // Both supply and price are in 1e18, so we divide by 1e18 once
            uint256 supplyValueUSD = (supply * price) / 1e18;
            uint256 weightedCollateral = (supplyValueUSD * uint256(r.ltvBps)) / 10000;
            collateralValue1e18 += weightedCollateral;
        }
        
        // Calculate debt value
        uint256 debt = _currentDebt(user, asset);
        if (debt > 0) {
            // debtValue = debt * price
            // Both debt and price are in 1e18, so we divide by 1e18 once
            uint256 debtValueUSD = (debt * price) / 1e18;
            debtValue1e18 += debtValueUSD;
        }
    }
    
    // Calculate health factor
    if (debtValue1e18 == 0) {
        healthFactor1e18 = type(uint256).max;
    } else {
        healthFactor1e18 = (collateralValue1e18 * 1e18) / debtValue1e18;
    }
}

// x_max theo công thức bạn chốt: tối đa rút được của 1 asset khi vẫn HF_after>=1
function _maxWithdrawAllowed(address user, address asset) internal view returns (uint256 xMax1e18) {
    ReserveUserModels.UserReserveData storage u = userReserves[user][asset];
    
    // If user has no supply, cannot withdraw
    uint256 supply = _currentSupply(user, asset);
    if (supply == 0) {
        return 0;
    }
    
    // If not used as collateral, can withdraw all
    if (!u.useAsCollateral) {
        return supply;
    }
    
    // If used as collateral, check health factor
    (uint256 totalColl, uint256 totalDebt, ) = _getAccountData(user);
    
    // If no debt, can withdraw all
    if (totalDebt == 0) {
        return supply;
    }
    
    // Get current supply balance and price
    uint256 price = oracle.getAssetPrice1e18(asset);
    uint256 supplyValueUSD = (supply * price) / 1e18;
    
    ReserveUserModels.ReserveData storage r = reserves[asset];
    uint256 weightedCollateral = (supplyValueUSD * uint256(r.ltvBps)) / 10000;
    
    // If removing this collateral would make HF < 1, limit withdraw
    uint256 collateralAfter = totalColl - weightedCollateral;
    if (collateralAfter < totalDebt) {
        // Calculate how much we can withdraw to keep HF = 1.0
        // target_collateral = totalDebt (to get HF = 1)
        // collateral_to_remove = totalColl - target_collateral
        uint256 maxCollateralToRemove = totalColl - totalDebt;
        
        if (maxCollateralToRemove >= weightedCollateral) {
            // Can withdraw all of this asset
            return supply;
        } else {
            // Can only withdraw partial amount
            // maxCollateralToRemove (USD) / weightedCollateral (USD) * supply
            uint256 partialValue = (supply * maxCollateralToRemove) / weightedCollateral;
            return partialValue;
        }
    }
    
    // Can withdraw all
    return supply;
}

/// @notice View helper to check if user can withdraw a collateral amount while keeping HF >= 1
/// @return ok true if allowed, hfAfter health factor after hypothetical withdrawal
function canWithdrawCollateral(address user, address asset, uint256 amount /* asset native decimals */)
    external
    view
    returns (bool ok, uint256 hfAfter)
{
    ReserveUserModels.UserReserveData storage u = userReserves[user][asset];
    ReserveUserModels.ReserveData storage r = reserves[asset];
    uint256 amt1e18 = _to1e18(amount, r.decimals);

    // If not using as collateral or no debt -> always allowed
    (uint256 totalColl, uint256 totalDebt, ) = _getAccountData(user);
    if (!u.useAsCollateral || totalDebt == 0) {
        return (true, type(uint256).max);
    }

    // Current weighted collateral of this asset
    uint256 supply = _currentSupply(user, asset);
    if (amt1e18 > supply) return (false, 0);
    uint256 price = oracle.getAssetPrice1e18(asset);
    uint256 beforeWeighted = ((supply * price) / 1e18) * uint256(r.ltvBps) / 10000;
    uint256 afterWeighted = (((supply - amt1e18) * price) / 1e18) * uint256(r.ltvBps) / 10000;
    uint256 collAfter = totalColl - beforeWeighted + afterWeighted;
    hfAfter = totalDebt == 0 ? type(uint256).max : (collAfter * 1e18) / totalDebt;
    ok = hfAfter >= 1e18;
}

/// @notice View helper to check if user can disable a collateral asset while keeping HF >= 1
function canDisableCollateral(address user, address asset) external view returns (bool ok, uint256 hfAfter) {
    ReserveUserModels.UserReserveData storage u = userReserves[user][asset];
    (uint256 totalColl, uint256 totalDebt, ) = _getAccountData(user);
    if (!u.useAsCollateral || totalDebt == 0) return (true, type(uint256).max);

    ReserveUserModels.ReserveData storage r = reserves[asset];
    uint256 supply = _currentSupply(user, asset);
    uint256 price = oracle.getAssetPrice1e18(asset);
    uint256 weighted = ((supply * price) / 1e18) * uint256(r.ltvBps) / 10000;
    uint256 collAfter = totalColl > weighted ? totalColl - weighted : 0;
    if (collAfter == 0) return (false, 0);
    hfAfter = (collAfter * 1e18) / totalDebt;
    ok = hfAfter >= 1e18;
}



function lend(address asset, uint256 amount) external {
    if (amount == 0) revert InvalidAmount();
    _requireInited(asset);

    // 1) Accrue
    _accrue(asset);

    ReserveUserModels.ReserveData storage r = reserves[asset];
    ReserveUserModels.UserReserveData storage u = userReserves[msg.sender][asset];

    // 2) Nhận token (SafeERC20 + FoT aware)
    uint256 balBefore = IERC20(asset).balanceOf(address(this));
    IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
    uint256 delta = IERC20(asset).balanceOf(address(this)) - balBefore;
    // normalize về 1e18
    uint256 delta1e18 = _to1e18(delta, r.decimals);

    // 3) Cập nhật supplyNow → +delta → chốt lại principal/index
    uint256 sNow = _currentSupply(msg.sender, asset); // 1e18
    uint256 sNew = sNow + delta1e18;
    u.supply.principal = uint128(sNew);
    u.supply.index = r.liquidityIndex;
    
    // Do NOT auto-enable collateral on supply.
    // Collateral must be toggled explicitly by user via setUserUseReserveAsCollateral.

    // 4) Cập nhật sổ cái
    r.reserveCash = uint128(uint256(r.reserveCash) + delta1e18);

    // 5) Accrue lại để tính rates mới sau khi utilization thay đổi
    // (reserveCash đã thay đổi nên utilization và rates cần được tính lại)
    _accrue(asset);

    // 6) Update reward accumulator with new supply balance (legacy)
    _updateSupplyReward(msg.sender, asset, sNew);
    
    // 6.5) Force accumulate rewards after update (to make rewards available immediately)
    _accumulateRewards(msg.sender);
    
    // 7) Update AAVE-style reward distributor
    _updateUserReward(msg.sender, asset);

    emit Supplied(msg.sender, asset, delta1e18);
}



function withdraw(address asset, uint256 requested) external returns (uint256 amount1e18) {
    _requireInited(asset);
    _accrue(asset);

    ReserveUserModels.ReserveData storage r = reserves[asset];
    ReserveUserModels.UserReserveData storage u = userReserves[msg.sender][asset];

    uint256 balNow = _currentSupply(msg.sender, asset);              // 1e18
    if (balNow == 0) return 0;

    uint256 req1e18 = _to1e18(requested, r.decimals);

    // giới hạn HF: x_max
    uint256 xMax = _maxWithdrawAllowed(msg.sender, asset);           // 1e18
    // thanh khoản pool
    uint256 available = r.reserveCash;                                // 1e18

    // số thực sự rút
    uint256 amt = req1e18;
    if (amt > balNow) amt = balNow;
    if (amt > available) amt = available;
    if (amt > xMax) amt = xMax;

    if (amt == 0) revert HealthFactorTooLow();

    // cập nhật vị thế: supplyNew = balNow - amt
    uint256 sNew = balNow - amt;
    u.supply.principal = uint128(sNew);
    u.supply.index = r.liquidityIndex;

    // cập nhật sổ cái & chuyển token
    r.reserveCash = uint128(uint256(r.reserveCash) - amt);

    // Accrue lại để tính rates mới sau khi utilization thay đổi
    _accrue(asset);

    // denormalize để chuyển đi
    uint256 transferOut = _from1e18(amt, r.decimals);
    IERC20(asset).safeTransfer(msg.sender, transferOut);

    // Update reward accumulator with new supply balance (legacy)
    _updateSupplyReward(msg.sender, asset, sNew);
    
    // Force accumulate rewards after update
    _accumulateRewards(msg.sender);
    
    // Update AAVE-style reward distributor
    _updateUserReward(msg.sender, asset);

    emit Withdrawn(msg.sender, asset, amt);
    return amt; // 1e18 (chuẩn 1e18, tiện test/hiển thị)
}

function borrow(address asset, uint256 amount) external nonReentrant whenNotPaused {
    if (amount == 0) revert InvalidAmount();
    _requireInited(asset);
    
    ReserveUserModels.ReserveData storage r = reserves[asset];
    if (!r.isBorrowable) revert InvalidAmount();
    
    _accrue(asset);
    
    ReserveUserModels.UserReserveData storage u = userReserves[msg.sender][asset];
    
    // Check health factor before borrow
    uint256 borrowAmount1e18 = _to1e18(amount, r.decimals);
    
    // Calculate new debt with price
    uint256 price = oracle.getAssetPrice1e18(asset);
    uint256 newDebtValueUSD = (borrowAmount1e18 * price) / 1e18;
    
    // Get account data (collateral already includes LTV)
    (uint256 col, uint256 debt, ) = _getAccountData(msg.sender);
    uint256 totalNewDebt = debt + newDebtValueUSD;
    
    // Health factor must be > 1 after borrow (with 1% buffer for safety)
    require(col * 100 > totalNewDebt * 101, "Health factor too low");
    
    // Additional check: Ensure user has enabled collateral assets
    if (debt == 0 && borrowAmount1e18 > 0) {
        // First borrow - check user has at least one collateral
        bool hasCollateral = false;
        for (uint256 i = 0; i < _allAssets.length; i++) {
            address assetAddr = _allAssets[i];
            ReserveUserModels.UserReserveData storage uCheck = userReserves[msg.sender][assetAddr];
            if (uCheck.useAsCollateral && uCheck.supply.principal > 0) {
                hasCollateral = true;
                break;
            }
        }
        require(hasCollateral, "No collateral enabled");
    }
    
    // Check liquidity
    require(r.reserveCash >= borrowAmount1e18, "Insufficient liquidity");
    
    // Update user debt position
    uint256 currentDebt = _currentDebt(msg.sender, asset);
    uint256 newDebtTotal = currentDebt + borrowAmount1e18;
    u.borrow.principal = uint128(newDebtTotal);
    u.borrow.index = r.variableBorrowIndex;
    
    // Update reserve
    r.reserveCash = uint128(uint256(r.reserveCash) - borrowAmount1e18);
    r.totalDebtPrincipal = uint128(uint256(r.totalDebtPrincipal) + borrowAmount1e18);
    
    // Accrue lại để tính rates mới sau khi utilization thay đổi
    _accrue(asset);
    
    // Update reward accumulator with new borrow balance (legacy)
    _updateBorrowReward(msg.sender, asset, newDebtTotal);
    
    // Force accumulate rewards after update
    _accumulateRewards(msg.sender);
    
    // Update AAVE-style reward distributor
    _updateUserReward(msg.sender, asset);
    
    emit Borrowed(msg.sender, asset, borrowAmount1e18);
}

function repay(address asset, uint256 amount, address onBehalfOf) external nonReentrant whenNotPaused returns (uint256) {
    _requireInited(asset);
    _accrue(asset);
    
    ReserveUserModels.ReserveData storage r = reserves[asset];
    ReserveUserModels.UserReserveData storage u = userReserves[onBehalfOf][asset];
    
    uint256 currentDebt = _currentDebt(onBehalfOf, asset);
    if (currentDebt == 0) return 0;
    
    uint256 repayAmount1e18 = _to1e18(amount, r.decimals);
    if (repayAmount1e18 > currentDebt) repayAmount1e18 = currentDebt;
    
    // Transfer tokens from user
    uint256 transferAmount = _from1e18(repayAmount1e18, r.decimals);
    
    // DUST PROTECTION: If transferAmount rounds to 0, set to 1 wei minimum
    if (transferAmount == 0 && repayAmount1e18 > 0) {
        transferAmount = 1;
    }
    
    uint256 balBefore = IERC20(asset).balanceOf(address(this));
    IERC20(asset).safeTransferFrom(msg.sender, address(this), transferAmount);
    uint256 received = IERC20(asset).balanceOf(address(this)) - balBefore;
    uint256 received1e18 = _to1e18(received, r.decimals);
    
    // Cap repay amount to what was actually received
    if (received1e18 < repayAmount1e18) repayAmount1e18 = received1e18;
    
    // Update user debt position
    uint256 newDebt = currentDebt - repayAmount1e18;
    
    // DUST CLEANUP: Clear dust based on token decimals
    // For 18 decimals (DAI): 1000 wei = 0.000000000000001
    // For 6 decimals (USDC): 1000000000000 wei (1e12) = 0.000001 USDC
    uint256 dustThreshold;
    if (r.decimals >= 18) {
        dustThreshold = 1000; // ~0.000000000000001 for 18 decimals
    } else {
        // Scale threshold: 1e12 for 6 decimals, 1e15 for 3 decimals, etc.
        dustThreshold = 10 ** (18 - r.decimals); 
    }
    
    if (newDebt > 0 && newDebt < dustThreshold) {
        newDebt = 0;
    }
    
    u.borrow.principal = uint128(newDebt);
    u.borrow.index = r.variableBorrowIndex;
    
    // Update reserve
    r.reserveCash = uint128(uint256(r.reserveCash) + repayAmount1e18);
    
    // Safe subtraction for totalDebtPrincipal (prevent underflow)
    uint256 currentTotalDebt = uint256(r.totalDebtPrincipal);
    if (repayAmount1e18 >= currentTotalDebt) {
        r.totalDebtPrincipal = 0;
    } else {
        r.totalDebtPrincipal = uint128(currentTotalDebt - repayAmount1e18);
    }
    
    // Accrue lại để tính rates mới sau khi utilization thay đổi
    _accrue(asset);
    
    // Update reward accumulator with new borrow balance (legacy)
    _updateBorrowReward(onBehalfOf, asset, newDebt);
    
    // Force accumulate rewards after update
    _accumulateRewards(onBehalfOf);
    
    // Update AAVE-style reward distributor
    _updateUserReward(onBehalfOf, asset);
    
    emit Repaid(msg.sender, onBehalfOf, asset, repayAmount1e18);
    return repayAmount1e18;
}

function getAccountData(address user) external view returns (
    uint256 collateralValue1e18,
    uint256 debtValue1e18,
    uint256 healthFactor1e18
) {
    return _getAccountData(user);
}

/// @notice Convenience view that returns only Health Factor (1e18). If no debt → max uint
function calculateHealthFactor(address user) external view returns (uint256) {
    (, , uint256 hf) = _getAccountData(user);
    return hf;
}

/**
 * @notice Get current supply balance (with interest) for a user
 * @param user The address of the user
 * @param asset The asset address
 * @return Current supply balance including accrued interest (in 1e18)
 */
function getCurrentSupplyBalance(address user, address asset) external view returns (uint256) {
    return _currentSupply(user, asset);
}

/**
 * @notice Get current debt balance (with interest) for a user
 * @param user The address of the user
 * @param asset The asset address
 * @return Current debt balance including accrued interest (in 1e18)
 */
function getCurrentDebtBalance(address user, address asset) external view returns (uint256) {
    return _currentDebt(user, asset);
}

event Borrowed(address indexed user, address indexed asset, uint256 amount);
event Repaid(address indexed user, address indexed onBehalfOf, address indexed asset, uint256 amount);

address[] private _allAssets;

function initReserve(
    address asset,
    uint8 decimals,
    uint16 reserveFactorBps,
    uint16 ltvBps,
    uint16 liqThresholdBps,
    uint16 liqBonusBps,
    uint16 closeFactorBps,
    bool isBorrowable,
    uint16 optimalUBps,
    uint64 baseRateRayPerSec,
    uint64 slope1RayPerSec,
    uint64 slope2RayPerSec
) external onlyOwner {
    ReserveUserModels.ReserveData storage r = reserves[asset];

    require(r.lastUpdate == 0, "already init");
    r.reserveCash = 0;
    r.totalDebtPrincipal = 0;
    r.liquidityIndex = uint128(1e27);
    r.variableBorrowIndex = uint128(1e27);
    r.liquidityRateRayPerSec = baseRateRayPerSec; // tạm
    r.variableBorrowRateRayPerSec = baseRateRayPerSec; // tạm
    r.reserveFactorBps = reserveFactorBps;
    r.ltvBps = ltvBps;
    r.liqThresholdBps = liqThresholdBps;
    r.liqBonusBps = liqBonusBps;
    r.closeFactorBps = closeFactorBps;
    r.decimals = decimals;
    r.isBorrowable = isBorrowable;

    r.optimalUBps = optimalUBps;
    r.baseRateRayPerSec = baseRateRayPerSec;
    r.slope1RayPerSec = slope1RayPerSec;
    r.slope2RayPerSec = slope2RayPerSec;

    r.lastUpdate = uint40(block.timestamp);

    _allAssets.push(asset);
}

/// @notice Admin: toggle whether an asset is borrowable (post-init)
    /**
     * @notice Set governor address (only owner)
     */
    function setGovernor(address _governor) external onlyOwner {
        governor = _governor;
    }

    /**
     * @notice Modifier to allow owner or governor
     */
    modifier onlyOwnerOrGovernor() {
        require(msg.sender == owner || msg.sender == governor, "Not authorized");
        _;
    }

    /**
     * @notice Update LTV for an asset (only owner/governor)
     * @param asset The asset address
     * @param newLtvBps The new LTV in basis points (e.g., 8000 = 80%)
     */
    function updateLTV(address asset, uint16 newLtvBps) external onlyOwnerOrGovernor {
        require(newLtvBps <= 10000, "LTV cannot exceed 100%");
        ReserveUserModels.ReserveData storage r = reserves[asset];
        require(r.lastUpdate > 0, "Reserve not initialized");
        r.ltvBps = newLtvBps;
    }

    /**
     * @notice Update liquidation threshold for an asset (only owner/governor)
     * @param asset The asset address
     * @param newLiqThresholdBps The new liquidation threshold in basis points
     */
    function updateLiquidationThreshold(address asset, uint16 newLiqThresholdBps) external onlyOwnerOrGovernor {
        require(newLiqThresholdBps <= 10000, "Liquidation threshold cannot exceed 100%");
        ReserveUserModels.ReserveData storage r = reserves[asset];
        require(r.lastUpdate > 0, "Reserve not initialized");
        r.liqThresholdBps = newLiqThresholdBps;
    }

    function setReserveBorrowable(address asset, bool isBorrowable) external onlyOwner {
    _requireInited(asset);
    reserves[asset].isBorrowable = isBorrowable;
    emit ReserveBorrowableSet(asset, isBorrowable);
}


    modifier onlyOwner() { require(msg.sender == owner, "OWN"); _; }

    /**
     * @notice Transfer ownership to a new address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /**
     * @notice Enable/Disable an asset as collateral
     * @param asset The address of the asset
     * @param useAsCollateral true to enable, false to disable
     * 
     * Requirements:
     * - User must have supply balance > 0
     * - If disabling, health factor must remain > 1 after removal
     */
    function setUserUseReserveAsCollateral(address asset, bool useAsCollateral) external nonReentrant {
        _requireInited(asset);
        _accrue(asset);
        
        ReserveUserModels.ReserveData storage r = reserves[asset];
        ReserveUserModels.UserReserveData storage u = userReserves[msg.sender][asset];
        
        // Must have supply to enable/disable collateral
        uint256 supply = _currentSupply(msg.sender, asset);
        require(supply > 0, "No supply balance");
        
        // If already in desired state, do nothing
        if (u.useAsCollateral == useAsCollateral) {
            return;
        }
        
        // If enabling collateral
        if (useAsCollateral) {
            require(r.ltvBps > 0, "Asset cannot be used as collateral");
            u.useAsCollateral = true;
            emit CollateralEnabled(msg.sender, asset);
        } 
        // If disabling collateral
        else {
            // Check health factor after disabling
            (uint256 collateralBefore, uint256 debt, ) = _getAccountData(msg.sender);
            
            // Calculate collateral without this asset
            uint256 price = oracle.getAssetPrice1e18(asset);
            uint256 supplyValueUSD = (supply * price) / 1e18;
            uint256 weightedCollateral = (supplyValueUSD * uint256(r.ltvBps)) / 10000;
            uint256 collateralAfter = collateralBefore - weightedCollateral;
            
            // If user has debt, ensure health factor remains > 1
            if (debt > 0) {
                require(collateralAfter >= debt, "Health factor would be < 1");
            }
            
            u.useAsCollateral = false;
            emit CollateralDisabled(msg.sender, asset);
        }
    }

    event CollateralEnabled(address indexed user, address indexed asset);
    event CollateralDisabled(address indexed user, address indexed asset);
event ReserveBorrowableSet(address indexed asset, bool isBorrowable);

    event Liquidated(
  address indexed liquidator,
  address indexed user,
  address indexed debtAsset,
  address collateralAsset,
  uint256 repayAmount1e18,
  uint256 collateralSeized1e18
);


function liquidationCall(
    address debtAsset,
    address collateralAsset,
    address user,
    uint256 repayRequested // in debtAsset's native decimals
) external nonReentrant whenNotPaused {
    // 0) Accrue cả hai asset để số liệu mới nhất
    _requireInited(debtAsset);
    _requireInited(collateralAsset);
    _accrue(debtAsset);
    _accrue(collateralAsset);

    ReserveUserModels.ReserveData storage d = reserves[debtAsset];
    ReserveUserModels.ReserveData storage c = reserves[collateralAsset];

    // 1) Chỉ cho phép khi HF(user) < 1
    (, , uint256 hf) = _getAccountData(user);
    require(hf < 1e18, "HF>=1");

    // 2) Debt hiện tại của user theo debtAsset
    uint256 debtNow = _currentDebt(user, debtAsset); // 1e18
    require(debtNow > 0, "no debt");

    // 3) closeFactor clamp
    uint256 maxRepay = (uint256(d.closeFactorBps) * debtNow) / 10000; // 1e18
    uint256 repayReq1e18 = _to1e18(repayRequested, d.decimals);
    uint256 repay1e18 = repayReq1e18 > maxRepay ? maxRepay : repayReq1e18;
    require(repay1e18 > 0, "zero repay");

    // 4) Liquidator chuyển debtAsset vào pool (FoT-aware)
    uint256 before = IERC20(debtAsset).balanceOf(address(this));
    IERC20(debtAsset).safeTransferFrom(msg.sender, address(this), _from1e18(repay1e18, d.decimals));
    uint256 received = IERC20(debtAsset).balanceOf(address(this)) - before;
    uint256 received1e18 = _to1e18(received, d.decimals);
    if (received1e18 < repay1e18) { repay1e18 = received1e18; } // clamp theo thực nhận

    // 5) USD quy đổi & tính lượng collateral bị tịch thu
    uint256 priceDebt = oracle.getAssetPrice1e18(debtAsset);       // 1e18
    uint256 priceColl = oracle.getAssetPrice1e18(collateralAsset); // 1e18
    uint256 repayUsd1e18 = (repay1e18 * priceDebt) / 1e18;

    uint256 bonusBps = c.liqBonusBps; // thưởng theo collateralAsset
    uint256 seizeUsd1e18 = (repayUsd1e18 * (10000 + bonusBps)) / 10000;

    // tokens collateral cần tịch thu (1e18)
    uint256 seizeColl1e18 = (seizeUsd1e18 * 1e18) / priceColl;

    // 6) Kiểm tra user có đủ collateral
    uint256 userCollNow = _currentSupply(user, collateralAsset); // 1e18
    require(userCollNow >= seizeColl1e18, "insufficient collateral");

    // 7) Cập nhật vị thế user: reduce debt & collateral
    ReserveUserModels.UserReserveData storage ud = userReserves[user][debtAsset];
    ReserveUserModels.UserReserveData storage uc = userReserves[user][collateralAsset];

    // debt giảm
    uint256 dNew = debtNow - repay1e18;
    ud.borrow.principal = uint128(dNew);
    ud.borrow.index = d.variableBorrowIndex;

    // collateral giảm
    uint256 cNew = userCollNow - seizeColl1e18;
    uc.supply.principal = uint128(cNew);
    uc.supply.index = c.liquidityIndex;

    // 8) Sổ cái
    d.totalDebtPrincipal = uint128(uint256(d.totalDebtPrincipal) - repay1e18);
    d.reserveCash = uint128(uint256(d.reserveCash) + repay1e18);

    // collateral: chuyển ra cho liquidator
    require(c.reserveCash >= seizeColl1e18, "pool coll cash low"); // thường collateral đang nằm ở pool
    c.reserveCash = uint128(uint256(c.reserveCash) - seizeColl1e18);

    IERC20(collateralAsset).safeTransfer(
        msg.sender,
        _from1e18(seizeColl1e18, c.decimals)
    );

    emit Liquidated(
        msg.sender, user, debtAsset, collateralAsset, repay1e18, seizeColl1e18
    );

    // (optional) bạn có thể re-check HF(user) sau khi thanh lý để đảm bảo >1
}

// Function to set asset as collateral
function setAsCollateral(address asset, bool useAsCollateral) external {
    _requireInited(asset);
    
    ReserveUserModels.UserReserveData storage u = userReserves[msg.sender][asset];
    u.useAsCollateral = useAsCollateral;
    
    emit CollateralSet(msg.sender, asset, useAsCollateral);
}

// Event for collateral setting
event CollateralSet(address indexed user, address indexed asset, bool useAsCollateral);

    // ========== COLLATERAL MANAGEMENT FUNCTIONS ==========
    
    /**
     * @notice Get list of assets that user is using as collateral
     * @param user The address of the user
     * @return Array of asset addresses used as collateral
     */
    function getUserCollateral(address user) external view returns (address[] memory) {
        uint256 collateralCount = 0;
        
        // Count how many assets are used as collateral
        for (uint256 i = 0; i < _allAssets.length; i++) {
            ReserveUserModels.UserReserveData storage u = userReserves[user][_allAssets[i]];
            if (u.useAsCollateral && u.supply.principal > 0) {
                collateralCount++;
            }
        }
        
        // Build array
        address[] memory collateralList = new address[](collateralCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < _allAssets.length; i++) {
            ReserveUserModels.UserReserveData storage u = userReserves[user][_allAssets[i]];
            if (u.useAsCollateral && u.supply.principal > 0) {
                collateralList[index] = _allAssets[i];
                index++;
            }
        }
        
        return collateralList;
    }
    
    /**
     * @notice Check if an asset can be used as collateral
     * @param asset The address of the asset
     * @return true if asset can be used as collateral (LTV > 0)
     */
    function canUseAsCollateral(address asset) external view returns (bool) {
        ReserveUserModels.ReserveData storage r = reserves[asset];
        return r.ltvBps > 0;
    }
    
    /**
     * @notice Get maximum amount user can borrow for a specific asset
     * @param user The address of the user
     * @param asset The asset to borrow
     * @return Maximum borrowable amount in 1e18 format
     */
    function getMaxBorrowable(address user, address asset) external view returns (uint256) {
        uint256 totalCollateral = 0;
        uint256 totalDebt = 0;
        
        // Sum all collateral with LTV
        for (uint256 i = 0; i < _allAssets.length; i++) {
            address assetAddr = _allAssets[i];
            ReserveUserModels.ReserveData storage rData = reserves[assetAddr];
            ReserveUserModels.UserReserveData storage uData = userReserves[user][assetAddr];
            
            if (uData.useAsCollateral && uData.supply.principal > 0) {
                uint256 supply = _currentSupply(user, assetAddr);
                uint256 price = oracle.getAssetPrice1e18(assetAddr);
                uint256 collateralValue = (supply * price * rData.ltvBps) / (1e18 * 10000);
                totalCollateral += collateralValue;
            }
        }
        
        // Sum all debt
        for (uint256 i = 0; i < _allAssets.length; i++) {
            address assetAddr = _allAssets[i];
            ReserveUserModels.UserReserveData storage uData = userReserves[user][assetAddr];
            
            if (uData.borrow.principal > 0) {
                uint256 userDebt = _currentDebt(user, assetAddr);
                uint256 price = oracle.getAssetPrice1e18(assetAddr);
                totalDebt += (userDebt * price) / 1e18;
            }
        }
        
        // If no collateral, cannot borrow
        if (totalCollateral <= totalDebt) {
            return 0;
        }
        
        // Calculate available to borrow
        uint256 availableCollateral = totalCollateral - totalDebt;
        
        // Get price of asset to borrow
        uint256 borrowAssetPrice = oracle.getAssetPrice1e18(asset);
        if (borrowAssetPrice == 0) return 0;
        
        // Check if asset is borrowable
        ReserveUserModels.ReserveData storage borrowAssetData = reserves[asset];
        if (!borrowAssetData.isBorrowable) return 0;
        
        // Calculate max borrow amount
        // Formula: availableCollateral (already in USD) / borrowAssetPrice (in 1e18)
        // We already have availableCollateral in USD, so we just convert to token amount
        // availableCollateral is the amount of USD collateral available to borrow
        // We don't apply LTV again because the collateral is already weighted by collateral's LTV
        
        uint256 maxBorrowAmount = (availableCollateral * 1e18) / borrowAssetPrice;
        
        return maxBorrowAmount;
    }
    
    /**
     * @notice Get debt utilization ratio
     * @param user The address of the user
     * @return Utilization ratio in bps (0-10000)
     */
    function getDebtUtilization(address user) external view returns (uint256) {
        uint256 totalCollateral = 0;
        uint256 totalDebt = 0;
        
        // Calculate total collateral
        for (uint256 i = 0; i < _allAssets.length; i++) {
            address assetAddr = _allAssets[i];
            ReserveUserModels.ReserveData storage rData = reserves[assetAddr];
            ReserveUserModels.UserReserveData storage uData = userReserves[user][assetAddr];
            
            if (uData.useAsCollateral && uData.supply.principal > 0) {
                uint256 supply = _currentSupply(user, assetAddr);
                uint256 price = oracle.getAssetPrice1e18(assetAddr);
                uint256 collateralValue = (supply * price * rData.ltvBps) / (1e18 * 10000);
                totalCollateral += collateralValue;
            }
        }
        
        // Calculate total debt
        for (uint256 i = 0; i < _allAssets.length; i++) {
            address assetAddr = _allAssets[i];
            ReserveUserModels.UserReserveData storage uData = userReserves[user][assetAddr];
            
            if (uData.borrow.principal > 0) {
                uint256 userDebt = _currentDebt(user, assetAddr);
                uint256 price = oracle.getAssetPrice1e18(assetAddr);
                totalDebt += (userDebt * price) / 1e18;
            }
        }
        
        if (totalCollateral == 0) return 10000; // 100% utilized if no collateral
        
        // Return utilization in bps
        return (totalDebt * 10000) / totalCollateral;
    }
    
    /**
     * @notice Enable or disable multiple assets as collateral in one transaction
     * @param assets Array of asset addresses
     * @param useAsCollaterals Array of flags (true to enable, false to disable)
     */
    function setUserCollaterals(address[] memory assets, bool[] memory useAsCollaterals) external nonReentrant {
        require(assets.length == useAsCollaterals.length, "Array length mismatch");
        
        for (uint256 i = 0; i < assets.length; i++) {
            // Call internal function directly to avoid double nonReentrant modifier
            address asset = assets[i];
            bool useAsCollateral = useAsCollaterals[i];
            
            _requireInited(asset);
            _accrue(asset);
            
            ReserveUserModels.ReserveData storage r = reserves[asset];
            ReserveUserModels.UserReserveData storage u = userReserves[msg.sender][asset];
            
            // Must have supply to enable/disable collateral
            uint256 supply = _currentSupply(msg.sender, asset);
            require(supply > 0, "No supply balance");
            
            // If already in desired state, skip
            if (u.useAsCollateral == useAsCollateral) {
                continue;
            }
            
            // If enabling collateral
            if (useAsCollateral) {
                require(r.ltvBps > 0, "Asset cannot be used as collateral");
                u.useAsCollateral = true;
                emit CollateralEnabled(msg.sender, asset);
            } 
            // If disabling collateral
            else {
                // Check health factor after disabling
                (uint256 collateralBefore, uint256 debt, ) = _getAccountData(msg.sender);
                
                // Calculate collateral without this asset
                uint256 price = oracle.getAssetPrice1e18(asset);
                uint256 supplyValueUSD = (supply * price) / 1e18;
                uint256 weightedCollateral = (supplyValueUSD * uint256(r.ltvBps)) / 10000;
                uint256 collateralAfter = collateralBefore - weightedCollateral;
                
                // If user has debt, ensure health factor remains > 1
                if (debt > 0) {
                    require(collateralAfter >= debt, "Health factor would be < 1");
                }
                
                u.useAsCollateral = false;
                emit CollateralDisabled(msg.sender, asset);
            }
        }
    }
    
    /**
     * @notice Get liquidation risk for a specific asset
     * @param user The address of the user
     * @param asset The asset to check
     * @return Risk in bps (0-10000), where 10000 = at liquidation threshold
     */
    function getLiquidationRisk(address user, address asset) external view returns (uint256) {
        (uint256 totalColl, uint256 totalDebt, uint256 hf) = _getAccountData(user);
        
        if (totalDebt == 0 || hf == type(uint256).max) return 0;
        
        ReserveUserModels.ReserveData storage r = reserves[asset];
        ReserveUserModels.UserReserveData storage u = userReserves[user][asset];
        
        if (!u.useAsCollateral) return 0;
        
        uint256 supply = _currentSupply(user, asset);
        uint256 price = oracle.getAssetPrice1e18(asset);
        uint256 assetCollValue = (supply * price * r.ltvBps) / (1e18 * 10000);
        
        // Calculate collateral without this asset
        uint256 collateralWithoutAsset = totalColl - assetCollValue;
        
        // Calculate new HF if remove this asset
        uint256 newHF = (collateralWithoutAsset * 1e18) / totalDebt;
        
        // Risk = how close to liquidation threshold (1.0)
        if (newHF >= 1e18) return 0;
        
        // Return risk in bps (0-10000)
        return ((1e18 - newHF) * 10000) / 1e18;
    }

}
