// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAAVERewardDistributor
 * @notice Interface for AAVE-style reward distribution
 */
interface IAAVERewardDistributor {
    /**
     * @notice Handle user action (supply, withdraw, borrow, repay)
     * @param user User address
     * @param asset Asset address
     * @param supplyBalance New supply balance (1e18)
     * @param borrowBalance New borrow balance (1e18)
     * @param totalSupply Total supply for this asset (1e18)
     * @param totalBorrow Total borrow for this asset (1e18)
     */
    function handleAction(
        address user,
        address asset,
        uint256 supplyBalance,
        uint256 borrowBalance,
        uint256 totalSupply,
        uint256 totalBorrow
    ) external;
    
    /**
     * @notice Get user's unclaimed rewards
     */
    function getUnclaimedRewards(address user) external view returns (uint256);
    
    /**
     * @notice Get user's unclaimed rewards for a specific asset
     */
    function getUnclaimedRewardsForAsset(address user, address asset) external view returns (uint256);
}



