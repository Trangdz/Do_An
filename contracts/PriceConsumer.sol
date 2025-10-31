// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PriceConsumer {
    uint256 private _price;

    event PriceUpdated(uint256 value);

    function setPrice(uint256 value) external {
        _price = value;
        emit PriceUpdated(value);
    }

    function getPrice() external view returns (uint256) {
        return _price;
    }
}


