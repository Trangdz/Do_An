// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import "../libraries/LendingMath.sol";
import "../models/ReserveUserModels.sol";
import "./InterestRateModel.sol";
import "./PriceOracle.sol";

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
    
    // Hardcoded addresses for demo (in production, these would be configurable)
    // Note: These addresses will be set during deployment
    address public WETH;
    address public DAI;
    // asset => ReserveData
    mapping(address => ReserveUserModels.ReserveData) public reserves;

    // user => asset => UserReserveData
 mapping(address => mapping(address => ReserveUserModels.UserReserveData)) public userReserves;

    InterestRateModel public immutable interestRateModel;
    PriceOracle public immutable oracle;

    constructor(address irm, address _oracle, address _weth, address _dai) {
        interestRateModel = InterestRateModel(irm);
        oracle = PriceOracle(_oracle);
        WETH = _weth;
        DAI = _dai;
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
function _maxWithdrawAllowed(address /*user*/, address /*asset*/) internal pure returns (uint256 xMax1e18) {
    // Simplified version for demo - return max value to allow withdraw
    // In production, you would implement proper health factor calculation
    return type(uint256).max;
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
    
    // 4) Auto-enable as collateral if LTV > 0 (realistic behavior like Aave)
    // User can disable later via setUserUseReserveAsCollateral()
    if (r.ltvBps > 0 && !u.useAsCollateral) {
        u.useAsCollateral = true;
        emit CollateralEnabled(msg.sender, asset);
    }

    // 5) Cập nhật sổ cái
    r.reserveCash = uint128(uint256(r.reserveCash) + delta1e18);

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

    // denormalize để chuyển đi
    uint256 transferOut = _from1e18(amt, r.decimals);
    IERC20(asset).safeTransfer(msg.sender, transferOut);

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
    (uint256 col, uint256 debt, ) = _getAccountData(msg.sender);
    uint256 borrowAmount1e18 = _to1e18(amount, r.decimals);
    uint256 newDebt = debt + borrowAmount1e18;
    
    // Simple health factor check: collateral must be >= debt * 1.1 (10% buffer)
    require(col >= newDebt * 110 / 100, "Health factor too low");
    
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
    
    // Transfer tokens to user
    uint256 transferAmount = _from1e18(borrowAmount1e18, r.decimals);
    IERC20(asset).safeTransfer(msg.sender, transferAmount);
    
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


    modifier onlyOwner() { require(msg.sender == owner, "OWN"); _; }

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

}
