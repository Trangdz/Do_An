// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "../tokens/LENDXToken.sol";
import "../core/LendingPool.sol";

/**
 * @title SimpleRewardDistributor
 * @notice Simplified reward distributor that calculates rewards based on current balances
 * @dev Users earn LENDX tokens by:
 * - Supplying liquidity: 0.01 LENDX per 1000 USDC (1e21) supplied per day
 * - Borrowing assets: 0.05 LENDX per 1000 USDC (1e21) borrowed per day
 * 
 * Rewards are calculated on-demand when user claims, based on their current supply/borrow balances
 * and time elapsed since last claim.
 */
contract SimpleRewardDistributor is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    LENDXToken public immutable lendxToken;
    LendingPool public immutable lendingPool;
    
    // Reward rates (per 1e18 token per second)
    uint256 public supplyRatePerSecond; // LENDX per 1e18 supplied per second
    uint256 public borrowRatePerSecond; // LENDX per 1e18 borrowed per second
    
    // Track last claim time for each user
    mapping(address => uint256) public lastClaimTime;
    
    // Total rewards distributed
    uint256 public totalDistributed;
    
    // Events
    event RewardClaimed(address indexed user, uint256 amount);
    event RatesUpdated(uint256 newSupplyRate, uint256 newBorrowRate);

    constructor(
        address _lendxToken,
        address _lendingPool,
        address initialOwner
    ) Ownable(initialOwner) {
        lendxToken = LENDXToken(_lendxToken);
        lendingPool = LendingPool(_lendingPool);
        
        // Default rates:
        // Supply: 0.01 LENDX per 1000 USDC (1e21) per day = 0.01e18 / (1000 * 1e18) / 86400
        // = 0.01e18 / 1e21 / 86400 = 1.157e-10 LENDX per 1e18 per second
        supplyRatePerSecond = 115740740; // ~0.01 LENDX per 1e21 per day
        // Borrow: 5x supply rate
        borrowRatePerSecond = 578703703; // ~0.05 LENDX per 1e21 per day
    }

    /**
     * @notice Calculate pending rewards for a user
     * @param user Address of the user
     * @return Total pending reward in LENDX (1e18)
     */
    function calculatePendingReward(address user) public view returns (uint256) {
        if (user == address(0)) return 0;
        
        uint256 lastClaim = lastClaimTime[user];
        if (lastClaim == 0) {
            // First time, set to now (no reward yet)
            return 0;
        }
        
        uint256 timeElapsed = block.timestamp - lastClaim;
        if (timeElapsed == 0) return 0;
        
        uint256 totalReward = 0;
        
        // Get all assets from LendingPool (simplified - you might need to track assets differently)
        // For now, we'll calculate based on a few common assets
        // In production, you'd want to iterate through all initialized reserves
        
        // This is a simplified version - in production, you'd want to:
        // 1. Get list of all assets from LendingPool
        // 2. For each asset, get user's supply and borrow balance
        // 3. Calculate reward for each
        
        // Example calculation (you'll need to adapt this):
        // uint256 supplyBalance = lendingPool.getCurrentSupplyBalance(user, asset);
        // uint256 borrowBalance = lendingPool.getCurrentDebtBalance(user, asset);
        // uint256 supplyReward = (supplyBalance * supplyRatePerSecond * timeElapsed) / 1e18;
        // uint256 borrowReward = (borrowBalance * borrowRatePerSecond * timeElapsed) / 1e18;
        // totalReward += supplyReward + borrowReward;
        
        return totalReward;
    }

    /**
     * @notice Claim accumulated rewards
     * @dev Calculates rewards based on current balances and time elapsed
     */
    function claimReward() external nonReentrant {
        uint256 reward = calculatePendingReward(msg.sender);
        
        if (reward == 0) {
            // Still update last claim time to start tracking
            if (lastClaimTime[msg.sender] == 0) {
                lastClaimTime[msg.sender] = block.timestamp;
            }
            return;
        }
        
        // Update last claim time
        lastClaimTime[msg.sender] = block.timestamp;
        
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
        return calculatePendingReward(user);
    }

    /**
     * @notice Update reward rates (only owner)
     */
    function setRates(uint256 _supplyRate, uint256 _borrowRate) external onlyOwner {
        supplyRatePerSecond = _supplyRate;
        borrowRatePerSecond = _borrowRate;
        emit RatesUpdated(_supplyRate, _borrowRate);
    }

    /**
     * @notice Emergency: Withdraw remaining LENDX tokens (only owner)
     */
    function emergencyWithdraw(address to) external onlyOwner {
        uint256 balance = lendxToken.balanceOf(address(this));
        if (balance > 0) {
            IERC20(address(lendxToken)).safeTransfer(to, balance);
        }
    }
}








































