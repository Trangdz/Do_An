// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

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

contract LendingPool {
    using RayMath for uint256;
    using SafeERC20 for IERC20;
    // asset => ReserveData
    mapping(address => ReserveUserModels.ReserveData) public reserves;

    // user => asset => UserReserveData
 mapping(address => mapping(address => ReserveUserModels.UserReserveData)) public userReserves;

    InterestRateModel public immutable interestRateModel;
    PriceOracle public immutable oracle;

    constructor(address irm, address _oracle) {
        interestRateModel = InterestRateModel(irm);
        oracle = PriceOracle(_oracle);
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
    // Duyệt toàn bộ assets đã bật collateral
    // (Trong demo: đơn giản duyệt theo mảng ngoài; ở đây giả sử bạn có danh sách assets[] bên ngoài
    // Nếu chưa có, bạn có thể làm mapping + mảng assets đã init để iterate)
    address[] memory assets = _allAssets; // TODO: bạn quản lý mảng này khi init asset
    uint256 col; uint256 debt;

    for (uint256 i=0; i<assets.length; i++) {
        address a = assets[i];
        ReserveUserModels.ReserveData storage r = reserves[a];
        ReserveUserModels.UserReserveData storage u = userReserves[user][a];

        if (r.lastUpdate == 0) continue;

        // supply/debt hiện tại theo index
        uint256 sNow = 0;
        if (u.useAsCollateral) {
            sNow = _currentSupply(user, a);
            if (sNow > 0) {
                uint256 px = oracle.getAssetPrice1e18(a);
                col += sNow * px / 1e18 * r.liqThresholdBps / 10000;
            }
        }
        uint256 dNow = _currentDebt(user, a);
        if (dNow > 0) {
            uint256 px = oracle.getAssetPrice1e18(a);
            debt += dNow * px / 1e18;
        }
    }

    collateralValue1e18 = col;
    debtValue1e18 = debt;
    healthFactor1e18 = (debt == 0) ? type(uint256).max : (col * 1e18) / debt;
}

// x_max theo công thức bạn chốt: tối đa rút được của 1 asset khi vẫn HF_after>=1
function _maxWithdrawAllowed(address user, address asset) internal view returns (uint256 xMax1e18) {
    // (CollateralValue - DebtValue) * 10000 / (Price(asset) * liqThreshold(asset))
    (uint256 col, uint256 debt, ) = _getAccountData(user);
    if (col <= debt) return 0;
    uint256 r = (col - debt) * 10000;

    uint256 px = oracle.getAssetPrice1e18(asset); // 1e18
    ReserveUserModels.ReserveData storage cfg = reserves[asset];
    uint256 denom = px * cfg.liqThresholdBps; // 1e18 * bps

    // xMax(USD)/ (px*threshold) -> ra số lượng token 1e18
    xMax1e18 = (r * 1e18) / denom;
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

    // 4) Cập nhật sổ cái
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


address[] private _allAssets;
address public owner = msg.sender;
modifier onlyOwner() { require(msg.sender == owner, "OWN"); _; }

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
    r.totalDebt = 0;
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

}
