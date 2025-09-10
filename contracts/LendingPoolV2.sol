// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RiskManager.sol";
import "hardhat/console.sol";

/**
 * @title LendingPoolV2
 * @dev Optimized lending and borrowing protocol for Ganache testing
 * @notice Supports multiple tokens with proper risk management
 */
contract LendingPoolV2 is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    RiskManager public immutable riskManager;
    
    // Pool state
    mapping(address => uint256) public reserves;
    mapping(address => uint256) public totalBorrowed;
    mapping(address => uint256) public totalSupplied;
    address[] public supportedTokens;
    
    // User positions
    mapping(address => mapping(address => uint256)) public userSupplies;
    mapping(address => mapping(address => uint256)) public userBorrows;
    mapping(address => mapping(address => uint256)) public userSupplyTimestamps;
    mapping(address => mapping(address => uint256)) public userBorrowTimestamps;
    
    // Interest rates (in basis points)
    mapping(address => uint256) public supplyRates;
    mapping(address => uint256) public borrowRates;
    
    // Events
    event TokenAdded(address indexed token);
    event Supplied(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event Borrowed(address indexed user, address indexed token, uint256 amount);
    event Repaid(address indexed user, address indexed token, uint256 amount);
    event InterestUpdated(address indexed token, uint256 supplyRate, uint256 borrowRate);
    
    constructor(address _riskManager) {
        riskManager = RiskManager(_riskManager);
    }
    
    modifier onlySupportedToken(address token) {
        require(riskManager.getTokenConfig(token).isSupported, "Token not supported");
        _;
    }
    
    function addToken(address token) external onlyOwner {
        require(!_isTokenSupported(token), "Token already supported");
        supportedTokens.push(token);
        emit TokenAdded(token);
    }
    
    function _isTokenSupported(address token) internal view returns (bool) {
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            if (supportedTokens[i] == token) {
                return true;
            }
        }
        return false;
    }
    
    function supply(address token, uint256 amount) external nonReentrant onlySupportedToken(token) {
        require(amount > 0, "Amount must be positive");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update user supply
        userSupplies[msg.sender][token] += amount;
        userSupplyTimestamps[msg.sender][token] = block.timestamp;
        
        // Update pool state
        reserves[token] += amount;
        totalSupplied[token] += amount;
        
        // Update interest rates
        _updateInterestRates(token);
        
        emit Supplied(msg.sender, token, amount);
    }
    
    function withdraw(address token, uint256 amount) external nonReentrant onlySupportedToken(token) {
        require(amount > 0, "Amount must be positive");
        require(userSupplies[msg.sender][token] >= amount, "Insufficient supply");
        
        // Check health factor after withdraw
        _checkHealthFactorAfterWithdraw(msg.sender, token, amount);
        
        // Update user supply
        userSupplies[msg.sender][token] -= amount;
        
        // Update pool state
        reserves[token] -= amount;
        totalSupplied[token] -= amount;
        
        IERC20(token).safeTransfer(msg.sender, amount);
        
        // Update interest rates
        _updateInterestRates(token);
        
        emit Withdrawn(msg.sender, token, amount);
    }
    
    function borrow(address token, uint256 amount) external nonReentrant onlySupportedToken(token) {
        require(amount > 0, "Amount must be positive");
        require(reserves[token] >= amount, "Insufficient liquidity");
        
        // Check if user can borrow
        require(_canBorrow(msg.sender, token, amount), "Cannot borrow");
        
        // Check health factor after borrow
        _checkHealthFactorAfterBorrow(msg.sender, token, amount);
        
        // Update user borrow
        userBorrows[msg.sender][token] += amount;
        userBorrowTimestamps[msg.sender][token] = block.timestamp;
        
        // Update pool state
        reserves[token] -= amount;
        totalBorrowed[token] += amount;
        
        IERC20(token).safeTransfer(msg.sender, amount);
        
        // Update interest rates
        _updateInterestRates(token);
        
        emit Borrowed(msg.sender, token, amount);
    }
    
    function repay(address token, uint256 amount) external nonReentrant onlySupportedToken(token) {
        require(amount > 0, "Amount must be positive");
        require(userBorrows[msg.sender][token] >= amount, "Insufficient borrow");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update user borrow
        userBorrows[msg.sender][token] -= amount;
        
        // Update pool state
        reserves[token] += amount;
        totalBorrowed[token] -= amount;
        
        // Update interest rates
        _updateInterestRates(token);
        
        emit Repaid(msg.sender, token, amount);
    }
    
    function _canBorrow(address user, address token, uint256 amount) internal view returns (bool) {
        // Get user's collateral positions
        (address[] memory collateralTokens, uint256[] memory collateralAmounts) = _getUserCollateral(user, address(0), 0);
        
        // Calculate total borrowable value
        uint256 totalBorrowableValue = riskManager.calculateBorrowableValue(collateralTokens, collateralAmounts);
        
        // Get current borrow value
        (address[] memory borrowTokens, uint256[] memory borrowAmounts) = _getUserBorrows(user, address(0), 0);
        uint256 currentBorrowValue = riskManager.calculateBorrowValue(borrowTokens, borrowAmounts);
        
        // Calculate new borrow value
        uint256 newBorrowValue = currentBorrowValue + riskManager.getTokenValue(token, amount);
        
        // Check if new borrow value is within borrowable limit
        return newBorrowValue <= totalBorrowableValue;
    }
    
    function _isUserHealthy(address user, address token, uint256 withdrawAmount, uint256 borrowAmount) internal view returns (bool) {
        return _checkHealthFactor(user, token, withdrawAmount, borrowAmount);
    }
    
    function _checkHealthFactor(address user, address token, uint256 withdrawAmount, uint256 borrowAmount) internal view returns (bool) {
        // Get user's collateral and borrow positions
        (address[] memory collateralTokens, uint256[] memory collateralAmounts) = _getUserCollateral(user, token, withdrawAmount);
        (address[] memory borrowTokens, uint256[] memory borrowAmounts) = _getUserBorrows(user, token, borrowAmount);
        
        // Check health factor
        uint256 currentHealthFactor = riskManager.calculateHealthFactor(
            collateralTokens,
            collateralAmounts,
            borrowTokens,
            borrowAmounts
        );
        
        return currentHealthFactor >= 10000; // 100% health factor minimum
    }
    
    function _getUserCollateral(address user, address token, uint256 withdrawAmount) internal view returns (address[] memory tokens, uint256[] memory amounts) {
        uint256 count = 0;
        
        // Count non-zero supplies
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address t = supportedTokens[i];
            uint256 supplyAmount = userSupplies[user][t];
            if (t == token && withdrawAmount > 0) {
                supplyAmount = supplyAmount > withdrawAmount ? supplyAmount - withdrawAmount : 0;
            }
            if (supplyAmount > 0) count++;
        }
        
        // Create arrays
        tokens = new address[](count);
        amounts = new uint256[](count);
        count = 0;
        
        // Populate arrays
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address t = supportedTokens[i];
            uint256 supplyAmount = userSupplies[user][t];
            if (t == token && withdrawAmount > 0) {
                supplyAmount = supplyAmount > withdrawAmount ? supplyAmount - withdrawAmount : 0;
            }
            if (supplyAmount > 0) {
                tokens[count] = t;
                amounts[count] = supplyAmount;
                count++;
            }
        }
    }
    
    function _getUserBorrows(address user, address token, uint256 borrowAmount) internal view returns (address[] memory tokens, uint256[] memory amounts) {
        uint256 count = 0;
        
        // Count non-zero borrows
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address t = supportedTokens[i];
            uint256 borrowAmountForToken = userBorrows[user][t];
            if (t == token && borrowAmount > 0) {
                borrowAmountForToken += borrowAmount;
            }
            if (borrowAmountForToken > 0) count++;
        }
        
        // Create arrays
        tokens = new address[](count);
        amounts = new uint256[](count);
        count = 0;
        
        // Populate arrays
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address t = supportedTokens[i];
            uint256 borrowAmountForToken = userBorrows[user][t];
            if (t == token && borrowAmount > 0) {
                borrowAmountForToken += borrowAmount;
            }
            if (borrowAmountForToken > 0) {
                tokens[count] = t;
                amounts[count] = borrowAmountForToken;
                count++;
            }
        }
    }
    
    function _updateInterestRates(address token) internal {
        uint256 utilization = totalSupplied[token] > 0 ? (totalBorrowed[token] * 10000) / totalSupplied[token] : 0;
        borrowRates[token] = riskManager.calculateBorrowRate(utilization);
        supplyRates[token] = riskManager.calculateSupplyRate(utilization, borrowRates[token]);
        
        emit InterestUpdated(token, supplyRates[token], borrowRates[token]);
    }
    
    // View functions
    function getUserSupply(address user, address token) external view returns (uint256) {
        return userSupplies[user][token];
    }
    
    function getUserBorrow(address user, address token) external view returns (uint256) {
        return userBorrows[user][token];
    }
    
    function getReserve(address token) external view returns (uint256) {
        return reserves[token];
    }
    
    function getTotalSupplied(address token) external view returns (uint256) {
        return totalSupplied[token];
    }
    
    function getTotalBorrowed(address token) external view returns (uint256) {
        return totalBorrowed[token];
    }
    
    function getUtilization(address token) external view returns (uint256) {
        if (totalSupplied[token] == 0) return 0;
        return (totalBorrowed[token] * 10000) / totalSupplied[token];
    }
    
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }
    
    function healthFactor(address user) public view returns (uint256 hfWAD) {
        (address[] memory collateralTokens, uint256[] memory collateralAmounts) = _getUserCollateral(user, address(0), 0);
        (address[] memory borrowTokens, uint256[] memory borrowAmounts) = _getUserBorrows(user, address(0), 0);
        
        return riskManager.calculateHealthFactorWAD(
            collateralTokens,
            collateralAmounts,
            borrowTokens,
            borrowAmounts
        );
    }
    
    function getUserHealthFactor(address user) external view returns (uint256) {
        return healthFactor(user);
    }
    
    function _checkHealthFactorAfterBorrow(address user, address token, uint256 amount) internal view {
        (address[] memory collateralTokens, uint256[] memory collateralAmounts) = _getUserCollateral(user, address(0), 0);
        (address[] memory borrowTokens, uint256[] memory borrowAmounts) = _getUserBorrows(user, token, amount);
        
        uint256 hfAfter = riskManager.calculateHealthFactorWAD(
            collateralTokens,
            collateralAmounts,
            borrowTokens,
            borrowAmounts
        );
        
        require(hfAfter >= riskManager.MIN_HEALTH_FACTOR(), "Health factor too low after borrow");
        
        // Console log for debugging
        console.log("HF after borrow:", hfAfter);
        console.log("Min HF required:", riskManager.MIN_HEALTH_FACTOR());
    }
    
    function _checkHealthFactorAfterWithdraw(address user, address token, uint256 amount) internal view {
        (address[] memory collateralTokens, uint256[] memory collateralAmounts) = _getUserCollateral(user, token, amount);
        (address[] memory borrowTokens, uint256[] memory borrowAmounts) = _getUserBorrows(user, address(0), 0);
        
        uint256 hfAfter = riskManager.calculateHealthFactorWAD(
            collateralTokens,
            collateralAmounts,
            borrowTokens,
            borrowAmounts
        );
        
        require(hfAfter >= riskManager.MIN_HEALTH_FACTOR(), "Health factor too low after withdraw");
        
        // Console log for debugging
        console.log("HF after withdraw:", hfAfter);
        console.log("Min HF required:", riskManager.MIN_HEALTH_FACTOR());
    }
}