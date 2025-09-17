// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IInterestRateModel {
    /// @return borrowRateRayPerSec, supplyRateRayPerSec (đều RAY/second)
    function getRates(
        uint256 cash,
        uint256 debtNow,
        uint16 reserveFactorBps,
        uint16 optimalUBps,
        uint64 baseRateRayPerSec,
        uint64 slope1RayPerSec,
        uint64 slope2RayPerSec
    ) external pure returns (uint64, uint64);
}

// 1. Input (Đầu vào):
// cash: Tiền còn trống trong pool

// debtNow: Tiền đang được cho vay

// Các thông số khác: Như cài đặt lãi suất

// 2. Output (Đầu ra):
// borrowRate: Lãi suất cho vay (%/năm)

// supplyRate: Lãi suất gửi tiền (%/năm)
