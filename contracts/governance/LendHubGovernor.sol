// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "../tokens/LENDXToken.sol";
import "../core/LendingPool.sol";

/**
 * @title LendHubGovernor
 * @notice Simple governance contract for LendHub protocol
 * @dev Allows LENDX token holders to create proposals, vote, and execute changes
 */
contract LendHubGovernor is ReentrancyGuard, Ownable {
    LENDXToken public immutable lendxToken;
    LendingPool public lendingPool; // Can be set by owner
    
    // Proposal structure
    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string summary;
        string description;
        string motivation;
        string ipfsHash;
        uint256 votesFor;
        uint256 votesAgainst;
        ProposalState state;
        uint256 createdAt;
        uint256 votingEnd;
        uint256 executionTime;
        bool executed;
    }
    
    enum ProposalState {
        Created,    // Proposal created, waiting for voting
        Active,     // Voting period active
        Succeeded,  // Voting passed
        Defeated,   // Voting failed
        Executed,   // Proposal executed
        Canceled    // Proposal canceled
    }
    
    // Proposals mapping
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => bool)) public voteSupport; // true = for, false = against
    
    // Asset registry: symbol => address
    mapping(string => address) public assetAddresses;
    
    uint256 public proposalCount;
    uint256 public constant VOTING_PERIOD = 3 minutes; // 3 minutes for demo (was 7 days)
    uint256 public constant MIN_PROPOSAL_THRESHOLD = 10_000 * 1e18; // 10,000 LENDX required to create proposal
    uint256 public constant QUORUM = 1_000 * 1e18; // Minimum 1,000 LENDX votes required
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        uint256 createdAt
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );
    
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCanceled(uint256 indexed proposalId);
    
    constructor(address _lendxToken, address initialOwner) Ownable(initialOwner) {
        lendxToken = LENDXToken(_lendxToken);
    }

    /**
     * @notice Set LendingPool address (only owner)
     */
    function setLendingPool(address _lendingPool) external onlyOwner {
        lendingPool = LendingPool(_lendingPool);
    }
    
    /**
     * @notice Create a new governance proposal
     * @param title Proposal title
     * @param summary Proposal summary
     * @param description Full description
     * @param motivation Motivation for the proposal
     * @param ipfsHash IPFS hash for additional metadata
     * @return proposalId The ID of the created proposal
     */
    function createProposal(
        string memory title,
        string memory summary,
        string memory description,
        string memory motivation,
        string memory ipfsHash
    ) external returns (uint256) {
        // Check proposer has enough LENDX
        uint256 proposerBalance = lendxToken.balanceOf(msg.sender);
        require(
            proposerBalance >= MIN_PROPOSAL_THRESHOLD,
            "LendHubGovernor: insufficient LENDX balance to create proposal"
        );
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        
        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            title: title,
            summary: summary,
            description: description,
            motivation: motivation,
            ipfsHash: ipfsHash,
            votesFor: 0,
            votesAgainst: 0,
            state: ProposalState.Created,
            createdAt: block.timestamp,
            votingEnd: block.timestamp + VOTING_PERIOD,
            executionTime: 0,
            executed: false
        });
        
        // Auto-activate proposal
        proposals[proposalId].state = ProposalState.Active;
        
        emit ProposalCreated(proposalId, msg.sender, title, block.timestamp);
        
        return proposalId;
    }
    
    /**
     * @notice Cast a vote on a proposal
     * @param proposalId The ID of the proposal
     * @param support true = vote for, false = vote against
     */
    function castVote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(
            proposal.id != 0,
            "LendHubGovernor: proposal does not exist"
        );
        
        require(
            proposal.state == ProposalState.Active,
            "LendHubGovernor: proposal is not active"
        );
        
        require(
            block.timestamp <= proposal.votingEnd,
            "LendHubGovernor: voting period has ended"
        );
        
        require(
            !hasVoted[proposalId][msg.sender],
            "LendHubGovernor: already voted"
        );
        
        // Get voting power (LENDX balance)
        uint256 votingPower = lendxToken.balanceOf(msg.sender);
        require(votingPower > 0, "LendHubGovernor: no voting power");
        
        // Record vote
        hasVoted[proposalId][msg.sender] = true;
        voteSupport[proposalId][msg.sender] = support;
        
        if (support) {
            proposal.votesFor += votingPower;
        } else {
            proposal.votesAgainst += votingPower;
        }
        
        emit VoteCast(proposalId, msg.sender, support, votingPower);
        
        // Check if proposal should be updated
        _updateProposalState(proposalId);
    }
    
    /**
     * @notice Execute a successful proposal
     * @param proposalId The ID of the proposal to execute
     */
    function executeProposal(uint256 proposalId) external {
        // Ensure LendingPool is configured, otherwise revert instead of silently doing nothing
        require(
            address(lendingPool) != address(0),
            "LendHubGovernor: lendingPool not set"
        );

        Proposal storage proposal = proposals[proposalId];
        
        require(
            proposal.id != 0,
            "LendHubGovernor: proposal does not exist"
        );
        
        require(
            proposal.state == ProposalState.Succeeded,
            "LendHubGovernor: proposal not succeeded"
        );
        
        require(
            !proposal.executed,
            "LendHubGovernor: proposal already executed"
        );
        
        // Execute actual proposal actions based on description.
        // Nếu có lỗi (không tìm được asset, sai format tham số, reserve chưa init, v.v.)
        // thì transaction sẽ revert và proposal vẫn ở trạng thái chưa executed.
        _executeProposalActions(proposalId, proposal);

        // Chỉ đánh dấu executed sau khi thực thi hành động thành công
        proposal.executed = true;
        proposal.state = ProposalState.Executed;
        proposal.executionTime = block.timestamp;
        
        emit ProposalExecuted(proposalId);
    }

    /**
     * @notice Execute proposal actions based on description
     * @dev Parses description to extract parameters and calls appropriate LendingPool functions
     */
    function _executeProposalActions(uint256 proposalId, Proposal memory proposal) internal {
        string memory desc = proposal.description;
        address asset = _extractAsset(desc);
        bool handled = false;
        
        // 1. Change LTV
        if (_contains(desc, "Proposed LTV")) {
            uint16 newLTV = _extractProposedLTV(desc);
            require(asset != address(0), "LendHubGovernor: asset not found");
            // newLTV là bps, LendingPool sẽ validate range
            lendingPool.updateLTV(asset, newLTV);
            handled = true;
        }
        // 2. Change Liquidation Threshold
        else if (_contains(desc, "Proposed Threshold")) {
            uint16 newThreshold = _extractProposedLiquidationThreshold(desc);
            require(asset != address(0), "LendHubGovernor: asset not found");
            lendingPool.updateLiquidationThreshold(asset, newThreshold);
            handled = true;
        }
        // 3. Change Liquidation Bonus
        else if (_contains(desc, "Proposed Bonus")) {
            uint16 newBonus = _extractProposedLiquidationBonus(desc);
            require(asset != address(0), "LendHubGovernor: asset not found");
            lendingPool.updateLiquidationBonus(asset, newBonus);
            handled = true;
        }
        // 4. Change Reserve Factor
        else if (_contains(desc, "Proposed Reserve Factor")) {
            uint16 newFactor = _extractProposedReserveFactor(desc);
            require(asset != address(0), "LendHubGovernor: asset not found");
            lendingPool.updateReserveFactor(asset, newFactor);
            handled = true;
        }
        // 5. Change Supply Cap
        else if (_contains(desc, "Proposed Supply Cap")) {
            uint128 newCap = _extractProposedSupplyCap(desc);
            require(asset != address(0), "LendHubGovernor: asset not found");
            // newCap 1e18; 0 = unlimited vẫn hợp lệ
            lendingPool.updateSupplyCap(asset, newCap);
            handled = true;
        }
        // 6. Change Borrow Cap
        else if (_contains(desc, "Proposed Borrow Cap")) {
            uint128 newCap = _extractProposedBorrowCap(desc);
            require(asset != address(0), "LendHubGovernor: asset not found");
            // newCap 1e18; 0 = unlimited vẫn hợp lệ
            lendingPool.updateBorrowCap(asset, newCap);
            handled = true;
        }
        // 7. Change Interest Rate Model (slope1, slope2, Uopt)
        else if (_contains(desc, "Proposed Base Rate") || _contains(desc, "Proposed Slope") || _contains(desc, "Optimal Utilization")) {
            (uint64 baseRate, uint64 slope1, uint64 slope2, uint16 optimalU) = _extractProposedInterestRateParams(desc);
            require(asset != address(0), "LendHubGovernor: asset not found");
            require(
                baseRate > 0 || slope1 > 0 || slope2 > 0,
                "LendHubGovernor: no interest rate params found"
            );
            lendingPool.updateInterestRateModel(asset, baseRate, slope1, slope2, optimalU);
            handled = true;
        }
        // 8. Pause Asset
        else if (_contains(desc, "Pause Asset")) {
            require(asset != address(0), "LendHubGovernor: asset not found");
            lendingPool.pauseAsset(asset);
            handled = true;
        }
        // 9. Unpause Asset
        else if (_contains(desc, "Unpause Asset")) {
            require(asset != address(0), "LendHubGovernor: asset not found");
            lendingPool.unpauseAsset(asset);
            handled = true;
        }

        require(handled, "LendHubGovernor: unsupported or invalid proposal description");
    }

    /**
     * @notice Helper to check if string contains substring
     */
    function _contains(string memory str, string memory substr) internal pure returns (bool) {
        bytes memory strBytes = bytes(str);
        bytes memory substrBytes = bytes(substr);
        
        if (substrBytes.length > strBytes.length) return false;
        
        for (uint i = 0; i <= strBytes.length - substrBytes.length; i++) {
            bool isMatch = true;
            for (uint j = 0; j < substrBytes.length; j++) {
                if (strBytes[i + j] != substrBytes[j]) {
                    isMatch = false;
                    break;
                }
            }
            if (isMatch) return true;
        }
        return false;
    }

    /**
     * @notice Set asset address for a symbol (only owner)
     */
    function setAssetAddress(string memory symbol, address assetAddress) external onlyOwner {
        assetAddresses[symbol] = assetAddress;
    }

    /**
     * @notice Extract asset address from description
     * @dev Looks for "Asset Address: 0x..." or symbol patterns
     */
    function _extractAsset(string memory desc) internal view returns (address) {
        address extracted = _extractAssetAddress(desc);
        if (extracted != address(0)) {
            return extracted;
        }

        string memory symbol = _extractAssetSymbol(desc);
        if (bytes(symbol).length == 0) {
            return address(0);
        }

        return assetAddresses[symbol];
    }

    /**
     * @notice Extract asset symbol string from description
     */
    function _extractAssetSymbol(string memory desc) internal pure returns (string memory) {
        bytes memory descBytes = bytes(desc);
        // Support both "Asset Symbol: XXX" (preferred) and legacy "Asset: XXX"
        bytes memory patternSymbol = bytes("Asset Symbol: ");
        bytes memory patternSymbolLower = bytes("asset symbol: ");
        bytes memory patternLegacy = bytes("Asset: ");
        bytes memory patternLegacyLower = bytes("asset: ");

        string memory symbol = _extractAssetSymbolWithPattern(descBytes, patternSymbol);
        if (bytes(symbol).length == 0) {
            symbol = _extractAssetSymbolWithPattern(descBytes, patternSymbolLower);
        }
        if (bytes(symbol).length == 0) {
            symbol = _extractAssetSymbolWithPattern(descBytes, patternLegacy);
        }
        if (bytes(symbol).length == 0) {
            symbol = _extractAssetSymbolWithPattern(descBytes, patternLegacyLower);
        }
        return symbol;
    }

    function _extractAssetSymbolWithPattern(bytes memory descBytes, bytes memory pattern) internal pure returns (string memory) {
        if (pattern.length == 0 || descBytes.length < pattern.length) {
            return "";
        }

        for (uint i = 0; i <= descBytes.length - pattern.length; i++) {
            bool isMatch = true;
            for (uint j = 0; j < pattern.length; j++) {
                if (descBytes[i + j] != pattern[j]) {
                    isMatch = false;
                    break;
                }
            }

            if (isMatch) {
                uint start = i + pattern.length;
                uint end = start;

                while (end < descBytes.length) {
                    bytes1 char = descBytes[end];
                    // stop at newline or carriage return
                    if (char == 0x0a || char == 0x0d) {
                        break;
                    }
                    end++;
                }

                if (end > start) {
                    bytes memory symbolBytes = _extractTrimmed(descBytes, start, end);
                    for (uint k = 0; k < symbolBytes.length; k++) {
                        bytes1 ch = symbolBytes[k];
                        if (ch >= 0x61 && ch <= 0x7A) {
                            symbolBytes[k] = bytes1(uint8(ch) - 32);
                        }
                    }
                    return string(symbolBytes);
                }
            }
        }

        return "";
    }

    function _extractAssetAddress(string memory desc) internal pure returns (address) {
        // Ưu tiên format rõ ràng: "Asset Address: 0x..."
        return _extractAssetAddressWithPattern(desc, "Asset Address: ");
    }

    function _extractAssetAddressWithPattern(string memory desc, string memory patternStr) internal pure returns (address) {
        bytes memory descBytes = bytes(desc);
        bytes memory pattern = bytes(patternStr);

        if (descBytes.length < pattern.length || pattern.length == 0) {
            return address(0);
        }

        for (uint i = 0; i <= descBytes.length - pattern.length; i++) {
            bool isMatch = true;
            for (uint j = 0; j < pattern.length; j++) {
                if (descBytes[i + j] != pattern[j]) {
                    isMatch = false;
                    break;
                }
            }

            if (isMatch) {
                uint start = i + pattern.length;
                uint end = start;
                while (end < descBytes.length) {
                    bytes1 char = descBytes[end];
                    if (char == 0x0a || char == 0x0d) {
                        break;
                    }
                    end++;
                }

                if (end > start) {
                    bytes memory valueBytes = _extractTrimmed(descBytes, start, end);
                    address parsed = _parseAddress(valueBytes);
                    if (parsed != address(0)) {
                        return parsed;
                    }
                }
            }
        }

        return address(0);
    }

    function _extractTrimmed(bytes memory data, uint start, uint end) internal pure returns (bytes memory) {
        while (start < end && _isWhitespace(data[start])) {
            start++;
        }
        while (end > start && _isWhitespace(data[end - 1])) {
            end--;
        }

        bytes memory result = new bytes(end - start);
        for (uint i = 0; i < result.length; i++) {
            result[i] = data[start + i];
        }
        return result;
    }

    function _isWhitespace(bytes1 char) internal pure returns (bool) {
        return char == 0x20 || char == 0x09;
    }

    function _parseAddress(bytes memory value) internal pure returns (address) {
        if (value.length == 0) return address(0);

        uint start = 0;
        if (value.length >= 2 && value[0] == 0x30 && (value[1] == 0x78 || value[1] == 0x58)) {
            start = 2;
        }

        if (value.length - start != 40) {
            return address(0);
        }

        uint160 addr = 0;
        for (uint i = start; i < value.length; i++) {
            uint8 nibble = _fromHexChar(value[i]);
            if (nibble > 15) {
                return address(0);
            }
            addr = (addr << 4) | uint160(nibble);
        }
        return address(addr);
    }

    function _fromHexChar(bytes1 char) internal pure returns (uint8) {
        uint8 c = uint8(char);
        if (c >= 48 && c <= 57) {
            return c - 48;
        }
        if (c >= 65 && c <= 70) {
            return c - 55;
        }
        if (c >= 97 && c <= 102) {
            return c - 87;
        }
        return 255;
    }

    /**
     * @notice Extract proposed LTV from description
     * @dev Looks for "Proposed LTV (%): 80" pattern
     */
    function _extractProposedLTV(string memory desc) internal pure returns (uint16) {
        bytes memory descBytes = bytes(desc);
        bytes memory pattern = bytes("Proposed LTV (%): ");
        
        // Find pattern
        for (uint i = 0; i <= descBytes.length - pattern.length; i++) {
            bool isMatch = true;
            for (uint j = 0; j < pattern.length; j++) {
                if (descBytes[i + j] != pattern[j]) {
                    isMatch = false;
                    break;
                }
            }
            
            if (isMatch) {
                // Extract number after pattern
                uint start = i + pattern.length;
                uint end = start;
                while (end < descBytes.length && descBytes[end] >= 0x30 && descBytes[end] <= 0x39) {
                    end++;
                }
                
                if (end > start) {
                    uint num = 0;
                    for (uint k = start; k < end; k++) {
                        num = num * 10 + (uint8(descBytes[k]) - 48);
                    }
                    // Convert percentage to basis points (e.g., 80% = 8000 bps)
                    return uint16(num * 100);
                }
            }
        }
        
        return 0;
    }

    /**
     * @notice Extract proposed liquidation threshold from description
     * @dev Looks for "Proposed Threshold (%): 85" pattern
     */
    function _extractProposedLiquidationThreshold(string memory desc) internal pure returns (uint16) {
        bytes memory descBytes = bytes(desc);
        bytes memory pattern = bytes("Proposed Threshold (%): ");
        
        for (uint i = 0; i <= descBytes.length - pattern.length; i++) {
            bool isMatch = true;
            for (uint j = 0; j < pattern.length; j++) {
                if (descBytes[i + j] != pattern[j]) {
                    isMatch = false;
                    break;
                }
            }
            
            if (isMatch) {
                uint start = i + pattern.length;
                uint end = start;
                while (end < descBytes.length && (descBytes[end] >= 0x30 && descBytes[end] <= 0x39 || descBytes[end] == 0x2E)) {
                    end++;
                }
                
                if (end > start) {
                    uint num = 0;
                    uint decimals = 0;
                    bool foundDot = false;
                    for (uint k = start; k < end; k++) {
                        if (descBytes[k] == 0x2E) {
                            foundDot = true;
                        } else {
                            num = num * 10 + (uint8(descBytes[k]) - 48);
                            if (foundDot) decimals++;
                        }
                    }
                    return uint16(num * 100 / (10 ** decimals));
                }
            }
        }
        
        return 0;
    }

    /**
     * @notice Extract proposed liquidation bonus from description
     * @dev Looks for "Proposed Bonus (%): 7" pattern
     */
    function _extractProposedLiquidationBonus(string memory desc) internal pure returns (uint16) {
        bytes memory descBytes = bytes(desc);
        bytes memory pattern = bytes("Proposed Bonus (%): ");
        
        for (uint i = 0; i <= descBytes.length - pattern.length; i++) {
            bool isMatch = true;
            for (uint j = 0; j < pattern.length; j++) {
                if (descBytes[i + j] != pattern[j]) {
                    isMatch = false;
                    break;
                }
            }
            
            if (isMatch) {
                uint start = i + pattern.length;
                uint end = start;
                while (end < descBytes.length && (descBytes[end] >= 0x30 && descBytes[end] <= 0x39 || descBytes[end] == 0x2E)) {
                    end++;
                }
                
                if (end > start) {
                    uint num = 0;
                    uint decimals = 0;
                    bool foundDot = false;
                    for (uint k = start; k < end; k++) {
                        if (descBytes[k] == 0x2E) {
                            foundDot = true;
                        } else {
                            num = num * 10 + (uint8(descBytes[k]) - 48);
                            if (foundDot) decimals++;
                        }
                    }
                    return uint16(num * 100 / (10 ** decimals));
                }
            }
        }
        
        return 0;
    }

    /**
     * @notice Extract proposed reserve factor from description
     * @dev Looks for "Proposed Reserve Factor (%): 12" pattern
     */
    function _extractProposedReserveFactor(string memory desc) internal pure returns (uint16) {
        bytes memory descBytes = bytes(desc);
        bytes memory pattern = bytes("Proposed Reserve Factor (%): ");
        
        for (uint i = 0; i <= descBytes.length - pattern.length; i++) {
            bool isMatch = true;
            for (uint j = 0; j < pattern.length; j++) {
                if (descBytes[i + j] != pattern[j]) {
                    isMatch = false;
                    break;
                }
            }
            
            if (isMatch) {
                uint start = i + pattern.length;
                uint end = start;
                while (end < descBytes.length && (descBytes[end] >= 0x30 && descBytes[end] <= 0x39 || descBytes[end] == 0x2E)) {
                    end++;
                }
                
                if (end > start) {
                    uint num = 0;
                    uint decimals = 0;
                    bool foundDot = false;
                    for (uint k = start; k < end; k++) {
                        if (descBytes[k] == 0x2E) {
                            foundDot = true;
                        } else {
                            num = num * 10 + (uint8(descBytes[k]) - 48);
                            if (foundDot) decimals++;
                        }
                    }
                    return uint16(num * 100 / (10 ** decimals));
                }
            }
        }
        
        return 0;
    }

    /**
     * @notice Extract proposed supply cap from description
     * @dev Looks for "Proposed Supply Cap: 100000000" pattern
     */
    function _extractProposedSupplyCap(string memory desc) internal pure returns (uint128) {
        bytes memory descBytes = bytes(desc);
        bytes memory pattern = bytes("Proposed Supply Cap: ");
        
        for (uint i = 0; i <= descBytes.length - pattern.length; i++) {
            bool isMatch = true;
            for (uint j = 0; j < pattern.length; j++) {
                if (descBytes[i + j] != pattern[j]) {
                    isMatch = false;
                    break;
                }
            }
            
            if (isMatch) {
                uint start = i + pattern.length;
                uint end = start;
                while (end < descBytes.length && descBytes[end] >= 0x30 && descBytes[end] <= 0x39) {
                    end++;
                }
                
                if (end > start) {
                    uint num = 0;
                    for (uint k = start; k < end; k++) {
                        num = num * 10 + (uint8(descBytes[k]) - 48);
                    }
                    return uint128(num * 1e18); // Convert to 1e18 format
                }
            }
        }
        
        return 0;
    }

    /**
     * @notice Extract proposed borrow cap from description
     * @dev Looks for "Proposed Borrow Cap: 50000000" pattern
     */
    function _extractProposedBorrowCap(string memory desc) internal pure returns (uint128) {
        bytes memory descBytes = bytes(desc);
        bytes memory pattern = bytes("Proposed Borrow Cap: ");
        
        for (uint i = 0; i <= descBytes.length - pattern.length; i++) {
            bool isMatch = true;
            for (uint j = 0; j < pattern.length; j++) {
                if (descBytes[i + j] != pattern[j]) {
                    isMatch = false;
                    break;
                }
            }
            
            if (isMatch) {
                uint start = i + pattern.length;
                uint end = start;
                while (end < descBytes.length && descBytes[end] >= 0x30 && descBytes[end] <= 0x39) {
                    end++;
                }
                
                if (end > start) {
                    uint num = 0;
                    for (uint k = start; k < end; k++) {
                        num = num * 10 + (uint8(descBytes[k]) - 48);
                    }
                    return uint128(num * 1e18); // Convert to 1e18 format
                }
            }
        }
        
        return 0;
    }

    /**
     * @notice Extract proposed interest rate model parameters from description
     * @dev Looks for "Proposed Base Rate (APR %): 2", "Proposed Slope 1 (APR %): 5", etc.
     * @return baseRate Base rate in RAY per second
     * @return slope1 Slope 1 in RAY per second
     * @return slope2 Slope 2 in RAY per second
     * @return optimalU Optimal utilization in basis points
     */
    function _extractProposedInterestRateParams(string memory desc) internal pure returns (uint64 baseRate, uint64 slope1, uint64 slope2, uint16 optimalU) {
        bytes memory descBytes = bytes(desc);
        
        // Extract Base Rate (APR % -> RAY per second)
        bytes memory baseRatePattern = bytes("Proposed Base Rate (APR %): ");
        for (uint i = 0; i <= descBytes.length - baseRatePattern.length; i++) {
            bool isMatch = true;
            for (uint j = 0; j < baseRatePattern.length; j++) {
                if (descBytes[i + j] != baseRatePattern[j]) {
                    isMatch = false;
                    break;
                }
            }
            if (isMatch) {
                uint start = i + baseRatePattern.length;
                uint end = start;
                while (end < descBytes.length && (descBytes[end] >= 0x30 && descBytes[end] <= 0x39 || descBytes[end] == 0x2E)) {
                    end++;
                }
                if (end > start) {
                    uint num = 0;
                    uint decimals = 0;
                    bool foundDot = false;
                    for (uint k = start; k < end; k++) {
                        if (descBytes[k] == 0x2E) {
                            foundDot = true;
                        } else {
                            num = num * 10 + (uint8(descBytes[k]) - 48);
                            if (foundDot) decimals++;
                        }
                    }
                    // Convert APR % to RAY per second: apr * 1e27 / (100 * 31536000)
                    baseRate = uint64((num * 1e27) / (100 * 31536000 * (10 ** decimals)));
                }
            }
        }

        // Extract Slope 1
        bytes memory slope1Pattern = bytes("Proposed Slope 1 (APR %): ");
        for (uint i = 0; i <= descBytes.length - slope1Pattern.length; i++) {
            bool isMatch = true;
            for (uint j = 0; j < slope1Pattern.length; j++) {
                if (descBytes[i + j] != slope1Pattern[j]) {
                    isMatch = false;
                    break;
                }
            }
            if (isMatch) {
                uint start = i + slope1Pattern.length;
                uint end = start;
                while (end < descBytes.length && (descBytes[end] >= 0x30 && descBytes[end] <= 0x39 || descBytes[end] == 0x2E)) {
                    end++;
                }
                if (end > start) {
                    uint num = 0;
                    uint decimals = 0;
                    bool foundDot = false;
                    for (uint k = start; k < end; k++) {
                        if (descBytes[k] == 0x2E) {
                            foundDot = true;
                        } else {
                            num = num * 10 + (uint8(descBytes[k]) - 48);
                            if (foundDot) decimals++;
                        }
                    }
                    slope1 = uint64((num * 1e27) / (100 * 31536000 * (10 ** decimals)));
                }
            }
        }

        // Extract Slope 2
        bytes memory slope2Pattern = bytes("Proposed Slope 2 (APR %): ");
        for (uint i = 0; i <= descBytes.length - slope2Pattern.length; i++) {
            bool isMatch = true;
            for (uint j = 0; j < slope2Pattern.length; j++) {
                if (descBytes[i + j] != slope2Pattern[j]) {
                    isMatch = false;
                    break;
                }
            }
            if (isMatch) {
                uint start = i + slope2Pattern.length;
                uint end = start;
                while (end < descBytes.length && (descBytes[end] >= 0x30 && descBytes[end] <= 0x39 || descBytes[end] == 0x2E)) {
                    end++;
                }
                if (end > start) {
                    uint num = 0;
                    uint decimals = 0;
                    bool foundDot = false;
                    for (uint k = start; k < end; k++) {
                        if (descBytes[k] == 0x2E) {
                            foundDot = true;
                        } else {
                            num = num * 10 + (uint8(descBytes[k]) - 48);
                            if (foundDot) decimals++;
                        }
                    }
                    slope2 = uint64((num * 1e27) / (100 * 31536000 * (10 ** decimals)));
                }
            }
        }

        // Extract Optimal Utilization
        bytes memory optimalPattern = bytes("Optimal Utilization (%): ");
        for (uint i = 0; i <= descBytes.length - optimalPattern.length; i++) {
            bool isMatch = true;
            for (uint j = 0; j < optimalPattern.length; j++) {
                if (descBytes[i + j] != optimalPattern[j]) {
                    isMatch = false;
                    break;
                }
            }
            if (isMatch) {
                uint start = i + optimalPattern.length;
                uint end = start;
                while (end < descBytes.length && descBytes[end] >= 0x30 && descBytes[end] <= 0x39) {
                    end++;
                }
                if (end > start) {
                    uint num = 0;
                    for (uint k = start; k < end; k++) {
                        num = num * 10 + (uint8(descBytes[k]) - 48);
                    }
                    optimalU = uint16(num * 100);
                }
            }
        }
        
        // Default optimal utilization to 80% if not found
        if (optimalU == 0) {
            optimalU = 8000; // 80%
        }
        
        return (baseRate, slope1, slope2, optimalU);
    }
    
    /**
     * @notice Cancel a proposal (only proposer or owner)
     * @param proposalId The ID of the proposal to cancel
     */
    function cancelProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(
            proposal.id != 0,
            "LendHubGovernor: proposal does not exist"
        );
        
        require(
            msg.sender == proposal.proposer || msg.sender == owner(),
            "LendHubGovernor: not authorized to cancel"
        );
        
        require(
            proposal.state == ProposalState.Created || proposal.state == ProposalState.Active,
            "LendHubGovernor: cannot cancel this proposal"
        );
        
        proposal.state = ProposalState.Canceled;
        
        emit ProposalCanceled(proposalId);
    }
    
    /**
     * @notice Get proposal details
     * @param proposalId The ID of the proposal
     * @return The proposal struct
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }
    
    /**
     * @notice Get all proposal IDs
     * @return Array of proposal IDs
     */
    function getAllProposalIds() external view returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](proposalCount);
        for (uint256 i = 1; i <= proposalCount; i++) {
            ids[i - 1] = i;
        }
        return ids;
    }
    
    /**
     * @notice Check if user has voted on a proposal
     * @param proposalId The ID of the proposal
     * @param voter The address of the voter
     * @return Whether the user has voted
     */
    function hasUserVoted(uint256 proposalId, address voter) external view returns (bool) {
        return hasVoted[proposalId][voter];
    }
    
    /**
     * @notice Get user's vote on a proposal
     * @param proposalId The ID of the proposal
     * @param voter The address of the voter
     * @return support true = for, false = against
     */
    function getUserVote(uint256 proposalId, address voter) external view returns (bool support) {
        require(hasVoted[proposalId][voter], "LendHubGovernor: user has not voted");
        return voteSupport[proposalId][voter];
    }
    
    /**
     * @notice Update proposal state based on voting results
     * @param proposalId The ID of the proposal
     */
    function _updateProposalState(uint256 proposalId) internal {
        Proposal storage proposal = proposals[proposalId];
        
        // Check if proposal exists (proposal.id == 0 means it doesn't exist)
        require(proposal.id == proposalId, "Proposal does not exist");
        
        if (proposal.state != ProposalState.Active) {
            return; // Already in final state, no need to update
        }
        
        // Check if voting period has ended
        if (block.timestamp > proposal.votingEnd) {
            uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
            
            if (totalVotes >= QUORUM && proposal.votesFor > proposal.votesAgainst) {
                proposal.state = ProposalState.Succeeded;
            } else {
                proposal.state = ProposalState.Defeated;
            }
        }
    }
    
    /**
     * @notice Update proposal states (can be called by anyone)
     * @param proposalIds Array of proposal IDs to update
     */
    function updateProposalStates(uint256[] calldata proposalIds) external {
        for (uint256 i = 0; i < proposalIds.length; i++) {
            _updateProposalState(proposalIds[i]);
        }
    }
}

