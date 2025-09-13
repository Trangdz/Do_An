// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockV3Aggregator {
    uint8 public immutable decimals;
    int256 private _answer;
    uint256 private _updatedAt;

    constructor(uint8 _decimals, int256 _initialAnswer) {
        decimals = _decimals;
        _answer = _initialAnswer;
        _updatedAt = block.timestamp;
    }

    function latestRoundData()
        external
        view
        returns (uint80, int256 answer, uint256, uint256 updatedAt, uint80)
    {
        return (0, _answer, 0, _updatedAt, 0);
    }

    function updateAnswer(int256 newAnswer) external {
        _answer = newAnswer;
        _updatedAt = block.timestamp;
    }
}
