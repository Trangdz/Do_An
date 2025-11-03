// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface AggregatorV3Interface {
    function latestRoundData() external view returns (
        uint80, int256, uint256, uint256, uint80
    );
}

contract PriceAggregator is AggregatorV3Interface {
    address public writer;
    int256 private lastAnswer;
    uint80 private roundId;
    uint256 private updatedAt;

    modifier onlyWriter() {
        require(msg.sender == writer, "Not authorized");
        _;
    }

    function setWriter(address _writer, bool auth) external {
        if (auth) writer = _writer;
        else writer = address(0);
    }

    function updateAnswer(int256 answer) external onlyWriter {
        lastAnswer = answer;
        roundId++;
        updatedAt = block.timestamp;
    }

    function latestRoundData() public view override returns (
        uint80, int256, uint256, uint256, uint80
    ) {
        return (roundId, lastAnswer, updatedAt, updatedAt, roundId);
    }
}
