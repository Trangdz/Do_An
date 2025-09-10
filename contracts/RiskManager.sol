// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "./MockOracle.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @title RiskManager
 * @dev Manages risk parameters for lending protocol
 * @notice Handles collateral ratios, liquidation thresholds, and health factors
 */
contract RiskManager {
    MockOracle public immutable oracle;
    
    // Risk parameters (in basis points, 10000 = 100%)
    uint256 public constant MAX_LTV = 8000;        // 80% max loan-to-value
    uint256 public constant LIQUIDATION_THRESHOLD = 8500; // 85% liquidation threshold
    uint256 public constant LIQUIDATION_BONUS = 500;      // 5% liquidation bonus
    
    // Health Factor constants
    uint256 public constant WAD = 1e18;            // 1 WAD = 1e18
    uint256 public constant MIN_HEALTH_FACTOR = 1e18; // 1.0 minimum health factor
    
    // Interest rate parameters
    uint256 public constant BASE_RATE = 200;       // 2% base rate
    uint256 public constant RATE_SLOPE_1 = 400;    // 4% slope 1
    uint256 public constant RATE_SLOPE_2 = 10000;  // 100% slope 2
    uint256 public constant OPTIMAL_UTILIZATION = 8000; // 80% optimal utilization
    
    // Token configuration
    struct TokenConfig {
        bool isSupported;
        bool isCollateral;
        uint256 ltvBP;        // Loan-to-Value in basis points (for borrowable calculation)
        uint256 ltBP;         // Liquidation Threshold in basis points (for health factor)
        uint256 bonusBP;      // Liquidation bonus in basis points
    }
    
    mapping(address => TokenConfig) public tokenConfigs;
    address[] public supportedTokens;
    
    event TokenAdded(address indexed token, bool isCollateral, uint256 ltvBP, uint256 ltBP, uint256 bonusBP);
    event TokenRemoved(address indexed token);
    event TokenConfigUpdated(address indexed token, uint256 ltvBP, uint256 ltBP, uint256 bonusBP);
    
    constructor(address _oracle) {
        oracle = MockOracle(_oracle);
    }
    
    modifier onlySupportedToken(address token) {
        require(tokenConfigs[token].isSupported, "Token not supported");
        _;
    }
    
    function addToken(
        address token,
        bool isCollateral,
        uint256 ltvBP,
        uint256 ltBP,
        uint256 bonusBP
    ) external {
        require(!tokenConfigs[token].isSupported, "Token already supported");
        require(ltvBP <= 10000, "Invalid LTV");
        require(ltBP <= 10000, "Invalid liquidation threshold");
        require(bonusBP <= 10000, "Invalid liquidation bonus");
        require(ltBP >= ltvBP, "Liquidation threshold must be >= LTV");
        
        tokenConfigs[token] = TokenConfig({
            isSupported: true,
            isCollateral: isCollateral,
            ltvBP: ltvBP,
            ltBP: ltBP,
            bonusBP: bonusBP
        });
        
        supportedTokens.push(token);
        emit TokenAdded(token, isCollateral, ltvBP, ltBP, bonusBP);
    }
    
    function removeToken(address token) external {
        require(tokenConfigs[token].isSupported, "Token not supported");
        tokenConfigs[token].isSupported = false;
        emit TokenRemoved(token);
    }
    
    function updateTokenConfig(
        address token, 
        uint256 ltvBP, 
        uint256 ltBP, 
        uint256 bonusBP
    ) external {
        require(tokenConfigs[token].isSupported, "Token not supported");
        require(ltvBP <= 10000, "Invalid LTV");
        require(ltBP <= 10000, "Invalid liquidation threshold");
        require(bonusBP <= 10000, "Invalid liquidation bonus");
        require(ltBP >= ltvBP, "Liquidation threshold must be >= LTV");
        
        tokenConfigs[token].ltvBP = ltvBP;
        tokenConfigs[token].ltBP = ltBP;
        tokenConfigs[token].bonusBP = bonusBP;
        emit TokenConfigUpdated(token, ltvBP, ltBP, bonusBP);
    }
    
    function getTokenPrice(address token) public view returns (int256) {
        return oracle.getPrice(token);
    }
    
    function getTokenValue(address token, uint256 amount) public view returns (uint256) {
        int256 price = getTokenPrice(token);
        require(price > 0, "Invalid price");
        // Convert from 1e8 (oracle) to WAD value (1e18)
        // amount is in token units (1e18 for WETH, 1e6 for USDC)
        // price is in 1e8 format
        // result should be in WAD (1e18 format)
        // Formula: (amount * price) / (10^decimals) * (10^18) / (10^8)
        // To avoid overflow: (amount / 10^decimals) * price * 10^10
        uint256 tokenDecimals = 10 ** IERC20Metadata(token).decimals();
        return (amount / tokenDecimals) * uint256(price) * 1e10;
    }
    
    function calculateBorrowableValue(
        address[] memory tokens,
        uint256[] memory amounts
    ) public view returns (uint256 totalValue) {
        require(tokens.length == amounts.length, "Array length mismatch");
        
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokenConfigs[tokens[i]].isCollateral) {
                uint256 tokenValue = getTokenValue(tokens[i], amounts[i]);
                uint256 borrowableValue = (tokenValue * tokenConfigs[tokens[i]].ltvBP) / 10000;
                totalValue += borrowableValue;
            }
        }
    }
    
    function calculateCollateralValueForHF(
        address[] memory tokens,
        uint256[] memory amounts
    ) public view returns (uint256 totalValue) {
        require(tokens.length == amounts.length, "Array length mismatch");
        
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokenConfigs[tokens[i]].isCollateral) {
                uint256 tokenValue = getTokenValue(tokens[i], amounts[i]);
                uint256 collateralValue = (tokenValue * tokenConfigs[tokens[i]].ltBP) / 10000;
                totalValue += collateralValue;
            }
        }
    }
    
    function calculateBorrowValue(
        address[] memory tokens,
        uint256[] memory amounts
    ) public view returns (uint256 totalValue) {
        require(tokens.length == amounts.length, "Array length mismatch");
        
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 tokenValue = getTokenValue(tokens[i], amounts[i]);
            totalValue += tokenValue;
        }
    }
    
    function calculateHealthFactor(
        address[] memory collateralTokens,
        uint256[] memory collateralAmounts,
        address[] memory borrowTokens,
        uint256[] memory borrowAmounts
    ) public view returns (uint256 healthFactor) {
        uint256 collateralValue = calculateCollateralValueForHF(collateralTokens, collateralAmounts);
        uint256 borrowValue = calculateBorrowValue(borrowTokens, borrowAmounts);
        
        if (borrowValue == 0) {
            return type(uint256).max; // Infinite health factor when no debt
        }
        
        // Health Factor = Σ(collUSD_i * LT_i) / Σ(borrowUSD_j) in WAD format
        // Both collateralValue and borrowValue are in WAD (1e18) format
        // Need to multiply by WAD to get WAD result: (WAD * WAD) / WAD = WAD
        healthFactor = (collateralValue * WAD) / borrowValue;
    }
    
    function calculateHealthFactorWAD(
        address[] memory collateralTokens,
        uint256[] memory collateralAmounts,
        address[] memory borrowTokens,
        uint256[] memory borrowAmounts
    ) public view returns (uint256 healthFactorWAD) {
        return calculateHealthFactor(collateralTokens, collateralAmounts, borrowTokens, borrowAmounts);
    }
    
    function isLiquidatable(
        address[] memory collateralTokens,
        uint256[] memory collateralAmounts,
        address[] memory borrowTokens,
        uint256[] memory borrowAmounts
    ) public view returns (bool) {
        uint256 healthFactor = calculateHealthFactor(
            collateralTokens,
            collateralAmounts,
            borrowTokens,
            borrowAmounts
        );
        return healthFactor < (LIQUIDATION_THRESHOLD * WAD) / 10000;
    }
    
    function isHealthy(
        address[] memory collateralTokens,
        uint256[] memory collateralAmounts,
        address[] memory borrowTokens,
        uint256[] memory borrowAmounts
    ) public view returns (bool) {
        uint256 healthFactor = calculateHealthFactor(
            collateralTokens,
            collateralAmounts,
            borrowTokens,
            borrowAmounts
        );
        return healthFactor >= MIN_HEALTH_FACTOR;
    }
    
    function calculateBorrowRate(uint256 utilization) public pure returns (uint256) {
        if (utilization <= OPTIMAL_UTILIZATION) {
            return BASE_RATE + (utilization * RATE_SLOPE_1) / OPTIMAL_UTILIZATION;
        } else {
            uint256 excessUtilization = utilization - OPTIMAL_UTILIZATION;
            return BASE_RATE + RATE_SLOPE_1 + (excessUtilization * RATE_SLOPE_2) / (10000 - OPTIMAL_UTILIZATION);
        }
    }
    
    function calculateSupplyRate(uint256 utilization, uint256 borrowRate) public pure returns (uint256) {
        return (borrowRate * utilization) / 10000;
    }
    
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }
    
    function getTokenConfig(address token) external view returns (TokenConfig memory) {
        return tokenConfigs[token];
    }
}
