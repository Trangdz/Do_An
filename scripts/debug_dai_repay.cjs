const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n🔍 DEBUG DAI REPAY ISSUE\n");

  const poolAddr = "0x0bf27f718F954fAd9D953Fb25B2618D007754d3F";
  const daiAddr = "0x25C2a25394265aD84aDC71FBF4E67d42826A9Ad9";
  const userAddr = "0x206A2343F5483ab7E803DeEE0B00176B472eFAa0";
  const repayAmount = BigInt("468000000319634716087");

  console.log("Pool:", poolAddr);
  console.log("DAI:", daiAddr);
  console.log("User:", userAddr);
  console.log("Repay amount:", ethers.formatUnits(repayAmount, 18), "DAI");

  // Connect
  const pool = await ethers.getContractAt("LendingPool", poolAddr);
  const dai = await ethers.getContractAt("ERC20Mock", daiAddr);

  // Check user balance
  const balance = await dai.balanceOf(userAddr);
  console.log("\n👛 User DAI balance:", ethers.formatUnits(balance, 18));

  // Check user debt
  const userReserve = await pool.userReserves(userAddr, daiAddr);
  console.log("\n📊 User reserves:");
  console.log("Borrow principal (1e18):", userReserve.borrow.principal.toString());
  console.log("Borrow principal (human):", ethers.formatUnits(userReserve.borrow.principal, 18));

  // Check allowance
  const allowance = await dai.allowance(userAddr, poolAddr);
  console.log("\n🔐 Allowance:", ethers.formatUnits(allowance, 18), "DAI");

  // Check reserve data
  const reserveData = await pool.reserves(daiAddr);
  console.log("\n🏦 Reserve data:");
  console.log("Is initialized:", reserveData.isActive);
  console.log("Decimals:", reserveData.decimals);
  console.log("Reserve cash:", ethers.formatUnits(reserveData.reserveCash, 18));

  // Analysis
  console.log("\n🔬 ANALYSIS:");
  console.log("─".repeat(60));
  
  if (balance < repayAmount) {
    console.log("❌ INSUFFICIENT BALANCE!");
    console.log("   Need:", ethers.formatUnits(repayAmount, 18), "DAI");
    console.log("   Have:", ethers.formatUnits(balance, 18), "DAI");
    console.log("   Missing:", ethers.formatUnits(repayAmount - balance, 18), "DAI");
  } else {
    console.log("✅ Balance sufficient");
  }

  if (allowance < repayAmount) {
    console.log("❌ INSUFFICIENT ALLOWANCE!");
    console.log("   Need:", ethers.formatUnits(repayAmount, 18), "DAI");
    console.log("   Have:", ethers.formatUnits(allowance, 18), "DAI");
  } else {
    console.log("✅ Allowance sufficient");
  }

  if (userReserve.borrow.principal === 0n) {
    console.log("❌ NO DEBT to repay!");
  } else {
    console.log("✅ Has debt:", ethers.formatUnits(userReserve.borrow.principal, 18), "DAI");
  }

  // Try simulation
  console.log("\n🧪 Trying simulation...");
  try {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [userAddr],
    });

    const userSigner = await ethers.getSigner(userAddr);
    
    // Try with actual amount
    try {
      const result = await pool.connect(userSigner).repay.staticCall(
        daiAddr,
        repayAmount,
        userAddr
      );
      console.log("✅ STATIC CALL SUCCESS");
      console.log("   Return value:", result.toString());
    } catch (err) {
      console.log("❌ STATIC CALL FAILED:", err.message);
      
      // Try with smaller amount
      const smallAmount = ethers.parseUnits("1", 18);
      try {
        const result2 = await pool.connect(userSigner).repay.staticCall(
          daiAddr,
          smallAmount,
          userAddr
        );
        console.log("✅ Small amount works:", result2.toString());
      } catch (err2) {
        console.log("❌ Even small amount fails:", err2.message);
      }
    }

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [userAddr],
    });

  } catch (err) {
    console.log("Test error:", err.message);
  }

  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


