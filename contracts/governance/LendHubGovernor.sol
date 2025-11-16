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
        
        proposal.executed = true;
        proposal.state = ProposalState.Executed;
        proposal.executionTime = block.timestamp;
        
        emit ProposalExecuted(proposalId);
        
        // Execute actual proposal actions based on description
        _executeProposalActions(proposalId, proposal);
    }

    /**
     * @notice Execute proposal actions based on description
     * @dev Parses description to extract parameters and calls appropriate LendingPool functions
     */
    function _executeProposalActions(uint256 proposalId, Proposal memory proposal) internal {
        if (address(lendingPool) == address(0)) {
            // LendingPool not set, skip execution
            return;
        }

        string memory desc = proposal.description;
        
        // Check if this is a change LTV proposal
        if (_contains(desc, "Proposed LTV")) {
            // Extract asset and new LTV from description
            address asset = _extractAsset(desc);
            uint16 newLTV = _extractProposedLTV(desc);
            
            if (asset != address(0) && newLTV > 0) {
                lendingPool.updateLTV(asset, newLTV);
            }
        }
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
     * @dev Looks for "Asset: WETH" or similar patterns
     */
    function _extractAsset(string memory desc) internal view returns (address) {
        // Try to extract asset symbol from description
        if (_contains(desc, "Asset: WETH") || _contains(desc, "asset: WETH")) {
            return assetAddresses["WETH"];
        }
        if (_contains(desc, "Asset: DAI") || _contains(desc, "asset: DAI")) {
            return assetAddresses["DAI"];
        }
        if (_contains(desc, "Asset: USDC") || _contains(desc, "asset: USDC")) {
            return assetAddresses["USDC"];
        }
        if (_contains(desc, "Asset: LINK") || _contains(desc, "asset: LINK")) {
            return assetAddresses["LINK"];
        }
        return address(0);
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

