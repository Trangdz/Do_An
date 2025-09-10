// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RiskManager.sol";
import "./InterestRateModel.sol";
import "hardhat/console.sol";

/**
 * @title LendingPoolV2
 * @dev Optimized lending and borrowing protocol for Ganache testing
 * @notice Supports multiple tokens with proper risk management
 */
contract LendingPoolV2 is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    RiskManager public immutable riskManager;
    InterestRateModel public immutable interestRateModel;
    
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
    
    // Interest rates (in basis points) - legacy
    mapping(address => uint256) public supplyRates;
    mapping(address => uint256) public borrowRates;
    
    // Reserve factors (in WAD format, 1e18 = 100%)
    mapping(address => uint256) public reserveFactorWAD;
    
    // Events
    event TokenAdded(address indexed token);
    event Supplied(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event Borrowed(address indexed user, address indexed token, uint256 amount);
    event Repaid(address indexed user, address indexed token, uint256 amount);
    event Liquidated(address indexed liquidator, address indexed user, address indexed debtAsset, address collateralAsset, uint256 repayAmount, uint256 collateralAmount);
    event InterestUpdated(address indexed token, uint256 supplyRate, uint256 borrowRate);
    
    constructor(address _riskManager) {
        riskManager = RiskManager(_riskManager);
        interestRateModel = new InterestRateModel();
    }
    
    modifier onlySupportedToken(address token) {
        require(riskManager.getTokenConfig(token).isSupported, "Token not supported");
        _;
    }
    
    function addToken(address token) external onlyOwner {
        require(!_isTokenSupported(token), "Token already supported");
        supportedTokens.push(token);
        
        // Set default reserve factor to 10% (0.10e18)
        reserveFactorWAD[token] = 0.10e18;
        
        emit TokenAdded(token);
    }
    
    function setReserveFactor(address token, uint256 reserveFactor) external onlyOwner {
        require(_isTokenSupported(token), "Token not supported");
        require(reserveFactor <= 1e18, "Reserve factor cannot exceed 100%");
        reserveFactorWAD[token] = reserveFactor;
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
        
        // Debug logging
        console.log("=== _canBorrow Debug ===");
        console.log("totalBorrowableValue:", totalBorrowableValue);
        console.log("currentBorrowValue:", currentBorrowValue);
        console.log("newBorrowValue:", newBorrowValue);
        console.log("canBorrow:", newBorrowValue <= totalBorrowableValue);
        
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
        uint256 utilizationRate = totalSupplied[token] > 0 ? (totalBorrowed[token] * 10000) / totalSupplied[token] : 0;
        borrowRates[token] = riskManager.calculateBorrowRate(utilizationRate);
        supplyRates[token] = riskManager.calculateSupplyRate(utilizationRate, borrowRates[token]);
        
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
    
    // Liquidation functions
    function liquidate(
        address user,
        address debtAsset,
        address collateralAsset,
        uint256 repayAmount
    ) external nonReentrant onlySupportedToken(debtAsset) onlySupportedToken(collateralAsset) {
        require(repayAmount > 0, "Repay amount must be positive");
        require(user != msg.sender, "Cannot liquidate yourself");
        
        // Check if user is liquidatable
        uint256 currentHF = healthFactor(user);
        require(currentHF < riskManager.MIN_HEALTH_FACTOR(), "User is not liquidatable");
        
        // Check if user has debt in debtAsset
        require(userBorrows[user][debtAsset] > 0, "User has no debt in this asset");
        
        // Check if user has collateral in collateralAsset
        require(userSupplies[user][collateralAsset] > 0, "User has no collateral in this asset");
        
        // Get liquidation bonus from RiskManager
        RiskManager.TokenConfig memory collateralConfig = riskManager.getTokenConfig(collateralAsset);
        require(collateralConfig.isCollateral, "Asset is not collateral");
        uint256 bonusBP = collateralConfig.bonusBP;
        
        // Calculate liquidation amounts
        uint256 repayUSD = _toUsd1e8(debtAsset, repayAmount);
        uint256 collateralUSD_withBonus = (repayUSD * (10000 + bonusBP)) / 10000;
        uint256 collateralAmount = _usdToTokenAmount(collateralAsset, collateralUSD_withBonus);
        
        // Check if user has enough collateral
        require(userSupplies[user][collateralAsset] >= collateralAmount, "Insufficient collateral");
        
        // Check if repay amount doesn't exceed outstanding debt
        uint256 outstandingDebt = userBorrows[user][debtAsset];
        if (repayAmount > outstandingDebt) {
            repayAmount = outstandingDebt;
            // Recalculate collateral amount for actual repay amount
            repayUSD = _toUsd1e8(debtAsset, repayAmount);
            collateralUSD_withBonus = (repayUSD * (10000 + bonusBP)) / 10000;
            collateralAmount = _usdToTokenAmount(collateralAsset, collateralUSD_withBonus);
        }
        
        // Transfer debt asset from liquidator to pool
        IERC20(debtAsset).safeTransferFrom(msg.sender, address(this), repayAmount);
        
        // Update user debt
        userBorrows[user][debtAsset] -= repayAmount;
        totalBorrowed[debtAsset] -= repayAmount;
        
        // Update user collateral
        userSupplies[user][collateralAsset] -= collateralAmount;
        totalSupplied[collateralAsset] -= collateralAmount;
        
        // Update pool reserves
        reserves[debtAsset] += repayAmount;
        reserves[collateralAsset] -= collateralAmount;
        
        // Transfer collateral to liquidator
        IERC20(collateralAsset).safeTransfer(msg.sender, collateralAmount);
        
        // Update interest rates
        _updateInterestRates(debtAsset);
        _updateInterestRates(collateralAsset);
        
        // Log liquidation details
        console.log("Liquidation executed:");
        console.log("  User:", user);
        console.log("  Liquidator:", msg.sender);
        console.log("  Debt asset:", debtAsset);
        console.log("  Collateral asset:", collateralAsset);
        console.log("  Repay amount:", repayAmount);
        console.log("  Collateral amount:", collateralAmount);
        console.log("  Bonus BP:", bonusBP);
        
        // Check new health factor
        uint256 newHF = healthFactor(user);
        console.log("  Health factor before:", currentHF);
        console.log("  Health factor after:", newHF);
        
        emit Liquidated(msg.sender, user, debtAsset, collateralAsset, repayAmount, collateralAmount);
    }
    
    function _toUsd1e8(address token, uint256 amount) internal view returns (uint256) {
        int256 price = riskManager.getTokenPrice(token);
        require(price > 0, "Invalid price");
        return (amount * uint256(price)) / (10 ** IERC20Metadata(token).decimals());
    }
    
    function _usdToTokenAmount(address token, uint256 usdAmount) internal view returns (uint256) {
        int256 price = riskManager.getTokenPrice(token);
        require(price > 0, "Invalid price");
        return (usdAmount * (10 ** IERC20Metadata(token).decimals())) / uint256(price);
    }
    
    function isLiquidatable(address user) external view returns (bool) {
        uint256 currentHF = healthFactor(user);
        return currentHF < riskManager.MIN_HEALTH_FACTOR();
    }
    
    function calculateLiquidationAmounts(
        address user,
        address debtAsset,
        address collateralAsset,
        uint256 repayAmount
    ) external view returns (uint256 actualRepayAmount, uint256 collateralAmount, uint256 bonusBP) {
        require(userBorrows[user][debtAsset] > 0, "User has no debt in this asset");
        require(userSupplies[user][collateralAsset] > 0, "User has no collateral in this asset");
        
        RiskManager.TokenConfig memory collateralConfig = riskManager.getTokenConfig(collateralAsset);
        require(collateralConfig.isCollateral, "Asset is not collateral");
        
        bonusBP = collateralConfig.bonusBP;
        
        // Check if repay amount exceeds outstanding debt
        uint256 outstandingDebt = userBorrows[user][debtAsset];
        actualRepayAmount = repayAmount > outstandingDebt ? outstandingDebt : repayAmount;
        
        // Calculate collateral amount
        uint256 repayUSD = _toUsd1e8(debtAsset, actualRepayAmount);
        uint256 collateralUSD_withBonus = (repayUSD * (10000 + bonusBP)) / 10000;
        collateralAmount = _usdToTokenAmount(collateralAsset, collateralUSD_withBonus);
    }
    
    // Interest Rate Functions
    function utilization(address token) external view returns (uint256) {
        if (totalSupplied[token] == 0) {
            return 0;
        }
        return interestRateModel.calculateUtilization(totalBorrowed[token], totalSupplied[token]);
    }
    
    function currentRates(address token) external view returns (uint256 borrowAPR, uint256 supplyAPR, uint256 utilizationRate) {
        utilizationRate = this.utilization(token);
        uint256 reserveFactor = reserveFactorWAD[token];
        (borrowAPR, supplyAPR) = interestRateModel.rates(utilizationRate, reserveFactor);
    }
    
    function getReserveFactor(address token) external view returns (uint256) {
        return reserveFactorWAD[token];
    }
    
    function getInterestRateModel() external view returns (address) {
        return address(interestRateModel);
    }
}