const { ethers } = require("hardhat");

async function main() {
  console.log("🎯 LendHub v1 Demo on Ganache");
  console.log("==============================");

  const [deployer, user1, user2] = await ethers.getSigners();
  
  // Contract addresses (update these after deployment)
  const MOCK_ORACLE = "0x..."; // Update with actual address
  const RISK_MANAGER = "0x..."; // Update with actual address
  const LENDING_POOL = "0x..."; // Update with actual address
  const USDC = "0x..."; // Update with actual address
  const DAI = "0x..."; // Update with actual address
  const WETH = "0x..."; // Update with actual address
  const LINK = "0x..."; // Update with actual address

  console.log("\n👤 Demo Users:");
  console.log(`Deployer: ${deployer.address}`);
  console.log(`User1: ${user1.address}`);
  console.log(`User2: ${user2.address}`);

  // Get contract instances
  const oracle = await ethers.getContractAt("MockOracle", MOCK_ORACLE);
  const riskManager = await ethers.getContractAt("RiskManager", RISK_MANAGER);
  const lendingPool = await ethers.getContractAt("LendingPoolV2", LENDING_POOL);
  const usdc = await ethers.getContractAt("MockToken", USDC);
  const dai = await ethers.getContractAt("MockToken", DAI);
  const weth = await ethers.getContractAt("MockToken", WETH);
  const link = await ethers.getContractAt("MockToken", LINK);

  console.log("\n💰 Token Balances:");
  console.log("==================");
  
  const tokens = [
    { name: "USDC", contract: usdc, decimals: 6 },
    { name: "DAI", contract: dai, decimals: 18 },
    { name: "WETH", contract: weth, decimals: 18 },
    { name: "LINK", contract: link, decimals: 18 }
  ];

  for (const token of tokens) {
    const balance1 = await token.contract.balanceOf(user1.address);
    const balance2 = await token.contract.balanceOf(user2.address);
    const formattedBalance1 = ethers.utils.formatUnits(balance1, token.decimals);
    const formattedBalance2 = ethers.utils.formatUnits(balance2, token.decimals);
    
    console.log(`${token.name}:`);
    console.log(`  User1: ${formattedBalance1}`);
    console.log(`  User2: ${formattedBalance2}`);
  }

  console.log("\n📊 Price Feeds:");
  console.log("===============");
  
  for (const token of tokens) {
    const price = await oracle.getPrice(token.contract.address);
    const formattedPrice = ethers.utils.formatUnits(price, 8); // Oracle uses 8 decimals
    console.log(`${token.name}: $${formattedPrice}`);
  }

  console.log("\n🏦 Pool State:");
  console.log("==============");
  
  for (const token of tokens) {
    const reserve = await lendingPool.getReserve(token.contract.address);
    const totalSupplied = await lendingPool.getTotalSupplied(token.contract.address);
    const totalBorrowed = await lendingPool.getTotalBorrowed(token.contract.address);
    const utilization = await lendingPool.getUtilization(token.contract.address);
    
    console.log(`${token.name}:`);
    console.log(`  Reserve: ${ethers.utils.formatUnits(reserve, token.decimals)}`);
    console.log(`  Total Supplied: ${ethers.utils.formatUnits(totalSupplied, token.decimals)}`);
    console.log(`  Total Borrowed: ${ethers.utils.formatUnits(totalBorrowed, token.decimals)}`);
    console.log(`  Utilization: ${utilization.toString()}%`);
  }

  console.log("\n🎭 Demo Scenarios:");
  console.log("==================");

  // Scenario 1: User1 supplies USDC
  console.log("\n1️⃣ User1 supplies 1000 USDC...");
  const supplyAmount = ethers.utils.parseUnits("1000", 6);
  await usdc.connect(user1).approve(lendingPool.address, supplyAmount);
  await lendingPool.connect(user1).supply(usdc.address, supplyAmount);
  console.log("✅ Supply successful");

  // Scenario 2: User1 supplies DAI
  console.log("\n2️⃣ User1 supplies 1000 DAI...");
  const daiAmount = ethers.utils.parseEther("1000");
  await dai.connect(user1).approve(lendingPool.address, daiAmount);
  await lendingPool.connect(user1).supply(dai.address, daiAmount);
  console.log("✅ Supply successful");

  // Scenario 3: User2 borrows USDC
  console.log("\n3️⃣ User2 borrows 500 USDC...");
  const borrowAmount = ethers.utils.parseUnits("500", 6);
  await lendingPool.connect(user2).borrow(usdc.address, borrowAmount);
  console.log("✅ Borrow successful");

  // Scenario 4: Check health factors
  console.log("\n4️⃣ Checking health factors...");
  const healthFactor1 = await lendingPool.getUserHealthFactor(user1.address);
  const healthFactor2 = await lendingPool.getUserHealthFactor(user2.address);
  
  console.log(`User1 Health Factor: ${healthFactor1.toString()}%`);
  console.log(`User2 Health Factor: ${healthFactor2.toString()}%`);

  // Scenario 5: User2 repays USDC
  console.log("\n5️⃣ User2 repays 200 USDC...");
  const repayAmount = ethers.utils.parseUnits("200", 6);
  await usdc.connect(user2).approve(lendingPool.address, repayAmount);
  await lendingPool.connect(user2).repay(usdc.address, repayAmount);
  console.log("✅ Repay successful");

  // Scenario 6: User1 withdraws DAI
  console.log("\n6️⃣ User1 withdraws 500 DAI...");
  const withdrawAmount = ethers.utils.parseEther("500");
  await lendingPool.connect(user1).withdraw(dai.address, withdrawAmount);
  console.log("✅ Withdraw successful");

  console.log("\n📈 Final State:");
  console.log("===============");
  
  for (const token of tokens) {
    const reserve = await lendingPool.getReserve(token.contract.address);
    const totalSupplied = await lendingPool.getTotalSupplied(token.contract.address);
    const totalBorrowed = await lendingPool.getTotalBorrowed(token.contract.address);
    const utilization = await lendingPool.getUtilization(token.contract.address);
    
    console.log(`${token.name}:`);
    console.log(`  Reserve: ${ethers.utils.formatUnits(reserve, token.decimals)}`);
    console.log(`  Total Supplied: ${ethers.utils.formatUnits(totalSupplied, token.decimals)}`);
    console.log(`  Total Borrowed: ${ethers.utils.formatUnits(totalBorrowed, token.decimals)}`);
    console.log(`  Utilization: ${utilization.toString()}%`);
  }

  console.log("\n🎉 Demo completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
