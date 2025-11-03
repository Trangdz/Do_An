// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MultiPriceAggregator {
    address public writer;
    
    struct PriceData {
        int256 price;        // Price in USD with 8 decimals
        uint80 roundId;      // Round ID
        uint256 updatedAt;   // Timestamp
    }
    
    mapping(string => PriceData) public prices; // symbol => PriceData
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
}

