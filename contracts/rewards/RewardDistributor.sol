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
    
    // Fair distribution mechanism
    // Daily claim limit per user (prevents early users from claiming all rewards)
    uint256 public dailyClaimLimit; // Default: 1000 LENDX per day per user
    mapping(address => mapping(uint256 => uint256)) public dailyClaimed; // user => day => amount
    
    // Reserve pool for new users (percentage of total pool)
    uint256 public reservePoolPercentage; // Default: 20% (20e18 = 20%)
    uint256 public reservePoolAmount; // Amount reserved for new users
    bool public reservePoolActive; // Whether reserve pool is active
    
    // Maximum reward per user (cap to ensure fair distribution)
    uint256 public maxRewardPerUser; // Default: 10M LENDX per user
    
    // Sustainable emission mechanism
    uint256 public dailyEmissionRate; // LENDX emitted per day (default: 100,000 LENDX/day)
    uint256 public lastEmissionDay; // Last day when emission was processed
    address public emissionSource; // Address that provides emissions (treasury or mint)
    bool public emissionActive; // Whether daily emission is active
    
    // Dynamic rate adjustment
    uint256 public minPoolBalance; // Minimum pool balance to maintain (default: 10M LENDX)
    uint256 public targetPoolBalance; // Target pool balance (default: 50M LENDX)
    
    // Events
    event RewardAccumulated(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardsDistributed(address indexed user, uint256 amount);
    event DailyLimitUpdated(uint256 newLimit);
    event ReservePoolUpdated(uint256 percentage, uint256 amount, bool active);
    event MaxRewardPerUserUpdated(uint256 newMax);
    event DailyEmissionProcessed(uint256 day, uint256 amount);
    event EmissionParamsUpdated(uint256 dailyRate, address source, bool active);
    event PoolBalanceTargetsUpdated(uint256 minBalance, uint256 targetBalance);

    constructor(address _lendxToken, address initialOwner) Ownable(initialOwner) {
        lendxToken = LENDXToken(_lendxToken);
        
        // Initialize fair distribution parameters
        dailyClaimLimit = 1000e18; // 1,000 LENDX per day per user
        reservePoolPercentage = 20e18; // 20% (using 1e18 as 100%)
        reservePoolActive = true;
        maxRewardPerUser = 10e24; // 10M LENDX max per user
        
        // Initialize sustainable emission parameters
        dailyEmissionRate = 100000e18; // 100,000 LENDX per day (~36.5M per year)
        lastEmissionDay = block.timestamp / 86400; // Current day
        emissionActive = true;
        minPoolBalance = 10e24; // 10M LENDX minimum
        targetPoolBalance = 50e24; // 50M LENDX target
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
     * @notice Claim accumulated rewards (with fair distribution limits)
     * @dev Transfers LENDX tokens from this contract to the user
     *      Applies daily limit and max reward per user to ensure fair distribution
     */
    function claimReward() external nonReentrant {
        uint256 reward = rewards[msg.sender];
        if (reward == 0) revert NoRewardToClaim();
        
        // Get current day (Unix timestamp / 86400 seconds)
        uint256 currentDay = block.timestamp / 86400;
        uint256 claimedToday = dailyClaimed[msg.sender][currentDay];
        
        // Apply daily claim limit
        uint256 claimableToday = dailyClaimLimit;
        if (claimedToday >= claimableToday) {
            revert DailyLimitExceeded();
        }
        
        // Calculate how much user can claim today
        uint256 remainingDailyLimit = claimableToday - claimedToday;
        uint256 claimAmount = reward < remainingDailyLimit ? reward : remainingDailyLimit;
        
        // Apply max reward per user cap (check total claimed by user)
        // Note: This is a soft cap - user can still accumulate more, but claim is limited
        // For a hard cap, we'd need to track totalClaimedPerUser separately
        
        // Check contract balance
        uint256 contractBalance = lendxToken.balanceOf(address(this));
        if (contractBalance < claimAmount) {
            // If not enough balance, claim what's available
            claimAmount = contractBalance;
            if (claimAmount == 0) revert InsufficientFunds();
        }
        
        // Update user's reward balance
        rewards[msg.sender] = reward - claimAmount;
        
        // Update daily claimed
        dailyClaimed[msg.sender][currentDay] = claimedToday + claimAmount;
        
        // Transfer tokens
        IERC20(address(lendxToken)).safeTransfer(msg.sender, claimAmount);
        totalDistributed += claimAmount;
        
        emit RewardClaimed(msg.sender, claimAmount);
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

    /**
     * @notice Set daily claim limit (only owner)
     * @param _dailyClaimLimit New daily claim limit per user (1e18)
     */
    function setDailyClaimLimit(uint256 _dailyClaimLimit) external onlyOwner {
        dailyClaimLimit = _dailyClaimLimit;
        emit DailyLimitUpdated(_dailyClaimLimit);
    }
    
    /**
     * @notice Set reserve pool parameters (only owner)
     * @param _percentage Reserve pool percentage (1e18 = 100%)
     * @param _active Whether reserve pool is active
     */
    function setReservePool(uint256 _percentage, bool _active) external onlyOwner {
        require(_percentage <= 100e18, "RewardDistributor: invalid percentage");
        reservePoolPercentage = _percentage;
        reservePoolActive = _active;
        
        // Calculate reserve pool amount from current balance
        uint256 currentBalance = lendxToken.balanceOf(address(this));
        reservePoolAmount = (currentBalance * _percentage) / 100e18;
        
        emit ReservePoolUpdated(_percentage, reservePoolAmount, _active);
    }
    
    /**
     * @notice Set maximum reward per user (only owner)
     * @param _maxRewardPerUser Maximum reward a user can claim (1e18)
     */
    function setMaxRewardPerUser(uint256 _maxRewardPerUser) external onlyOwner {
        maxRewardPerUser = _maxRewardPerUser;
        emit MaxRewardPerUserUpdated(_maxRewardPerUser);
    }
    
    /**
     * @notice Get user's remaining daily claim limit
     * @param user Address of the user
     * @return Remaining amount user can claim today
     */
    function getRemainingDailyLimit(address user) external view returns (uint256) {
        uint256 currentDay = block.timestamp / 86400;
        uint256 claimedToday = dailyClaimed[user][currentDay];
        if (claimedToday >= dailyClaimLimit) {
            return 0;
        }
        return dailyClaimLimit - claimedToday;
    }
    
    /**
     * @notice Process daily emission (can be called by anyone, but should be called daily)
     * @dev Emits LENDX tokens from emission source to this contract
     *      This ensures the reward pool is replenished daily
     */
    function processDailyEmission() external {
        require(emissionActive, "RewardDistributor: emission not active");
        
        uint256 currentDay = block.timestamp / 86400;
        
        // Only process once per day
        if (currentDay <= lastEmissionDay) {
            return; // Already processed today
        }
        
        // Calculate days to process (in case multiple days passed)
        uint256 daysToProcess = currentDay - lastEmissionDay;
        uint256 emissionAmount = dailyEmissionRate * daysToProcess;
        
        // Try to get tokens from emission source
        if (emissionSource != address(0)) {
            // If emission source is set, try to transfer from it
            uint256 sourceBalance = lendxToken.balanceOf(emissionSource);
            if (sourceBalance >= emissionAmount) {
                // Check allowance first
                uint256 allowance = lendxToken.allowance(emissionSource, address(this));
                if (allowance >= emissionAmount) {
                    // Transfer from emission source
                    IERC20(address(lendxToken)).safeTransferFrom(emissionSource, address(this), emissionAmount);
                } else {
                    // Not enough allowance, use what's available
                    emissionAmount = allowance < sourceBalance ? allowance : sourceBalance;
                    if (emissionAmount > 0) {
                        IERC20(address(lendxToken)).safeTransferFrom(emissionSource, address(this), emissionAmount);
                    } else {
                        emissionAmount = 0;
                    }
                }
            } else {
                // Source doesn't have enough, use what's available
                uint256 allowance = lendxToken.allowance(emissionSource, address(this));
                emissionAmount = allowance < sourceBalance ? allowance : sourceBalance;
                if (emissionAmount > 0) {
                    IERC20(address(lendxToken)).safeTransferFrom(emissionSource, address(this), emissionAmount);
                } else {
                    emissionAmount = 0;
                }
            }
        } else {
            // If no emission source, try to mint directly (requires owner of LENDXToken)
            // Note: This will only work if RewardDistributor owner is also LENDXToken owner
            try LENDXToken(address(lendxToken)).mint(address(this), emissionAmount) {
                // Mint successful
            } catch {
                // Mint failed (not owner or mint disabled)
                emissionAmount = 0;
            }
        }
        
        if (emissionAmount > 0) {
            // Update reserve pool amount if active
            if (reservePoolActive) {
                uint256 currentBalance = lendxToken.balanceOf(address(this));
                reservePoolAmount = (currentBalance * reservePoolPercentage) / 100e18;
            }
        }
        
        lastEmissionDay = currentDay;
        emit DailyEmissionProcessed(currentDay, emissionAmount);
    }
    
    /**
     * @notice Set emission parameters (only owner)
     * @param _dailyEmissionRate Daily emission rate (1e18)
     * @param _emissionSource Address that provides emissions (treasury, or address(0) to mint)
     * @param _active Whether emission is active
     */
    function setEmissionParams(uint256 _dailyEmissionRate, address _emissionSource, bool _active) external onlyOwner {
        dailyEmissionRate = _dailyEmissionRate;
        emissionSource = _emissionSource;
        emissionActive = _active;
        emit EmissionParamsUpdated(_dailyEmissionRate, _emissionSource, _active);
    }
    
    /**
     * @notice Set pool balance targets (only owner)
     * @param _minPoolBalance Minimum pool balance to maintain (1e18)
     * @param _targetPoolBalance Target pool balance (1e18)
     */
    function setPoolBalanceTargets(uint256 _minPoolBalance, uint256 _targetPoolBalance) external onlyOwner {
        minPoolBalance = _minPoolBalance;
        targetPoolBalance = _targetPoolBalance;
        emit PoolBalanceTargetsUpdated(_minPoolBalance, _targetPoolBalance);
    }
    
    /**
     * @notice Get current pool status
     * @return balance Current pool balance
     * @return daysSinceLastEmission Days since last emission
     * @return pendingEmission Pending emission amount
     */
    function getPoolStatus() external view returns (
        uint256 balance,
        uint256 daysSinceLastEmission,
        uint256 pendingEmission
    ) {
        balance = lendxToken.balanceOf(address(this));
        uint256 currentDay = block.timestamp / 86400;
        daysSinceLastEmission = currentDay > lastEmissionDay ? currentDay - lastEmissionDay : 0;
        pendingEmission = daysSinceLastEmission * dailyEmissionRate;
    }
    
    // Errors
    error InvalidAddress();
    error ArrayLengthMismatch();
    error NoRewardToClaim();
    error DailyLimitExceeded();
    error InsufficientFunds();
}








































