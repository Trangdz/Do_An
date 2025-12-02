const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function increaseTime(seconds) {
  await hre.network.provider.send("evm_increaseTime", [seconds]);
  await hre.network.provider.send("evm_mine");
}

function format(amount) {
  return Number(ethers.formatEther(amount));
}

async function main() {
  const [user] = await ethers.getSigners();

  const addressesPath = path.join("lendhub-frontend-nextjs", "src", "addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  const getAddress = (name) => {
    const match = addressesContent.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)";`));
    return match ? match[1] : null;
  };

  const LendingPoolAddress = getAddress("LendingPoolAddress");
  const RewardDistributorAddress = getAddress("RewardDistributorAddress");
  const DAIAddress = getAddress("DAIAddress");

  const lendingPool = await ethers.getContractAt("LendingPool", LendingPoolAddress);
  const rewardDistributor = await ethers.getContractAt("RewardDistributor", RewardDistributorAddress);
  const dai = await ethers.getContractAt("IERC20", DAIAddress);

  console.log("👤 User:", user.address);
  console.log("DAI:", DAIAddress);
  console.log("LendingPool:", LendingPoolAddress);
  console.log("RewardDistributor:", RewardDistributorAddress);
  console.log("=".repeat(80));

  const maxAmount = ethers.parseEther("1000000");

  // Ensure allowance
  const allowance = await dai.allowance(user.address, LendingPoolAddress);
  if (allowance < maxAmount / 10n) {
    console.log("🔧 Approving DAI...");
    const tx = await dai.approve(LendingPoolAddress, maxAmount);
    await tx.wait();
  }

  // Helper to fetch claimable reward
  const getClaimable = async () => {
    const value = await rewardDistributor.getClaimableReward(user.address);
    return value;
  };

  const logClaimable = async (label) => {
    const value = await getClaimable();
    console.log(`${label}: ${format(value)} LENDX`);
    return value;
  };

  console.log("Step 0: Resetting balances");
  const withdrawTx = await lendingPool.withdraw(DAIAddress, maxAmount);
  await withdrawTx.wait();
  console.log("   ✅ Withdrawn all DAI supply");

  await logClaimable("Initial claimable reward");

  // Session 1 - supply, wait, supply again to accumulate
  console.log("\nSession 1: Supply -> Wait -> Supply");
  const supplyAmount = ethers.parseEther("10");
  const tx1 = await lendingPool.lend(DAIAddress, supplyAmount);
  await tx1.wait();
  console.log("   ✅ Supplied 10 DAI");

  console.log("   ⏳ Advancing time by 1 hour...");
  await increaseTime(3600);

  const tx2 = await lendingPool.lend(DAIAddress, ethers.parseEther("0.0001"));
  await tx2.wait();
  console.log("   ✅ Triggered reward update with tiny supply");

  const rewardAfterSession1 = await logClaimable("Reward after Session 1");

  // Withdraw all to finalize session
  const tx3 = await lendingPool.withdraw(DAIAddress, maxAmount);
  await tx3.wait();
  console.log("   ✅ Withdrawn all DAI (balance = 0)");
  const rewardAfterWithdraw = await logClaimable("Reward after withdraw");

  // Idle period with zero balance
  console.log("\nIdle period: No supply, waiting 2 hours...");
  await increaseTime(7200);
  const rewardAfterIdle = await logClaimable("Reward after idle (should match after withdraw)");

  const idleDelta = rewardAfterIdle - rewardAfterWithdraw;
  console.log(`   Δ Reward during idle: ${format(idleDelta)} LENDX`);

  // Session 2 - supply again after idle
  console.log("\nSession 2: Supply after idle period");
  const tx4 = await lendingPool.lend(DAIAddress, ethers.parseEther("5"));
  await tx4.wait();
  console.log("   ✅ Supplied 5 DAI");

  console.log("   ⏳ Advancing time by 1 hour...");
  await increaseTime(3600);

  const tx5 = await lendingPool.lend(DAIAddress, ethers.parseEther("0.0001"));
  await tx5.wait();
  console.log("   ✅ Triggered reward update after session 2");

  const rewardAfterSession2 = await logClaimable("Reward after Session 2");

  const session2Delta = rewardAfterSession2 - rewardAfterIdle;
  console.log(`   Δ Reward Session2: ${format(session2Delta)} LENDX (expected ~5 * 0.001 * 3600 = 18)`);

  // Summary
  console.log("\nSummary:");
  console.log(` - Reward gained in Session 1: ${format(rewardAfterSession1)} LENDX`);
  console.log(` - Reward gained during idle (should be 0): ${format(idleDelta)} LENDX`);
  console.log(` - Reward gained in Session 2: ${format(session2Delta)} LENDX`);
  console.log("\n✅ If idle delta is ~0 and session deltas match expectations, logic works.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });












