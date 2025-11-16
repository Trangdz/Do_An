// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "../tokens/LENDXToken.sol";

/**
 * @title RewardDistributor
 * @notice Distributes LENDX tokens to users based on their activity in the protocol
 * @dev Users earn rewards by:
 * - Supplying liquidity (lending)
 * - Borrowing assets
 * - Staking assets
 * 
 * Rewards are calculated off-chain or by LendingPool and accumulated here.
 * Users can claim their accumulated rewards.
 */
contract RewardDistributor is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    LENDXToken public immutable lendxToken;
    
    // RewardAccumulator address (authorized to accumulate rewards)
    address public rewardAccumulator;
    
    // User => accumulated reward amount (in LENDX, 1e18)
    mapping(address => uint256) public rewards;
    
    // User => last update timestamp
    mapping(address => uint256) public lastUpdateTime;
    
    // Total rewards distributed
    uint256 public totalDistributed;
    
    // Events
    event RewardAccumulated(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardsDistributed(address indexed user, uint256 amount);

    constructor(address _lendxToken, address initialOwner) Ownable(initialOwner) {
        lendxToken = LENDXToken(_lendxToken);
    }
    
    /**
     * @notice Set RewardAccumulator address (only owner or current rewardAccumulator)
     * @dev Allows current rewardAccumulator to update itself (for migration)
     */
    function setRewardAccumulator(address _rewardAccumulator) external {
        require(
            msg.sender == owner() || msg.sender == rewardAccumulator,
            "RewardDistributor: unauthorized"
        );
        rewardAccumulator = _rewardAccumulator;
    }

    /**
     * @notice Accumulate rewards for a user (called by LendingPool or authorized contract)
     * @param user Address of the user
     * @param amount Amount of LENDX to add to user's reward balance
     */
    function accumulateReward(address user, uint256 amount) external {
        // Allow owner or RewardAccumulator to call this
        require(msg.sender == owner() || msg.sender == rewardAccumulator, "RewardDistributor: unauthorized");
        if (user == address(0)) revert InvalidAddress();
        if (amount == 0) return;
        
        rewards[user] += amount;
        lastUpdateTime[user] = block.timestamp;
        
        emit RewardAccumulated(user, amount);
    }

    /**
     * @notice Batch accumulate rewards for multiple users
     * @param users Array of user addresses
     * @param amounts Array of reward amounts (same length as users)
     */
    function batchAccumulateRewards(address[] calldata users, uint256[] calldata amounts) external onlyOwner {
        if (users.length != amounts.length) revert ArrayLengthMismatch();
        
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] != address(0) && amounts[i] > 0) {
                rewards[users[i]] += amounts[i];
                lastUpdateTime[users[i]] = block.timestamp;
                emit RewardAccumulated(users[i], amounts[i]);
            }
        }
    }

    /**
     * @notice Claim accumulated rewards
     * @dev Transfers LENDX tokens from this contract to the user
     */
    function claimReward() external nonReentrant {
        uint256 reward = rewards[msg.sender];
        if (reward == 0) revert NoRewardToClaim();
        
        // Reset user's reward balance
        rewards[msg.sender] = 0;
        
        // Transfer tokens (LENDXToken is ERC20, so we can use SafeERC20 with IERC20)
        IERC20(address(lendxToken)).safeTransfer(msg.sender, reward);
        totalDistributed += reward;
        
        emit RewardClaimed(msg.sender, reward);
    }

    /**
     * @notice Get user's claimable reward amount
     * @param user Address of the user
     * @return Amount of LENDX the user can claim
     */
    function getClaimableReward(address user) external view returns (uint256) {
        return rewards[user];
    }

    /**
     * @notice Emergency: Withdraw remaining LENDX tokens (only owner)
     * @dev Should only be used in emergency situations
     */
    function emergencyWithdraw(address to) external onlyOwner {
        uint256 balance = lendxToken.balanceOf(address(this));
        if (balance > 0) {
            IERC20(address(lendxToken)).safeTransfer(to, balance);
        }
    }

    // Errors
    error InvalidAddress();
    error ArrayLengthMismatch();
    error NoRewardToClaim();
}








































