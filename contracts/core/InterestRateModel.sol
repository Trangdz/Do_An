// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Mô hình lãi 2-slope theo utilization U.
/// Input/Output:
/// - cash, debtNow: đã normalize 1e18 (WAD)
/// - reserveFactorBps: 0..10000
/// - optimalUBps: 0..10000 (U*), ví dụ 8000 = 80%
/// - base/slope1/slope2: nhập vào đơn vị RAY/second
/// Trả về:
/// - borrowRateRayPerSec, supplyRateRayPerSec (đều RAY/second)
library InterestRateMath {
    uint256 internal constant WAD = 1e18;
    uint256 internal constant RAY = 1e27;

    function _utilization(uint256 cash, uint256 debtNow) internal pure returns (uint256 uWad) {
        if (debtNow == 0) return 0;
        uint256 denom = cash + debtNow;
        if (denom == 0) return 0;
        uWad = (debtNow * WAD) / denom; // 0..1e18
    }
}

contract InterestRateModel {
    using InterestRateMath for uint256;

    function getRates(
        uint256 cash,
        uint256 debtNow,
        uint16 reserveFactorBps,
        uint16 optimalUBps,
        uint64 baseRateRayPerSec,
        uint64 slope1RayPerSec,
        uint64 slope2RayPerSec
    ) external pure returns (uint64 borrowRateRayPerSec, uint64 supplyRateRayPerSec) {
        // U in WAD
        uint256 U = InterestRateMath._utilization(cash, debtNow); // 0..1e18

        // Convert bps to WAD fraction
        uint256 Ustar = (uint256(optimalUBps) * 1e14); // 10000 bps -> 1e18 (since 10000*1e14=1e18)
        // Base & slopes as uint256 for calc
        uint256 base = uint256(baseRateRayPerSec);
        uint256 s1   = uint256(slope1RayPerSec);
        uint256 s2   = uint256(slope2RayPerSec);

        uint256 borrow;
        if (U <= Ustar) {
            // rb = base + s1 * (U / U*)
            // U/U* is WAD
            uint256 ratioWAD = Ustar == 0 ? 0 : (U * 1e18) / Ustar;
            borrow = base + (s1 * ratioWAD) / 1e18;
        } else {
            // rb = base + s1 + s2 * ((U - U*) / (1 - U*))
            // ((U-U*)/(1-U*)) in WAD
            uint256 numer = U - Ustar;
            uint256 denom = (1e18 - Ustar);
            uint256 ratioWAD = denom == 0 ? 0 : (numer * 1e18) / denom;
            borrow = base + s1 + (s2 * ratioWAD) / 1e18;
        }

        // supply ≈ borrow * U * (1 - reserveFactor)
        // U in WAD; (1 - RF) in WAD
        uint256 oneMinusRF = (uint256(10000 - reserveFactorBps) * 1e14); // 10000 bps -> 1e18
        uint256 supply = (borrow * U) / 1e18;
        supply = (supply * oneMinusRF) / 1e18;

        // Downcast to uint64 (an toàn nếu APR hợp lý). Nếu bạn sợ overflow, dùng require để bound.
        borrowRateRayPerSec = uint64(borrow);
        supplyRateRayPerSec = uint64(supply);
    }
}
