// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IPriceOracle.sol";

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

/// @title ChainlinkPriceOracle
/// @notice Production-ready oracle using Chainlink Price Feeds
/// @dev Uses real Chainlink aggregators for mainnet, fallback to manual prices for testnet
contract ChainlinkPriceOracle is IPriceOracle {
    
    // Mapping: token address => Chainlink aggregator address
    mapping(address => address) public priceFeeds;
    
    // Fallback: manual prices for tokens without Chainlink feeds
    mapping(address => uint256) public manualPrices;
    
    // Staleness threshold: if price is older than this, revert (1 hour = 3600 seconds)
    uint256 public constant STALENESS_THRESHOLD = 3600;
    
    address public owner;
    
    event PriceFeedSet(address indexed token, address indexed priceFeed);
    event ManualPriceSet(address indexed token, uint256 price);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /// @notice Set Chainlink price feed for a token
    /// @param token Token address
    /// @param priceFeed Chainlink aggregator address
    function setPriceFeed(address token, address priceFeed) external onlyOwner {
        priceFeeds[token] = priceFeed;
        emit PriceFeedSet(token, priceFeed);
    }

    /// @notice Set manual price as fallback (for testnet or tokens without Chainlink)
    /// @param token Token address
    /// @param price Price in 1e18 precision
    function setManualPrice(address token, uint256 price) external onlyOwner {
        manualPrices[token] = price;
        emit ManualPriceSet(token, price);
    }   
    /// @notice Get asset price in 1e18 precision
    /// @param token Token address
    /// @return price Price in 1e18 (e.g., 1 ETH = 2000e18 means $2000)
    function getAssetPrice1e18(address token) external view override returns (uint256) {
        address feed = priceFeeds[token];
        
        // If Chainlink feed exists, use it
        if (feed != address(0)) {
            return _getChainlinkPrice(feed);
        }
        
        // Otherwise, use manual price
        uint256 price = manualPrices[token];
        require(price > 0, "ChainlinkOracle: price not set");
        return price;
    }
    
    /// @dev Get price from Chainlink aggregator
    function _getChainlinkPrice(address feed) internal view returns (uint256) {
        AggregatorV3Interface aggregator = AggregatorV3Interface(feed);
        
        // Get latest price data
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = aggregator.latestRoundData();
        
        // Validate data freshness
        require(answeredInRound >= roundId, "ChainlinkOracle: stale price");
        require(updatedAt > 0, "ChainlinkOracle: round not complete");
        require(block.timestamp - updatedAt < STALENESS_THRESHOLD, "ChainlinkOracle: price too old");
        require(answer > 0, "ChainlinkOracle: invalid price");
        
        // Convert to 1e18 precision
        uint8 decimals = aggregator.decimals();
        uint256 price = uint256(answer);
        
        if (decimals < 18) {
            // Scale up (e.g., Chainlink returns 8 decimals, we need 18)
            price = price * (10 ** (18 - decimals));
        } else if (decimals > 18) {
            // Scale down
            price = price / (10 ** (decimals - 18));
        }
        
        return price;
    }
    
    /// @notice Get the Chainlink feed address for a token
    function getPriceFeed(address token) external view returns (address) {
        return priceFeeds[token];
    }
}

