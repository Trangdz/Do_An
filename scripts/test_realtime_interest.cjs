// Test realtime interest accrual
const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Testing with account:", signer.address);
  
  // Use addresses from contract deployment
  const LendingPoolAddress = "0x56328671A331a3563e86C4CC53b5E1945733A3E3";
  const USDC_ADDRESS = "0x92c2Dc1Fc29b180de2dA0FdB217823D939b6E0A5";
  const WETH_ADDRESS = "0x7e1600E50472a5850A295cB8eeEB5C323c1f6254";
  
  console.log("\n📊 Testing Realtime Interest Accrual");
  console.log("=" .repeat(50));
  console.log("Pool Address:", LendingPoolAddress);
  console.log("USDC Address:", USDC_ADDRESS);
  
  const pool = new ethers.Contract(
    LendingPoolAddress,
    [
      'function userReserves(address user, address asset) view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)',
      'function liquidityIndex(address asset) view returns (uint128)',
    ],
    signer
  );
  
  console.log("\n1️⃣ Checking if pool is accessible...");
  try {
    // Test basic call
    const liquidityIndex = await pool.liquidityIndex(USDC_ADDRESS);
    console.log("✅ Pool is accessible");
    console.log("   Liquidity Index:", ethers.formatUnits(liquidityIndex, 18));
    
    // Get user reserves
    console.log("\n2️⃣ Getting user reserves...");
    const userReserve = await pool.userReserves(signer.address, USDC_ADDRESS);
    
    console.log("📊 User Reserves:");
    console.log("   Supply Principal:", ethers.formatUnits(userReserve.supply.principal, 18));
    console.log("   Supply Index:", ethers.formatUnits(userReserve.supply.index, 18));
    console.log("   Borrow Principal:", ethers.formatUnits(userReserve.borrow.principal, 18));
    console.log("   Borrow Index:", ethers.formatUnits(userReserve.borrow.index, 18));
    console.log("   Is Collateral:", userReserve.useAsCollateral);
    
    // Calculate current balance
    const principal = parseFloat(ethers.formatUnits(userReserve.supply.principal, 18));
    const snapshotIndex = parseFloat(ethers.formatUnits(userReserve.supply.index, 18));
    const currentIndex = parseFloat(ethers.formatUnits(liquidityIndex, 18));
    
    if (principal > 0 && snapshotIndex > 0) {
      const currentBalance = principal * (currentIndex / snapshotIndex);
      
      console.log("\n3️⃣ Calculating Current Balance:");
      console.log("   Current Balance = Principal × (CurrentIndex / SnapshotIndex)");
      console.log(`   Current Balance = ${principal} × (${currentIndex} / ${snapshotIndex})`);
      console.log(`   Current Balance = ${currentBalance.toFixed(6)} USDC`);
      
      if (currentBalance > principal) {
        const interest = currentBalance - principal;
        const interestRate = (interest / principal) * 100;
        console.log("\n✅ INTEREST IS ACCRUING!");
        console.log(`   Interest earned: ${interest.toFixed(6)} USDC`);
        console.log(`   Interest rate: ${interestRate.toFixed(4)}%`);
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.code === 'CALL_EXCEPTION') {
      console.error("   Pool address might be wrong or contract not deployed");
    }
  }
}

main().catch(console.error);

