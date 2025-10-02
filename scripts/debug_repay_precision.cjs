const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n🔍 DEBUG REPAY PRECISION ISSUE\n");

  // Addresses from your error
  const poolAddr = "0xF7d1C7089535760a6c695AAdA6B0fe423450a798";
  const tokenAddr = "0x93af6980c2A5330FfCF48D5c66D2C6E0a05b6101";
  const userAddr = "0xad3c7f74Cc2a883EA2eF12B2a0a7F7C794D27CdC";

  // Connect to contracts
  const pool = await ethers.getContractAt("LendingPool", poolAddr);
  const token = await ethers.getContractAt("ERC20Mock", tokenAddr);

  console.log("📍 Addresses:");
  console.log("Pool:", poolAddr);
  console.log("Token:", tokenAddr);
  console.log("User:", userAddr);

  // Get token info
  const symbol = await token.symbol();
  const decimals = await token.decimals();
  console.log("\n💎 Token Info:");
  console.log("Symbol:", symbol);
  console.log("Decimals:", decimals);

  // Get user balance
  const balance = await token.balanceOf(userAddr);
  console.log("\n👛 User Balance:");
  console.log("Raw:", balance.toString());
  console.log("Human:", ethers.formatUnits(balance, decimals), symbol);

  // Get user reserves
  const userReserve = await pool.userReserves(userAddr, tokenAddr);
  console.log("\n📊 User Reserves (from contract):");
  console.log("Borrow Principal (raw):", userReserve.borrow.principal.toString());
  console.log("Borrow Index:", userReserve.borrow.index.toString());

  // Get borrow balance
  let borrowBalance;
  try {
    borrowBalance = await pool.getBorrowBalance(userAddr, tokenAddr);
    console.log("\n💰 Total Borrow Balance (getBorrowBalance):");
    console.log("Raw (1e18):", borrowBalance.toString());
    console.log("As 1e18:", ethers.formatUnits(borrowBalance, 18));
  } catch (e) {
    console.log("\n❌ getBorrowBalance failed:", e.message);
    borrowBalance = userReserve.borrow.principal;
  }

  // Get reserve data
  const reserveData = await pool.reserves(tokenAddr);
  console.log("\n🏦 Reserve Data:");
  console.log("Reserve Decimals:", reserveData.decimals);
  console.log("Variable Borrow Index:", reserveData.variableBorrowIndex.toString());

  // Calculate correct debt
  console.log("\n🧮 PRECISION ANALYSIS:");
  console.log("─".repeat(60));
  
  // The debt is stored in 1e18 precision internally
  const debtRaw1e18 = borrowBalance;
  console.log("1️⃣ Debt in 1e18:", debtRaw1e18.toString());
  console.log("   As decimal:", ethers.formatUnits(debtRaw1e18, 18));

  // Convert to token decimals
  const conversionFactor = 10n ** BigInt(18 - Number(decimals));
  console.log("\n2️⃣ Conversion factor (10^(18-" + decimals + ")):", conversionFactor.toString());
  
  const debtInTokenDecimals = debtRaw1e18 / conversionFactor;
  console.log("\n3️⃣ Debt in token decimals:");
  console.log("   Raw:", debtInTokenDecimals.toString());
  console.log("   Human:", ethers.formatUnits(debtInTokenDecimals, decimals), symbol);

  // Add 20% buffer
  const buffer = (debtInTokenDecimals * 120n) / 100n;
  console.log("\n4️⃣ With 20% buffer:");
  console.log("   Raw:", buffer.toString());
  console.log("   Human:", ethers.formatUnits(buffer, decimals), symbol);

  // Check if buffer exceeds balance
  console.log("\n5️⃣ Balance check:");
  console.log("   Buffer:", ethers.formatUnits(buffer, decimals), symbol);
  console.log("   Balance:", ethers.formatUnits(balance, decimals), symbol);
  console.log("   Exceeds?", buffer > balance ? "YES ⚠️" : "NO ✅");

  const finalAmount = buffer > balance ? balance : buffer;
  console.log("\n6️⃣ Final repay amount:");
  console.log("   Raw:", finalAmount.toString());
  console.log("   Human:", ethers.formatUnits(finalAmount, decimals), symbol);

  // Test if repay would work
  console.log("\n🧪 Testing repay simulation...");
  try {
    // Impersonate user
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [userAddr],
    });

    const userSigner = await ethers.getSigner(userAddr);

    // Check allowance
    const allowance = await token.allowance(userAddr, poolAddr);
    console.log("\n🔐 Allowance:");
    console.log("   Current:", ethers.formatUnits(allowance, decimals), symbol);
    
    if (allowance < finalAmount) {
      console.log("   Approving...");
      const approveTx = await token.connect(userSigner).approve(poolAddr, finalAmount);
      await approveTx.wait();
      console.log("   ✅ Approved");
    }

    // Try static call first
    console.log("\n🔬 Testing static call...");
    try {
      const result = await pool.connect(userSigner).repay.staticCall(
        tokenAddr,
        finalAmount,
        userAddr
      );
      console.log("   ✅ Static call SUCCESS");
      console.log("   Return value:", result.toString());
    } catch (staticErr) {
      console.log("   ❌ Static call FAILED:", staticErr.message);
      
      // Try with exact principal (no buffer)
      console.log("\n🔬 Trying with EXACT principal (no buffer)...");
      try {
        const result2 = await pool.connect(userSigner).repay.staticCall(
          tokenAddr,
          debtInTokenDecimals,
          userAddr
        );
        console.log("   ✅ EXACT principal works!");
        console.log("   Return value:", result2.toString());
      } catch (exactErr) {
        console.log("   ❌ EXACT principal also failed:", exactErr.message);
      }

      // Try with user's full balance
      console.log("\n🔬 Trying with FULL BALANCE...");
      try {
        const result3 = await pool.connect(userSigner).repay.staticCall(
          tokenAddr,
          balance,
          userAddr
        );
        console.log("   ✅ FULL BALANCE works!");
        console.log("   Return value:", result3.toString());
      } catch (balanceErr) {
        console.log("   ❌ FULL BALANCE also failed:", balanceErr.message);
      }
    }

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [userAddr],
    });

  } catch (err) {
    console.log("❌ Test failed:", err.message);
  }

  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


