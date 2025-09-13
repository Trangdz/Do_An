// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./InterestRateModel.sol";
import "./PriceOracle.sol";
import "../models/ReserveUserModels.sol";

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

    mapping(address => ReserveData) public reserves;

    InterestRateModel public immutable interestRateModel;
    PriceOracle public immutable oracle;

    constructor(address irm, address _oracle) {
        interestRateModel = InterestRateModel(irm);
        oracle = PriceOracle(_oracle);
    }

    /// @notice Cập nhật index & rates cho asset
    function _accrue(address asset) internal {
        ReserveData storage r = reserves[asset];

        uint40 prevUpdate = r.lastUpdate;
        if (prevUpdate == 0) {
            // init
            r.liquidityIndex = uint128(1e27);
            r.variableBorrowIndex = uint128(1e27);
            r.lastUpdate = uint40(block.timestamp);
            return;
        }

        uint256 dt = block.timestamp - prevUpdate;
        if (dt == 0) return;

        // Update index theo công thức: index(t+Δt) = index(t) * (1 + rate*Δt)
        // rate: ray/second, dt: seconds
        uint256 liqIndex = uint256(r.liquidityIndex);
        uint256 borrowIndex = uint256(r.variableBorrowIndex);

        liqIndex = liqIndex.rayMul(1e27 + uint256(r.liquidityRateRayPerSec) * dt);
        borrowIndex = borrowIndex.rayMul(1e27 + uint256(r.variableBorrowRateRayPerSec) * dt);

        r.liquidityIndex = uint128(liqIndex);
        r.variableBorrowIndex = uint128(borrowIndex);

        // Gọi IRM để lấy rate mới
        (uint64 borrowRate, uint64 supplyRate) = interestRateModel.getRates(
            r.reserveCash,
            r.totalDebt,
            r.reserveFactorBps,
            r.optimalUBps,
            r.baseRateRayPerSec,
            r.slope1RayPerSec,
            r.slope2RayPerSec
        );
        r.variableBorrowRateRayPerSec = borrowRate;
        r.liquidityRateRayPerSec = supplyRate;

        r.lastUpdate = uint40(block.timestamp);

        // Tính U để emit event
        uint256 U = (r.totalDebt == 0) ? 0 : (uint256(r.totalDebt) * 1e18) / (uint256(r.reserveCash) + uint256(r.totalDebt));

        emit ReserveDataUpdated(
            asset,
            U,
            supplyRate,
            borrowRate,
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
}
