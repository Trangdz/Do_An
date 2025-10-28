// Check balance detail
const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Testing with account:", signer.address);
  
  // Deploy to get current addresses
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const freshUSDC = await ERC20Mock.deploy("USD Coin", "USDC", 6);
  await freshUSDC.waitForDeployment();
  
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const InterestRateModel = await ethers.getContractFactory("InterestRateModel");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  
  const irm = await InterestRateModel.deploy();
  const oracle = await PriceOracle.deploy();
  const pool = await LendingPool.deploy(
    await irm.getAddress(), 
    await oracle.getAddress(),
    "0x0000000000000000000000000000000000000000", // WETH
    "0x0000000000000000000000000000000000000000"  // DAI
  );
  await irm.waitForDeployment();
  await oracle.waitForDeployment();
  await pool.waitForDeployment();
  
  const LendingPoolAddress = await pool.getAddress();
  const USDC_ADDRESS = await freshUSDC.getAddress();
  
  console.log("\n📊 Checking Balance Detail");
  console.log("=" .repeat(50));
  
  const pool = new ethers.Contract(
    LendingPoolAddress,
    [
      'function userReserves(address user, address asset) view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)',
      'function reserves(address asset) view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)',
    ],
    signer
  );
  
  try {
    // Get user reserves
    console.log("\n1️⃣ Getting user reserves...");
    const userReserve = await pool.userReserves(signer.address, USDC_ADDRESS);
    
    console.log("📊 User Reserves:");
    console.log("   Supply Principal:", ethers.formatUnits(userReserve.supply.principal, 18));
    console.log("   Supply Index:", ethers.formatUnits(userReserve.supply.index, 18));
    console.log("   Borrow Principal:", ethers.formatUnits(userReserve.borrow.principal, 18));
    
    // Get reserve data
    console.log("\n2️⃣ Getting reserve data...");
    const reserveData = await pool.reserves(USDC_ADDRESS);
    
    console.log("📊 Reserve Data:");
    console.log("   Reserve Cash:", ethers.formatUnits(reserveData.reserveCash, 18));
    console.log("   Total Debt:", ethers.formatUnits(reserveData.totalDebtPrincipal, 18));
    console.log("   Liquidity Index:", ethers.formatUnits(reserveData.liquidityIndex, 18));
    console.log("   Liquidity Rate (Ray/sec):", ethers.formatUnits(reserveData.liquidityRateRayPerSec, 27));
    
    // Calculate current balance
    if (parseFloat(ethers.formatUnits(userReserve.supply.principal, 18)) > 0) {
      const principal = parseFloat(ethers.formatUnits(userReserve.supply.principal, 18));
      const snapshotIndex = parseFloat(ethers.formatUnits(userReserve.supply.index, 18));
      const currentIndex = parseFloat(ethers.formatUnits(reserveData.liquidityIndex, 18));
      
      console.log("\n3️⃣ Calculating Current Balance:");
      console.log(`   Principal: ${principal.toFixed(6)}`);
      console.log(`   Snapshot Index: ${snapshotIndex.toFixed(18)}`);
      console.log(`   Current Index: ${currentIndex.toFixed(18)}`);
      
      if (snapshotIndex > 0) {
        const currentBalance = principal * (currentIndex / snapshotIndex);
        console.log(`   Current Balance = ${principal} × (${currentIndex} / ${snapshotIndex})`);
        console.log(`   Current Balance = ${currentBalance.toFixed(6)}`);
        
        const interest = currentBalance - principal;
        if (interest > 0) {
          console.log("\n✅ INTEREST ACCRUING!");
          console.log(`   Interest earned: ${interest.toFixed(10)}`);
          console.log(`   APR: ${(interest / principal * 365 * 86400).toFixed(2)}%`);
        } else {
          console.log("\n⚠️ No interest yet (index not increased)");
        }
      } else {
        console.log("\n⚠️ Snapshot index is 0");
      }
    } else {
      console.log("\n⚠️ No supply found. Please supply some USDC first.");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);

