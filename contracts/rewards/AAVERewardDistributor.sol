// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "../tokens/LENDXToken.sol";

/**
 * @title AAVERewardDistributor
 * @notice Phân phối reward LENDX theo cơ chế AAVE-style sử dụng AssetIndex và UserIndex
 * @dev Cơ chế này đảm bảo:
 * - Công bằng: Reward chia theo tỷ lệ balance và thời gian
 * - Hiệu quả: Chỉ cập nhật khi có action, không loop toàn user
 * - An toàn: Chống spam, chống farm, chống multicall exploit
 * 
 * Công thức: Reward = (assetIndex - userIndex) × userBalance
 */
contract AAVERewardDistributor is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice LENDX token
    LENDXToken public immutable lendxToken;
    
    /// @notice LendingPool address (authorized to call handleAction)
    address public lendingPool;
    
    /// @notice Distribution end timestamp (0 = unlimited)
    uint256 public distributionEnd;
    
    /// @notice Supply/Borrow reward split (1e18 = 100%)
    /// @dev supplyRewardPercentage = 50% means 50% reward goes to supply, 50% to borrow
    uint256 public supplyRewardPercentage = 50e17; // 50% (50 * 1e17)
    uint256 public borrowRewardPercentage = 50e17; // 50% (50 * 1e17)
    
    /// @notice Minimum deposit to earn rewards (anti-sybil)
    uint256 public minDepositForReward = 1e15; // 0.001 tokens (1e15)
    
    /// @notice Cooldown between actions (anti-spam)
    uint256 public actionCooldown = 60; // 60 seconds
    
    /// @notice Minimum reward amount to accumulate (anti-dust)
    uint256 public minRewardAmount = 1e15; // 0.001 LENDX
    
    // ============ Asset Data Structure ============
    
    struct AssetData {
        // Supply side
        uint128 supplyIndex;        // Supply asset index (1e18 = 1.0)
        uint128 supplyLastUpdate;   // Last update timestamp for supply
        
        // Borrow side
        uint128 borrowIndex;        // Borrow asset index (1e18 = 1.0)
        uint128 borrowLastUpdate;   // Last update timestamp for borrow
        
        // Emission rate per second (1e18)
        uint128 emissionPerSecond;
        
        // Total supply/borrow for this asset
        uint128 totalSupply;
        uint128 totalBorrow;
    }
    
    /// @notice Asset => AssetData
    mapping(address => AssetData) public assets;
    
    /// @notice List of configured assets
    address[] public configuredAssets;
    
    // ============ User Data Structure ============
    
    struct UserData {
        // Supply side
        uint128 supplyIndex;        // User's supply index snapshot
        uint128 supplyBalance;      // User's supply balance
        
        // Borrow side
        uint128 borrowIndex;        // User's borrow index snapshot
        uint128 borrowBalance;      // User's borrow balance
        
        // Unclaimed rewards
        uint256 unclaimedRewards;   // Total unclaimed rewards (1e18)
        
        // Last action timestamp (anti-spam)
        uint128 lastActionTime;
    }
    
    /// @notice User => Asset => UserData
    mapping(address => mapping(address => UserData)) public users;
    
    // ============ Events ============
    
    event AssetConfigured(
        address indexed asset,
        uint256 emissionPerSecond,
        uint256 supplyPercentage,
        uint256 borrowPercentage
    );
    
    event AssetIndexUpdated(
        address indexed asset,
        uint256 supplyIndex,
        uint256 borrowIndex,
        uint256 totalSupply,
        uint256 totalBorrow
    );
    
    event UserRewardUpdated(
        address indexed user,
        address indexed asset,
        uint256 supplyReward,
        uint256 borrowReward,
        uint256 totalUnclaimed
    );
    
    event RewardsClaimed(
        address indexed user,
        uint256 amount
    );
    
    event ActionHandled(
        address indexed user,
        address indexed asset,
        uint256 supplyBalance,
        uint256 borrowBalance
    );
    
    event DistributionEndUpdated(uint256 newEnd);
    event RewardSplitUpdated(uint256 supplyPercentage, uint256 borrowPercentage);
    event AntiSpamParamsUpdated(uint256 minDeposit, uint256 cooldown, uint256 minReward);
    
    // ============ Constructor ============
    
    constructor(address _lendxToken, address initialOwner) Ownable(initialOwner) {
        lendxToken = LENDXToken(_lendxToken);
    }
    
    // ============ Configuration ============
    
    /**
     * @notice Set LendingPool address (only owner)
     */
    function setLendingPool(address _lendingPool) external onlyOwner {
        lendingPool = _lendingPool;
    }
    
    /**
     * @notice Configure reward for an asset
     * @param asset Asset address
     * @param emissionPerSecond Emission rate per second (1e18)
     * @param supplyPercentage Percentage of reward for supply (1e18 = 100%)
     * @param borrowPercentage Percentage of reward for borrow (1e18 = 100%)
     */
    function configureAsset(
        address asset,
        uint128 emissionPerSecond,
        uint128 supplyPercentage,
        uint128 borrowPercentage
    ) external onlyOwner {
        require(asset != address(0), "AAVERewardDistributor: invalid asset");
        require(supplyPercentage + borrowPercentage == 100e17, "AAVERewardDistributor: percentages must sum to 100%");
        
        AssetData storage assetData = assets[asset];
        
        // Initialize if new asset
        if (assetData.emissionPerSecond == 0) {
            configuredAssets.push(asset);
            // Initialize indices to 1e18 (1.0)
            assetData.supplyIndex = uint128(1e18);
            assetData.borrowIndex = uint128(1e18);
        }
        
        // Update emission and percentages
        assetData.emissionPerSecond = emissionPerSecond;
        supplyRewardPercentage = supplyPercentage;
        borrowRewardPercentage = borrowPercentage;
        
        // Update indices before changing emission
        _updateAssetIndex(asset);
        
        emit AssetConfigured(asset, emissionPerSecond, supplyPercentage, borrowPercentage);
    }
    
    /**
     * @notice Set distribution end timestamp (0 = unlimited)
     */
    function setDistributionEnd(uint256 _distributionEnd) external onlyOwner {
        distributionEnd = _distributionEnd;
        emit DistributionEndUpdated(_distributionEnd);
    }
    
    /**
     * @notice Update reward split percentages
     */
    function setRewardSplit(uint128 _supplyPercentage, uint128 _borrowPercentage) external onlyOwner {
        require(_supplyPercentage + _borrowPercentage == 100e17, "AAVERewardDistributor: percentages must sum to 100%");
        supplyRewardPercentage = _supplyPercentage;
        borrowRewardPercentage = _borrowPercentage;
        emit RewardSplitUpdated(_supplyPercentage, _borrowPercentage);
    }
    
    /**
     * @notice Update anti-spam parameters
     */
    function setAntiSpamParams(
        uint256 _minDeposit,
        uint256 _cooldown,
        uint256 _minReward
    ) external onlyOwner {
        minDepositForReward = _minDeposit;
        actionCooldown = _cooldown;
        minRewardAmount = _minReward;
        emit AntiSpamParamsUpdated(_minDeposit, _cooldown, _minReward);
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice Handle user action (supply, withdraw, borrow, repay)
     * @dev Called by LendingPool when user performs any action
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
    ) external {
        require(msg.sender == lendingPool, "AAVERewardDistributor: only LendingPool");
        require(user != address(0) && asset != address(0), "AAVERewardDistributor: invalid address");
        
        // Anti-spam: Check cooldown
        UserData storage userData = users[user][asset];
        if (userData.lastActionTime > 0) {
            require(
                block.timestamp >= userData.lastActionTime + actionCooldown,
                "AAVERewardDistributor: action cooldown"
            );
        }
        
        // Update asset index first
        _updateAssetIndex(asset);
        
        // Update total supply/borrow
        AssetData storage assetData = assets[asset];
        assetData.totalSupply = uint128(totalSupply);
        assetData.totalBorrow = uint128(totalBorrow);
        
        // Calculate and update user rewards
        _updateUserReward(user, asset, supplyBalance, borrowBalance);
        
        // Update user balances and index
        userData.supplyBalance = uint128(supplyBalance);
        userData.borrowBalance = uint128(borrowBalance);
        userData.supplyIndex = assetData.supplyIndex;
        userData.borrowIndex = assetData.borrowIndex;
        userData.lastActionTime = uint128(block.timestamp);
        
        emit ActionHandled(user, asset, supplyBalance, borrowBalance);
    }
    
    /**
     * @notice Update asset index (internal)
     * @dev Calculates new index based on emission and total supply/borrow
     */
    function _updateAssetIndex(address asset) internal {
        AssetData storage assetData = assets[asset];
        
        if (assetData.emissionPerSecond == 0) return;
        if (distributionEnd > 0 && block.timestamp >= distributionEnd) return;
        
        uint256 currentTime = block.timestamp;
        uint256 timeElapsed = currentTime - assetData.supplyLastUpdate;
        
        if (timeElapsed == 0) return;
        
        uint256 totalEmission = uint256(assetData.emissionPerSecond) * timeElapsed;
        
        // Calculate supply reward
        uint256 supplyReward = (totalEmission * supplyRewardPercentage) / 1e18;
        if (assetData.totalSupply > 0 && supplyReward > 0) {
            uint256 deltaIndex = (supplyReward * 1e18) / assetData.totalSupply;
            assetData.supplyIndex += uint128(deltaIndex);
        }
        
        // Calculate borrow reward
        uint256 borrowReward = (totalEmission * borrowRewardPercentage) / 1e18;
        if (assetData.totalBorrow > 0 && borrowReward > 0) {
            uint256 deltaIndex = (borrowReward * 1e18) / assetData.totalBorrow;
            assetData.borrowIndex += uint128(deltaIndex);
        }
        
        // Update timestamps
        assetData.supplyLastUpdate = uint128(currentTime);
        assetData.borrowLastUpdate = uint128(currentTime);
        
        emit AssetIndexUpdated(
            asset,
            assetData.supplyIndex,
            assetData.borrowIndex,
            assetData.totalSupply,
            assetData.totalBorrow
        );
    }
    
    /**
     * @notice Update user reward (internal)
     * @dev Calculates reward based on index difference and balance
     */
    function _updateUserReward(
        address user,
        address asset,
        uint256 newSupplyBalance,
        uint256 newBorrowBalance
    ) internal {
        UserData storage userData = users[user][asset];
        AssetData storage assetData = assets[asset];
        
        uint256 supplyReward = 0;
        uint256 borrowReward = 0;
        
        // Calculate supply reward
        if (userData.supplyBalance > 0) {
            uint256 deltaIndex = uint256(assetData.supplyIndex) - uint256(userData.supplyIndex);
            supplyReward = (userData.supplyBalance * deltaIndex) / 1e18;
            
            // Anti-sybil: Only count if balance >= minDeposit
            if (userData.supplyBalance < minDepositForReward) {
                supplyReward = 0;
            }
        }
        
        // Calculate borrow reward
        if (userData.borrowBalance > 0) {
            uint256 deltaIndex = uint256(assetData.borrowIndex) - uint256(userData.borrowIndex);
            borrowReward = (userData.borrowBalance * deltaIndex) / 1e18;
            
            // Anti-sybil: Only count if balance >= minDeposit
            if (userData.borrowBalance < minDepositForReward) {
                borrowReward = 0;
            }
        }
        
        // Anti-dust: Only accumulate if reward >= minimum
        uint256 totalReward = supplyReward + borrowReward;
        if (totalReward >= minRewardAmount) {
            userData.unclaimedRewards += totalReward;
        }
        
        emit UserRewardUpdated(user, asset, supplyReward, borrowReward, userData.unclaimedRewards);
    }
    
    /**
     * @notice Claim all accumulated rewards
     * @dev Transfers all unclaimed rewards to user
     */
    function claimRewards() external nonReentrant {
        address user = msg.sender;
        uint256 totalReward = 0;
        
        // Update all assets and accumulate rewards
        for (uint256 i = 0; i < configuredAssets.length; i++) {
            address asset = configuredAssets[i];
            UserData storage userData = users[user][asset];
            
            // Update asset index first
            _updateAssetIndex(asset);
            
            // Calculate pending rewards for current balances
            _updateUserReward(user, asset, userData.supplyBalance, userData.borrowBalance);
            
            // Add to total
            totalReward += userData.unclaimedRewards;
            
            // Reset unclaimed rewards
            userData.unclaimedRewards = 0;
            
            // Update user indices
            AssetData storage assetData = assets[asset];
            userData.supplyIndex = assetData.supplyIndex;
            userData.borrowIndex = assetData.borrowIndex;
        }
        
        require(totalReward > 0, "AAVERewardDistributor: no reward to claim");
        
        // Check contract balance
        uint256 contractBalance = lendxToken.balanceOf(address(this));
        require(contractBalance >= totalReward, "AAVERewardDistributor: insufficient funds");
        
        // Transfer rewards
        IERC20(address(lendxToken)).safeTransfer(user, totalReward);
        
        emit RewardsClaimed(user, totalReward);
    }
    
    /**
     * @notice Claim rewards for a specific asset
     */
    function claimRewardsForAsset(address asset) external nonReentrant {
        address user = msg.sender;
        UserData storage userData = users[user][asset];
        
        require(asset != address(0), "AAVERewardDistributor: invalid asset");
        
        // Update asset index first
        _updateAssetIndex(asset);
        
        // Calculate pending rewards
        _updateUserReward(user, asset, userData.supplyBalance, userData.borrowBalance);
        
        uint256 reward = userData.unclaimedRewards;
        require(reward > 0, "AAVERewardDistributor: no reward to claim");
        
        // Reset unclaimed rewards
        userData.unclaimedRewards = 0;
        
        // Update user indices
        AssetData storage assetData = assets[asset];
        userData.supplyIndex = assetData.supplyIndex;
        userData.borrowIndex = assetData.borrowIndex;
        
        // Check contract balance
        uint256 contractBalance = lendxToken.balanceOf(address(this));
        require(contractBalance >= reward, "AAVERewardDistributor: insufficient funds");
        
        // Transfer rewards
        IERC20(address(lendxToken)).safeTransfer(user, reward);
        
        emit RewardsClaimed(user, reward);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get user's unclaimed rewards
     */
    function getUnclaimedRewards(address user) external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < configuredAssets.length; i++) {
            total += users[user][configuredAssets[i]].unclaimedRewards;
        }
        return total;
    }
    
    /**
     * @notice Get user's unclaimed rewards for a specific asset
     */
    function getUnclaimedRewardsForAsset(address user, address asset) external view returns (uint256) {
        return users[user][asset].unclaimedRewards;
    }
    
    /**
     * @notice Get current asset indices
     */
    function getAssetIndices(address asset) external view returns (uint256 supplyIndex, uint256 borrowIndex) {
        AssetData storage assetData = assets[asset];
        return (assetData.supplyIndex, assetData.borrowIndex);
    }
    
    /**
     * @notice Get user's current reward (including pending)
     * @dev This is a view function that calculates pending rewards without updating state
     */
    function getUserReward(address user, address asset) external view returns (uint256) {
        UserData storage userData = users[user][asset];
        AssetData storage assetData = assets[asset];
        
        // Calculate pending rewards (simulate update)
        uint256 supplyReward = 0;
        uint256 borrowReward = 0;
        
        if (userData.supplyBalance > 0 && assetData.totalSupply > 0) {
            // Simulate index update
            uint256 timeElapsed = block.timestamp - assetData.supplyLastUpdate;
            if (timeElapsed > 0 && assetData.emissionPerSecond > 0) {
                uint256 totalEmission = uint256(assetData.emissionPerSecond) * timeElapsed;
                uint256 supplyRewardEmission = (totalEmission * supplyRewardPercentage) / 1e18;
                uint256 deltaIndex = (supplyRewardEmission * 1e18) / assetData.totalSupply;
                uint256 newSupplyIndex = uint256(assetData.supplyIndex) + deltaIndex;
                
                uint256 deltaUserIndex = newSupplyIndex - uint256(userData.supplyIndex);
                supplyReward = (userData.supplyBalance * deltaUserIndex) / 1e18;
            }
        }
        
        if (userData.borrowBalance > 0 && assetData.totalBorrow > 0) {
            // Simulate index update
            uint256 timeElapsed = block.timestamp - assetData.borrowLastUpdate;
            if (timeElapsed > 0 && assetData.emissionPerSecond > 0) {
                uint256 totalEmission = uint256(assetData.emissionPerSecond) * timeElapsed;
                uint256 borrowRewardEmission = (totalEmission * borrowRewardPercentage) / 1e18;
                uint256 deltaIndex = (borrowRewardEmission * 1e18) / assetData.totalBorrow;
                uint256 newBorrowIndex = uint256(assetData.borrowIndex) + deltaIndex;
                
                uint256 deltaUserIndex = newBorrowIndex - uint256(userData.borrowIndex);
                borrowReward = (userData.borrowBalance * deltaUserIndex) / 1e18;
            }
        }
        
        return userData.unclaimedRewards + supplyReward + borrowReward;
    }
    
    /**
     * @notice Get number of configured assets
     */
    function getConfiguredAssetsCount() external view returns (uint256) {
        return configuredAssets.length;
    }
    
    /**
     * @notice Emergency: Withdraw remaining LENDX (only owner)
     */
    function emergencyWithdraw(address to) external onlyOwner {
        uint256 balance = lendxToken.balanceOf(address(this));
        if (balance > 0) {
            IERC20(address(lendxToken)).safeTransfer(to, balance);
        }
    }
}



