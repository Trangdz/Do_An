const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Testing 5-Step Debug Helper for Missing Revert Data");
  console.log("=====================================================");

  // Get signers
  const [deployer, user] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("User:", user.address);

  // Contract addresses (update these with your deployed addresses)
  const LendingPoolAddress = "0x39964b80eB2706667A95418542109390cf5327e8";
  const USDCAddress = "0x3BbaD74725bb4c2B8c03f66e4FF4d70b7b1A0FCf";

  // Create contracts
  const poolContract = new ethers.Contract(
    LendingPoolAddress,
    [
      'function repay(address asset, uint256 amount, address onBehalfOf) external returns (uint256)',
      'function getBorrowBalance(address user, address asset) external view returns (uint256)',
      'function userReserves(address user, address asset) external view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)'
    ],
    user
  );

  const usdcContract = new ethers.Contract(
    USDCAddress,
    [
      'function approve(address spender, uint256 amount) external returns (bool)',
      'function allowance(address owner, address spender) external view returns (uint256)',
      'function balanceOf(address account) external view returns (uint256)'
    ],
    user
  );

  try {
    // Step 1: Run callStatic.repay(amount) to catch exact revert point
    console.log("\n🔍 Step 1: callStatic.repay() - Catch exact revert point");
    console.log("---------------------------------------------------");
    
    const testAmount = ethers.parseUnits("100", 6); // 100 USDC
    
    try {
      await poolContract.callStatic.repay(USDCAddress, testAmount, user.address);
      console.log("✅ callStatic.repay() succeeded - no revert detected");
    } catch (callStaticError) {
      console.log("❌ callStatic.repay() failed:", callStaticError.message);
    }

    // Step 2: Log debtRaw, allowanceRaw, balanceRaw, amountRaw before sending
    console.log("\n🔍 Step 2: Log all raw values before sending");
    console.log("---------------------------------------------");
    
    const [debtRaw, allowanceRaw, balanceRaw] = await Promise.all([
      poolContract.getBorrowBalance(user.address, USDCAddress),
      usdcContract.allowance(user.address, LendingPoolAddress),
      usdcContract.balanceOf(user.address)
    ]);

    const logData = {
      debtRaw: debtRaw.toString(),
      allowanceRaw: allowanceRaw.toString(),
      balanceRaw: balanceRaw.toString(),
      amountRaw: testAmount.toString(),
      debtHuman: ethers.formatUnits(debtRaw, 6),
      allowanceHuman: ethers.formatUnits(allowanceRaw, 6),
      balanceHuman: ethers.formatUnits(balanceRaw, 6),
      amountHuman: ethers.formatUnits(testAmount, 6)
    };

    console.log("Raw values:", logData);

    // Step 3: If amountRaw > allowanceRaw: auto-approve and retry
    console.log("\n🔍 Step 3: Auto-approve if amount > allowance");
    console.log("----------------------------------------------");
    
    if (testAmount > allowanceRaw) {
      console.log(`Amount (${testAmount.toString()}) > Allowance (${allowanceRaw.toString()})`);
      console.log("Auto-approving...");
      
      try {
        const approveTx = await usdcContract.approve(LendingPoolAddress, testAmount);
        await approveTx.wait();
        console.log("✅ Auto-approval successful");
        
        const newAllowance = await usdcContract.allowance(user.address, LendingPoolAddress);
        console.log("New allowance:", newAllowance.toString());
      } catch (approveError) {
        console.log("❌ Auto-approval failed:", approveError.message);
      }
    } else {
      console.log(`Amount (${testAmount.toString()}) <= Allowance (${allowanceRaw.toString()}) - no approval needed`);
    }

    // Step 4: If amountRaw > balanceRaw: cap to balanceRaw or show UX error
    console.log("\n🔍 Step 4: Balance check - cap if amount > balance");
    console.log("--------------------------------------------------");
    
    if (testAmount > balanceRaw) {
      console.log(`Amount (${testAmount.toString()}) > Balance (${balanceRaw.toString()})`);
      const cappedAmount = balanceRaw;
      console.log(`Amount capped to balance: ${cappedAmount.toString()}`);
    } else {
      console.log(`Amount (${testAmount.toString()}) <= Balance (${balanceRaw.toString()}) - no capping needed`);
    }

    // Step 5: If using MaxUint256, retry with debtRaw + 1 wei
    console.log("\n🔍 Step 5: MaxUint256 fallback check");
    console.log("------------------------------------");
    
    if (testAmount === ethers.MaxUint256) {
      console.log("MaxUint256 detected, retrying with debtRaw + 1 wei");
      const fallbackAmount = debtRaw + 1n;
      console.log(`Fallback amount: ${fallbackAmount.toString()}`);
    } else {
      console.log(`Amount (${testAmount.toString()}) is not MaxUint256 - no fallback needed`);
    }

    // Final gas estimation attempt
    console.log("\n🔍 Final gas estimation attempt");
    console.log("-------------------------------");
    
    try {
      const gasEstimate = await poolContract.repay.estimateGas(USDCAddress, testAmount, user.address);
      console.log("✅ Gas estimation successful:", gasEstimate.toString());
    } catch (gasError) {
      console.log("❌ Gas estimation failed:", gasError.message);
      
      // Try with different amounts
      console.log("\n🔄 Trying alternative amounts...");
      
      // Try with debt amount
      try {
        const debtGasEstimate = await poolContract.repay.estimateGas(USDCAddress, debtRaw, user.address);
        console.log("✅ Gas estimation with debt amount successful:", debtGasEstimate.toString());
      } catch (debtGasError) {
        console.log("❌ Gas estimation with debt amount failed:", debtGasError.message);
      }
      
      // Try with MaxUint256
      try {
        const maxGasEstimate = await poolContract.repay.estimateGas(USDCAddress, ethers.MaxUint256, user.address);
        console.log("✅ Gas estimation with MaxUint256 successful:", maxGasEstimate.toString());
      } catch (maxGasError) {
        console.log("❌ Gas estimation with MaxUint256 failed:", maxGasError.message);
      }
    }

    console.log("\n🎉 Debug helper test completed!");

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
