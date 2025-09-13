// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPriceOracle {
    /// @notice trả giá token theo USD, chuẩn 1e18 (WAD); revert nếu giá = 0 hoặc stale (nếu kiểm)
    function getAssetPrice1e18(address token) external view returns (uint256);
}
