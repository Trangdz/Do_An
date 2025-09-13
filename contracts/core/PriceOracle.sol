// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IPriceOracle.sol";

/// @notice Oracle giá đơn giản, lưu giá cố định cho mỗi token
contract PriceOracle is IPriceOracle {
    mapping(address => uint256) private prices;

    event PriceUpdated(address indexed token, uint256 oldPrice, uint256 newPrice);

    function setAssetPrice(address token, uint256 price) external {
        uint256 oldPrice = prices[token];
        prices[token] = price;
        emit PriceUpdated(token, oldPrice, price);
    }

    function getAssetPrice1e18(address token) external view override returns (uint256) {
        uint256 price = prices[token];
        require(price > 0, "PriceOracle: price not set");
        return price;
    }
}
