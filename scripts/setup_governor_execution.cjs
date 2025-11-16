const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting up Governor execution with account:", deployer.address);

  // Read addresses
  const addressesPath = path.join(__dirname, "../lendhub-frontend-nextjs/src/addresses.js");
  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  
  // Extract addresses
  const governorMatch = addressesContent.match(/GovernorAddress\s*=\s*"([^"]+)"/);
  const lendingPoolMatch = addressesContent.match(/LendingPoolAddress\s*=\s*"([^"]+)"/);
  const wethMatch = addressesContent.match(/WETHAddress\s*=\s*"([^"]+)"/);
  const daiMatch = addressesContent.match(/DAIAddress\s*=\s*"([^"]+)"/);
  const usdcMatch = addressesContent.match(/USDCAddress\s*=\s*"([^"]+)"/);
  const linkMatch = addressesContent.match(/LINKAddress\s*=\s*"([^"]+)"/);

  if (!governorMatch) {
    console.error("❌ GovernorAddress not found");
    process.exit(1);
  }

  const governorAddress = governorMatch[1];
  const lendingPoolAddress = lendingPoolMatch ? lendingPoolMatch[1] : null;
  const wethAddress = wethMatch ? wethMatch[1] : null;
  const daiAddress = daiMatch ? daiMatch[1] : null;
  const usdcAddress = usdcMatch ? usdcMatch[1] : null;
  const linkAddress = linkMatch ? linkMatch[1] : null;

  console.log("\n📋 Found addresses:");
  console.log(`   Governor: ${governorAddress}`);
  console.log(`   LendingPool: ${lendingPoolAddress || "NOT FOUND"}`);
  console.log(`   WETH: ${wethAddress || "NOT FOUND"}`);
  console.log(`   DAI: ${daiAddress || "NOT FOUND"}`);
  console.log(`   USDC: ${usdcAddress || "NOT FOUND"}`);
  console.log(`   LINK: ${linkAddress || "NOT FOUND"}`);

  // Load Governor contract
  const GovernorABI = [
    "function setLendingPool(address _lendingPool) external",
    "function setAssetAddress(string memory symbol, address assetAddress) external",
    "function lendingPool() external view returns (address)",
    "function assetAddresses(string memory) external view returns (address)",
  ];

  const governor = new ethers.Contract(governorAddress, GovernorABI, deployer);

  // Set LendingPool
  if (lendingPoolAddress) {
    console.log("\n🔧 Setting LendingPool address...");
    try {
      const currentLendingPool = await governor.lendingPool();
      if (currentLendingPool.toLowerCase() !== lendingPoolAddress.toLowerCase()) {
        const tx = await governor.setLendingPool(lendingPoolAddress);
        await tx.wait();
        console.log("✅ LendingPool address set:", lendingPoolAddress);
      } else {
        console.log("✅ LendingPool address already set");
      }
    } catch (error) {
      console.error("❌ Error setting LendingPool:", error.message);
    }
  }

  // Set asset addresses
  const assets = [
    { symbol: "WETH", address: wethAddress },
    { symbol: "DAI", address: daiAddress },
    { symbol: "USDC", address: usdcAddress },
    { symbol: "LINK", address: linkAddress },
  ];

  console.log("\n🔧 Setting asset addresses...");
  for (const asset of assets) {
    if (asset.address) {
      try {
        const currentAddress = await governor.assetAddresses(asset.symbol);
        if (currentAddress.toLowerCase() !== asset.address.toLowerCase()) {
          const tx = await governor.setAssetAddress(asset.symbol, asset.address);
          await tx.wait();
          console.log(`✅ ${asset.symbol} address set: ${asset.address}`);
        } else {
          console.log(`✅ ${asset.symbol} address already set`);
        }
      } catch (error) {
        console.error(`❌ Error setting ${asset.symbol}:`, error.message);
      }
    }
  }

  // Set Governor in LendingPool
  if (lendingPoolAddress) {
    console.log("\n🔧 Setting Governor in LendingPool...");
    try {
      const LendingPoolABI = [
        "function setGovernor(address _governor) external",
        "function governor() external view returns (address)",
      ];
      const lendingPool = new ethers.Contract(lendingPoolAddress, LendingPoolABI, deployer);
      
      const currentGovernor = await lendingPool.governor();
      if (currentGovernor.toLowerCase() !== governorAddress.toLowerCase()) {
        const tx = await lendingPool.setGovernor(governorAddress);
        await tx.wait();
        console.log("✅ Governor set in LendingPool:", governorAddress);
      } else {
        console.log("✅ Governor already set in LendingPool");
      }
    } catch (error) {
      console.error("❌ Error setting Governor in LendingPool:", error.message);
    }
  }

  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              ✅ GOVERNOR SETUP COMPLETE                            ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝");
  console.log("\n💡 Governor is now ready to execute proposals!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

