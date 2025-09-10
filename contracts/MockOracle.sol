// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "./AggregatorV3Interface.sol";

/**
 * @title MockOracle
 * @dev Mock price oracle for testing purposes
 * @notice Provides mock price feeds for tokens in 1e8 format
 */
contract MockOracle is AggregatorV3Interface {
    uint8 public constant override decimals = 8;
    string public constant override description = "Mock Oracle";
    uint256 public constant override version = 1;

    struct RoundData {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }

    mapping(address => RoundData) public priceFeeds;
    mapping(address => bool) public isSupported;

    event PriceUpdated(address indexed token, int256 price);

    constructor() {
        // Initialize with default prices (1e8 format)
        _setPrice(0x0000000000000000000000000000000000000000, 2000e8); // ETH = $2000
        _setPrice(0x1111111111111111111111111111111111111111, 1e8);    // USDC = $1
        _setPrice(0x2222222222222222222222222222222222222222, 1e8);    // DAI = $1
        _setPrice(0x3333333333333333333333333333333333333333, 10e8);   // LINK = $10
    }

    function _setPrice(address token, int256 price) internal {
        priceFeeds[token] = RoundData({
            roundId: 1,
            answer: price,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: 1
        });
        isSupported[token] = true;
    }

    function setPrice(address token, int256 price) external {
        require(isSupported[token], "Token not supported");
        priceFeeds[token] = RoundData({
            roundId: priceFeeds[token].roundId + 1,
            answer: price,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: priceFeeds[token].roundId + 1
        });
        emit PriceUpdated(token, price);
    }

    function addToken(address token, int256 price) external {
        require(!isSupported[token], "Token already supported");
        _setPrice(token, price);
    }

    function getRoundData(address token) external view returns (RoundData memory) {
        require(isSupported[token], "Token not supported");
        return priceFeeds[token];
    }

    function latestRoundData(address token) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        require(isSupported[token], "Token not supported");
        RoundData memory data = priceFeeds[token];
        return (data.roundId, data.answer, data.startedAt, data.updatedAt, data.answeredInRound);
    }

    function getPrice(address token) external view returns (int256) {
        require(isSupported[token], "Token not supported");
        return priceFeeds[token].answer;
    }

    // Override functions for compatibility
    function latestRoundData() external pure override returns (
        uint80,
        int256,
        uint256,
        uint256,
        uint80
    ) {
        revert("Use latestRoundData(address)");
    }

    function getRoundData(uint80) external pure override returns (
        uint80,
        int256,
        uint256,
        uint256,
        uint80
    ) {
        revert("Use getRoundData(address)");
    }
}
