// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

/**
 * @title InterestRateModel
 * @dev Interest rate model for lending protocol
 * @notice Implements piecewise linear interest rate model with kink
 */
contract InterestRateModel {
    // Interest rate parameters (in WAD format, 1e18 = 100%)
    uint256 public constant BASE_RATE = 0.01e18;      // 1% base rate
    uint256 public constant SLOPE_1 = 0.10e18;        // 10% slope 1
    uint256 public constant SLOPE_2 = 0.60e18;        // 60% slope 2
    uint256 public constant KINK = 0.80e18;           // 80% kink point
    uint256 public constant MAX_RATE = 1.0e18;        // 100% max rate
    
    // WAD constant
    uint256 public constant WAD = 1e18;
    
    /**
     * @dev Calculate interest rates based on utilization
     * @param utilization Utilization rate in WAD format (1e18 = 100%)
     * @param reserveFactor Reserve factor in WAD format (1e18 = 100%)
     * @return borrowRate Borrow rate in WAD format
     * @return supplyRate Supply rate in WAD format
     */
    function rates(uint256 utilization, uint256 reserveFactor) 
        external 
        pure 
        returns (uint256 borrowRate, uint256 supplyRate) 
    {
        require(utilization <= WAD, "Utilization cannot exceed 100%");
        require(reserveFactor <= WAD, "Reserve factor cannot exceed 100%");
        
        // Calculate borrow rate
        if (utilization <= KINK) {
            // U ≤ KINK: borrowRate = BASE + SLOPE1 * (U / KINK)
            borrowRate = BASE_RATE + (SLOPE_1 * utilization) / KINK;
        } else {
            // U > KINK: borrowRate = BASE + SLOPE1 + SLOPE2 * ((U - KINK) / (1 - KINK))
            uint256 excessUtilization = utilization - KINK;
            uint256 excessSlope = (SLOPE_2 * excessUtilization) / (WAD - KINK);
            borrowRate = BASE_RATE + SLOPE_1 + excessSlope;
        }
        
        // Cap borrow rate at MAX_RATE
        if (borrowRate > MAX_RATE) {
            borrowRate = MAX_RATE;
        }
        
        // Calculate supply rate: supplyRate = borrowRate * U * (1 - reserveFactor)
        // This is an approximation - in practice, supply rate should be calculated
        // based on the actual interest earned minus reserves
        supplyRate = (borrowRate * utilization * (WAD - reserveFactor)) / WAD;
        
        // Cap supply rate at borrow rate
        if (supplyRate > borrowRate) {
            supplyRate = borrowRate;
        }
    }
    
    /**
     * @dev Get interest rate parameters
     * @return baseRate Base rate in WAD format
     * @return slope1 Slope 1 in WAD format
     * @return slope2 Slope 2 in WAD format
     * @return kink Kink point in WAD format
     * @return maxRate Maximum rate in WAD format
     */
    function getParameters() external pure returns (
        uint256 baseRate,
        uint256 slope1,
        uint256 slope2,
        uint256 kink,
        uint256 maxRate
    ) {
        return (BASE_RATE, SLOPE_1, SLOPE_2, KINK, MAX_RATE);
    }
    
    /**
     * @dev Calculate utilization rate from total borrows and deposits
     * @param totalBorrows Total amount borrowed
     * @param totalDeposits Total amount deposited
     * @return utilization Utilization rate in WAD format
     */
    function calculateUtilization(uint256 totalBorrows, uint256 totalDeposits) 
        external 
        pure 
        returns (uint256 utilization) 
    {
        if (totalDeposits == 0) {
            return 0;
        }
        
        // utilization = totalBorrows / totalDeposits
        utilization = (totalBorrows * WAD) / totalDeposits;
        
        // Cap at 100%
        if (utilization > WAD) {
            utilization = WAD;
        }
    }
}
