// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../contracts/core/LendingPool.sol";
import "../contracts/mocks/ERC20Mock.sol";
import "../contracts/mocks/MockV3Aggregator.sol";
import "../contracts/core/InterestRateModel.sol";
import "../contracts/core/PriceOracle.sol";

contract RepayDustTest is Test {
    LendingPool public pool;
    ERC20Mock public usdc;
    MockV3Aggregator public priceFeed;
    InterestRateModel public rateModel;
    PriceOracle public oracle;
    
    address public user = address(0x1);
    address public admin = address(0x2);
    
    uint256 public constant USDC_DECIMALS = 6;
    uint256 public constant BORROW_AMOUNT = 3_000_000; // 3 USDC in raw units
    uint256 public constant BORROW_AMOUNT_HUMAN = 3; // 3 USDC in human units
    
    event Repay(address indexed user, address indexed onBehalfOf, address indexed asset, uint256 actualPaidRaw, bool isFull);
    event Repaid(address indexed user, address indexed onBehalfOf, address indexed asset, uint256 amount);
    
    function setUp() public {
        // Deploy contracts
        usdc = new ERC20Mock("USD Coin", "USDC", USDC_DECIMALS);
        priceFeed = new MockV3Aggregator(8, 1e8); // $1 price
        rateModel = new InterestRateModel();
        oracle = new PriceOracle();
        pool = new LendingPool(address(oracle), address(rateModel));
        
        // Setup oracle
        oracle.setAssetPrice(address(usdc), address(priceFeed));
        
        // Setup pool
        pool.initializeReserve(address(usdc), USDC_DECIMALS, true, true);
        
        // Mint tokens
        usdc.mint(admin, 1_000_000 * 10**USDC_DECIMALS); // 1M USDC
        usdc.mint(user, 100 * 10**USDC_DECIMALS); // 100 USDC for user
        
        // Admin supplies liquidity
        vm.startPrank(admin);
        usdc.approve(address(pool), type(uint256).max);
        pool.lend(address(usdc), 100_000 * 10**USDC_DECIMALS); // 100K USDC
        vm.stopPrank();
        
        // User supplies WETH as collateral and borrows USDC
        vm.startPrank(user);
        // First supply some USDC to have balance for borrowing
        usdc.approve(address(pool), type(uint256).max);
        pool.lend(address(usdc), 10 * 10**USDC_DECIMALS); // 10 USDC
        
        // Borrow 3 USDC
        pool.borrow(address(usdc), BORROW_AMOUNT);
        vm.stopPrank();
    }
    
    function testRepayDustIssue() public {
        console.log("=== Test A: Repay exact human amount (should leave dust) ===");
        
        // Get initial debt
        uint256 initialDebt = pool.getBorrowBalance(user, address(usdc));
        console.log("Initial debt (raw):", initialDebt);
        console.log("Initial debt (human):", initialDebt / 10**USDC_DECIMALS);
        
        // Advance time to accrue interest
        vm.warp(block.timestamp + 1 days);
        vm.roll(block.number + 100);
        
        // Get debt after interest accrual
        uint256 debtAfterInterest = pool.getBorrowBalance(user, address(usdc));
        console.log("Debt after interest (raw):", debtAfterInterest);
        console.log("Debt after interest (human):", debtAfterInterest / 10**USDC_DECIMALS);
        console.log("Interest accrued:", debtAfterInterest - initialDebt);
        
        // User tries to repay exact human amount (3 USDC)
        vm.startPrank(user);
        usdc.approve(address(pool), type(uint256).max);
        
        uint256 repayAmount = BORROW_AMOUNT; // 3 USDC in raw units
        console.log("Attempting to repay (raw):", repayAmount);
        console.log("Attempting to repay (human):", repayAmount / 10**USDC_DECIMALS);
        
        // This should leave dust because we're not accounting for interest
        pool.repay(address(usdc), repayAmount, user);
        vm.stopPrank();
        
        // Check remaining debt
        uint256 remainingDebt = pool.getBorrowBalance(user, address(usdc));
        console.log("Remaining debt after exact repay (raw):", remainingDebt);
        console.log("Remaining debt after exact repay (human):", remainingDebt / 10**USDC_DECIMALS);
        
        // Should have dust remaining
        assertGt(remainingDebt, 0, "Should have dust remaining");
        console.log("✅ Dust issue reproduced - remaining debt:", remainingDebt);
    }
    
    function testRepayMaxUint256() public {
        console.log("=== Test B: Repay MaxUint256 (should clear debt) ===");
        
        // Advance time to accrue interest
        vm.warp(block.timestamp + 1 days);
        vm.roll(block.number + 100);
        
        uint256 debtBefore = pool.getBorrowBalance(user, address(usdc));
        console.log("Debt before MaxUint256 repay (raw):", debtBefore);
        
        vm.startPrank(user);
        usdc.approve(address(pool), type(uint256).max);
        
        // Expect Repay event
        vm.expectEmit(true, true, true, true);
        emit Repay(user, user, address(usdc), debtBefore, true);
        
        pool.repay(address(usdc), type(uint256).max, user);
        vm.stopPrank();
        
        uint256 debtAfter = pool.getBorrowBalance(user, address(usdc));
        console.log("Debt after MaxUint256 repay (raw):", debtAfter);
        
        // Should be zero
        assertEq(debtAfter, 0, "Debt should be zero after MaxUint256 repay");
        console.log("✅ MaxUint256 repay successful - debt cleared");
    }
    
    function testRepayDebtPlusOne() public {
        console.log("=== Test C: Repay debt + 1 wei (should clear debt) ===");
        
        // Advance time to accrue interest
        vm.warp(block.timestamp + 1 days);
        vm.roll(block.number + 100);
        
        uint256 currentDebt = pool.getBorrowBalance(user, address(usdc));
        console.log("Current debt (raw):", currentDebt);
        
        uint256 repayAmount = currentDebt + 1;
        console.log("Attempting to repay debt + 1 wei (raw):", repayAmount);
        
        vm.startPrank(user);
        usdc.approve(address(pool), type(uint256).max);
        
        // Expect Repay event
        vm.expectEmit(true, true, true, true);
        emit Repay(user, user, address(usdc), currentDebt, true);
        
        pool.repay(address(usdc), repayAmount, user);
        vm.stopPrank();
        
        uint256 debtAfter = pool.getBorrowBalance(user, address(usdc));
        console.log("Debt after debt+1 repay (raw):", debtAfter);
        
        // Should be zero
        assertEq(debtAfter, 0, "Debt should be zero after debt+1 repay");
        console.log("✅ Debt+1 repay successful - debt cleared");
    }
    
    function testRepayExactDebt() public {
        console.log("=== Test D: Repay exact current debt (should clear debt) ===");
        
        // Advance time to accrue interest
        vm.warp(block.timestamp + 1 days);
        vm.roll(block.number + 100);
        
        uint256 currentDebt = pool.getBorrowBalance(user, address(usdc));
        console.log("Current debt (raw):", currentDebt);
        
        vm.startPrank(user);
        usdc.approve(address(pool), type(uint256).max);
        
        // Expect Repay event
        vm.expectEmit(true, true, true, true);
        emit Repay(user, user, address(usdc), currentDebt, true);
        
        pool.repay(address(usdc), currentDebt, user);
        vm.stopPrank();
        
        uint256 debtAfter = pool.getBorrowBalance(user, address(usdc));
        console.log("Debt after exact repay (raw):", debtAfter);
        
        // Should be zero
        assertEq(debtAfter, 0, "Debt should be zero after exact repay");
        console.log("✅ Exact debt repay successful - debt cleared");
    }
    
    function testRepayPartial() public {
        console.log("=== Test E: Partial repay (should not clear debt) ===");
        
        // Advance time to accrue interest
        vm.warp(block.timestamp + 1 days);
        vm.roll(block.number + 100);
        
        uint256 currentDebt = pool.getBorrowBalance(user, address(usdc));
        console.log("Current debt (raw):", currentDebt);
        
        uint256 partialAmount = currentDebt / 2; // Repay half
        console.log("Partial repay amount (raw):", partialAmount);
        
        vm.startPrank(user);
        usdc.approve(address(pool), type(uint256).max);
        
        // Expect Repay event with isFull=false
        vm.expectEmit(true, true, true, true);
        emit Repay(user, user, address(usdc), partialAmount, false);
        
        pool.repay(address(usdc), partialAmount, user);
        vm.stopPrank();
        
        uint256 debtAfter = pool.getBorrowBalance(user, address(usdc));
        console.log("Debt after partial repay (raw):", debtAfter);
        
        // Should not be zero
        assertGt(debtAfter, 0, "Debt should remain after partial repay");
        assertEq(debtAfter, currentDebt - partialAmount, "Debt should be reduced by partial amount");
        console.log("✅ Partial repay successful - debt reduced but not cleared");
    }
    
    function testRepayZeroDebt() public {
        console.log("=== Test F: Repay when no debt (should handle gracefully) ===");
        
        // First clear all debt
        vm.startPrank(user);
        usdc.approve(address(pool), type(uint256).max);
        pool.repay(address(usdc), type(uint256).max, user);
        vm.stopPrank();
        
        // Try to repay again
        vm.startPrank(user);
        usdc.approve(address(pool), type(uint256).max);
        
        // Expect Repay event with 0 amount and isFull=true
        vm.expectEmit(true, true, true, true);
        emit Repay(user, user, address(usdc), 0, true);
        
        pool.repay(address(usdc), 1000, user); // Try to repay 1000 wei
        vm.stopPrank();
        
        uint256 debtAfter = pool.getBorrowBalance(user, address(usdc));
        console.log("Debt after zero-debt repay (raw):", debtAfter);
        
        // Should still be zero
        assertEq(debtAfter, 0, "Debt should remain zero");
        console.log("✅ Zero-debt repay handled gracefully");
    }
}
