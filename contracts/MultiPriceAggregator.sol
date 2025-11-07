// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IPriceOracle.sol";

/// @title MultiPriceAggregator
/// @notice Aggregates prices from Chainlink and implements IPriceOracle for LendingPool
contract MultiPriceAggregator is IPriceOracle {
    address public writer;
    
    struct PriceData {
        int256 price;        // Price in USD with 8 decimals
        uint80 roundId;      // Round ID
        uint256 updatedAt;   // Timestamp
    }
    
    mapping(string => PriceData) public prices; // symbol => PriceData
    mapping(address => string) public tokenSymbols; // token address => symbol
    string[] public symbols; // List of all tracked symbols
    
    modifier onlyWriter() {
        require(msg.sender == writer, "Not authorized");
        _;
    }
    
    event PriceUpdated(string indexed symbol, int256 price, uint80 roundId);
    
    function setWriter(address _writer, bool auth) external {
        if (auth) writer = _writer;
        else writer = address(0);
    }
    
    function updatePrice(string memory symbol, int256 price) external onlyWriter {
        PriceData storage priceData = prices[symbol];
        
        // If symbol doesn't exist, add it to the list
        if (priceData.roundId == 0 && bytes(symbol).length > 0) {
            symbols.push(symbol);
        }
        
        priceData.price = price;
        priceData.roundId++;
        priceData.updatedAt = block.timestamp;
        
        emit PriceUpdated(symbol, price, priceData.roundId);
    }
    
    function getPrice(string memory symbol) external view returns (
        int256 price,
        uint80 roundId,
        uint256 updatedAt
    ) {
        PriceData memory priceData = prices[symbol];
        return (priceData.price, priceData.roundId, priceData.updatedAt);
    }
    
    function getPriceInUSD(string memory symbol) external view returns (int256) {
        return prices[symbol].price;
    }
    
    function getAllSymbols() external view returns (string[] memory) {
        return symbols;
    }
    
    function getSymbolCount() external view returns (uint256) {
        return symbols.length;
    }
    
    // ========================================
    // IPriceOracle Implementation
    // ========================================
    
    /// @notice Set token symbol mapping (address → symbol)
    /// @param token Token address
    /// @param symbol Token symbol (e.g., "WETH", "DAI", "USDC", "LINK")
    function setTokenSymbol(address token, string memory symbol) external {
        // Only allow setting if symbol doesn't exist or is empty
        // In production, you might want to add access control
        bytes memory existingSymbol = bytes(tokenSymbols[token]);
        require(existingSymbol.length == 0, "MultiPriceAggregator: symbol already set");
        require(bytes(symbol).length > 0, "MultiPriceAggregator: symbol cannot be empty");
        
        tokenSymbols[token] = symbol;
    }
    
    /// @notice Get asset price in 1e18 precision (IPriceOracle interface)
    /// @param token Token address
    /// @return price Price in 1e18 precision (e.g., 1e18 = $1.00)
    function getAssetPrice1e18(address token) external view override returns (uint256) {
        string memory symbol = tokenSymbols[token];
        require(bytes(symbol).length > 0, "MultiPriceAggregator: token symbol not set");
        
        PriceData memory priceData = prices[symbol];
        require(priceData.price > 0, "MultiPriceAggregator: price not available");
        require(priceData.updatedAt > 0, "MultiPriceAggregator: price never updated");
        
        // Convert from 8 decimals to 18 decimals
        // price8dec = 100000000 (8 decimals) = $1.00
        // price18dec = 100000000 * 1e10 = 1000000000000000000 (18 decimals) = $1.00
        return uint256(priceData.price) * 1e10;
    }
    
    /// @notice Batch set token symbols
    /// @param tokens Array of token addresses
    /// @param symbols Array of token symbols
    function setTokenSymbols(address[] calldata tokens, string[] calldata symbols) external {
        require(tokens.length == symbols.length, "MultiPriceAggregator: arrays length mismatch");
        
        for (uint256 i = 0; i < tokens.length; i++) {
            if (bytes(tokenSymbols[tokens[i]]).length == 0) {
                tokenSymbols[tokens[i]] = symbols[i];
            }
        }
    }
}

