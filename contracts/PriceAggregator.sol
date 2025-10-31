// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PriceAggregator
 * @notice Aggregator tuân chuẩn AggregatorV3Interface cho môi trường local/demo.
 *         Chainlink node (được cấp quyền) sẽ push giá qua updateAnswer().
 * @dev Không dùng cho production. Với production, sử dụng Chainlink Data Feeds chính thức.
 */
contract PriceAggregator is AggregatorV3Interface, Ownable {
    // ---- Metadata ----
    uint8 private immutable _decimals;
    string private _description;
    uint256 private constant _version = 1;

    // ---- Access control ----
    mapping(address => bool) public isWriter; // địa chỉ node được phép cập nhật

    // ---- Round storage ----
    struct Round {
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
        bool exists;
    }

    mapping(uint80 => Round) private rounds;
    uint80 private latestRoundId;

    // ---- Errors & events ----
    error NoData(uint80 roundId);
    event WriterUpdated(address indexed writer, bool allowed);
    event AnswerUpdated(int256 indexed current, uint80 indexed roundId, uint256 updatedAt);

    constructor(uint8 decimals_, string memory description_) Ownable(msg.sender) {
        _decimals = decimals_;
        _description = description_;
    }

    // ---- Owner functions ----
    function setWriter(address writer, bool allowed) external onlyOwner {
        isWriter[writer] = allowed;
        emit WriterUpdated(writer, allowed);
    }

    // ---- Writer function ----
    function updateAnswer(int256 answer) external returns (uint80 roundId) {
        if (!isWriter[msg.sender] && msg.sender != owner()) revert("Not authorized");
        roundId = latestRoundId + 1;
        latestRoundId = roundId;
        rounds[roundId] = Round({
            answer: answer,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: roundId,
            exists: true
        });
        emit AnswerUpdated(answer, roundId, block.timestamp);
    }

    // ---- AggregatorV3Interface ----
    function decimals() external view override returns (uint8) { return _decimals; }
    function description() external view override returns (string memory) { return _description; }
    function version() external pure override returns (uint256) { return _version; }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        roundId = latestRoundId;
        Round memory r = rounds[roundId];
        if (!r.exists) revert NoData(roundId);
        return (roundId, r.answer, r.startedAt, r.updatedAt, r.answeredInRound);
    }

    function getRoundData(uint80 _roundId)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        Round memory r = rounds[_roundId];
        if (!r.exists) revert NoData(_roundId);
        return (_roundId, r.answer, r.startedAt, r.updatedAt, r.answeredInRound);
    }
}

