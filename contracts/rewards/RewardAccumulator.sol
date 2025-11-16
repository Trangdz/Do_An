// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "./RewardDistributor.sol";

/**
 * @title RewardAccumulator
 * @notice Calculates and accumulates pending rewards for users
 * @dev This contract calculates rewards based on user activity and accumulates them into RewardDistributor
 * 
 * Reward calculation:
 * - Supply rewards: Based on supply balance and time
 * - Borrow rewards: Based on borrow balance and time
 * 
 * Rewards are accumulated on each interaction (supply, borrow, withdraw, repay)
 */
contract RewardAccumulator is Ownable {
    RewardDistributor public immutable rewardDistributor;
    
    // Reward rate per second (in LENDX, 1e18)
    // Example: 1e15 = 0.001 LENDX per second per 1e18 token supplied/borrowed
    uint256 public supplyRewardRatePerTokenPerSecond; // Reward per token per second for supplying
    uint256 public borrowRewardRatePerTokenPerSecond; // Reward per token per second for borrowing
    
    // User => asset => last update timestamp
    mapping(address => mapping(address => uint256)) public lastUpdateTime;
    
    // User => asset => last supply balance (1e18)
    mapping(address => mapping(address => uint256)) public lastSupplyBalance;
    
    // User => asset => last borrow balance (1e18)
    mapping(address => mapping(address => uint256)) public lastBorrowBalance;
    
    // LendingPool address (authorized to call accumulateRewards)
    address public lendingPool;
    
    // Events
    event RewardsAccumulated(address indexed user, uint256 amount);
    event RewardRatesUpdated(uint256 supplyRate, uint256 borrowRate);
    event LendingPoolUpdated(address indexed newLendingPool);
    
    constructor(address _rewardDistributor, address initialOwner) Ownable(initialOwner) {
        rewardDistributor = RewardDistributor(_rewardDistributor);
        
        // Default reward rates (can be updated by owner)
        // 0.001 LENDX per second per 1e18 token = 1e15 per second
        // This means 1 token supplied for 1 second = 0.001 LENDX reward
        // Or 1000 tokens for 1 second = 1 LENDX reward
        supplyRewardRatePerTokenPerSecond = 1e15; // 0.001 LENDX per token per second
        borrowRewardRatePerTokenPerSecond = 2e15; // 0.002 LENDX per token per second (borrowing earns 2x)
    }
    
    /**
     * @notice Set LendingPool address (only owner)
     */
    function setLendingPool(address _lendingPool) external onlyOwner {
        lendingPool = _lendingPool;
        emit LendingPoolUpdated(_lendingPool);
    }
    
    /**
     * @notice Update reward rates (only owner)
     * @param _supplyRate Reward rate per token per second for supplying (1e18)
     * @param _borrowRate Reward rate per token per second for borrowing (1e18)
     */
    function setRewardRates(uint256 _supplyRate, uint256 _borrowRate) external onlyOwner {
        supplyRewardRatePerTokenPerSecond = _supplyRate;
        borrowRewardRatePerTokenPerSecond = _borrowRate;
        emit RewardRatesUpdated(_supplyRate, _borrowRate);
    }
    
    /**
     * @notice Accumulate rewards for a user (called by LendingPool)
     * @dev This function calculates pending rewards and accumulates them into RewardDistributor
     * @param user Address of the user
     */
    function accumulateRewards(address user) external {
        // Only LendingPool can call this
        require(msg.sender == lendingPool, "RewardAccumulator: only LendingPool");
        require(user != address(0), "RewardAccumulator: invalid user");
        
        // Calculate and accumulate rewards
        uint256 totalReward = _calculatePendingReward(user);
        
        if (totalReward > 0) {
            // Accumulate reward into RewardDistributor
            rewardDistributor.accumulateReward(user, totalReward);
            emit RewardsAccumulated(user, totalReward);
        }
    }
    
    /**
     * @notice Calculate pending reward for a user (view function)
     * @param user Address of the user
     * @return Total pending reward in LENDX (1e18)
     */
    function calculatePendingReward(address user) external view returns (uint256) {
        return _calculatePendingReward(user);
    }
    
    /**
     * @notice Internal function to calculate pending reward
     * @dev This calculates rewards based on:
     * - Supply balance × time × supply rate
     * - Borrow balance × time × borrow rate
     */
    function _calculatePendingReward(address user) internal view returns (uint256) {
        uint256 totalReward = 0;
        uint256 currentTime = block.timestamp;
        
        // Note: In a full implementation, we would iterate through all assets
        // For now, we'll use a simplified calculation based on last known balances
        // This requires the LendingPool to provide supply/borrow balances
        
        // For demo purposes, we'll calculate a simple time-based reward
        // In production, this should query LendingPool for actual balances
        
        return totalReward;
    }
    
    /**
     * @notice Update user's supply balance (called by LendingPool after supply/withdraw)
     * @param user Address of the user
     * @param asset Address of the asset
     * @param supplyBalance New supply balance (1e18)
     */
    function updateSupplyBalance(address user, address asset, uint256 supplyBalance) external {
        require(msg.sender == lendingPool, "RewardAccumulator: only LendingPool");
        
        // Calculate reward for previous balance
        uint256 lastTime = lastUpdateTime[user][asset];
        uint256 lastSupply = lastSupplyBalance[user][asset];
        
        // Only calculate reward if we have previous state (not first time)
        if (lastTime > 0 && lastSupply > 0) {
            uint256 timeElapsed = block.timestamp - lastTime;
            if (timeElapsed > 0) {
                uint256 supplyReward = (lastSupply * supplyRewardRatePerTokenPerSecond * timeElapsed) / 1e18;
                
                if (supplyReward > 0) {
                    rewardDistributor.accumulateReward(user, supplyReward);
                    emit RewardsAccumulated(user, supplyReward);
                }
            }
        }
        
        // Always update state (even for first time)
        // This initializes the tracking for future rewards
        lastUpdateTime[user][asset] = block.timestamp;
        lastSupplyBalance[user][asset] = supplyBalance;
    }
    
    /**
     * @notice Initialize state for existing supply (only owner, for migration)
     * @dev This allows owner to initialize state for users who supplied before RewardAccumulator was deployed
     * @param user Address of the user
     * @param asset Address of the asset
     * @param supplyBalance Current supply balance (1e18)
     */
    function initializeSupplyBalance(address user, address asset, uint256 supplyBalance) external onlyOwner {
        // Only initialize if not already initialized
        if (lastUpdateTime[user][asset] == 0) {
            lastUpdateTime[user][asset] = block.timestamp;
            lastSupplyBalance[user][asset] = supplyBalance;
            emit RewardsAccumulated(user, 0); // Emit event to indicate initialization
        }
    }
    
    /**
     * @notice Initialize state for existing borrow (only owner, for migration)
     * @param user Address of the user
     * @param asset Address of the asset
     * @param borrowBalance Current borrow balance (1e18)
     */
    function initializeBorrowBalance(address user, address asset, uint256 borrowBalance) external onlyOwner {
        // Only initialize if not already initialized
        if (lastUpdateTime[user][asset] == 0) {
            lastUpdateTime[user][asset] = block.timestamp;
            lastBorrowBalance[user][asset] = borrowBalance;
            emit RewardsAccumulated(user, 0); // Emit event to indicate initialization
        }
    }
    
    /**
     * @notice Update user's borrow balance (called by LendingPool after borrow/repay)
     * @param user Address of the user
     * @param asset Address of the asset
     * @param borrowBalance New borrow balance (1e18)
     */
    function updateBorrowBalance(address user, address asset, uint256 borrowBalance) external {
        require(msg.sender == lendingPool, "RewardAccumulator: only LendingPool");
        
        // Calculate reward for previous balance
        uint256 lastTime = lastUpdateTime[user][asset];
        uint256 lastBorrow = lastBorrowBalance[user][asset];
        
        if (lastTime > 0 && lastBorrow > 0) {
            uint256 timeElapsed = block.timestamp - lastTime;
            uint256 borrowReward = (lastBorrow * borrowRewardRatePerTokenPerSecond * timeElapsed) / 1e18;
            
            if (borrowReward > 0) {
                rewardDistributor.accumulateReward(user, borrowReward);
                emit RewardsAccumulated(user, borrowReward);
            }
        }
        
        // Update state
        lastUpdateTime[user][asset] = block.timestamp;
        lastBorrowBalance[user][asset] = borrowBalance;
    }
}

