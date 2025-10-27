const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Oracle on Testnet...");
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Testing with account:", deployer.address);
  
  // Update these addresses after deployment
  const ORACLE_ADDRESS = "YOUR_ORACLE_ADDRESS_HERE";
  const WETH_ADDRESS = "YOUR_WETH_ADDRESS_HERE";
  const USDC_ADDRESS = "YOUR_USDC_ADDRESS_HERE";
  const DAI_ADDRESS = "YOUR_DAI_ADDRESS_HERE";
  
  const oracleABI = [
    'function getAssetPrice1e18(address token) external view returns (uint256)',
    'function getPriceFeed(address token) external view returns (address)'
  ];
  
  const oracle = new ethers.Contract(ORACLE_ADDRESS, oracleABI, deployer);
  
  try {
    console.log("\n📊 Testing Oracle Prices:");
    
    const wethPrice = await oracle.getAssetPrice1e18(WETH_ADDRESS);
    console.log("✅ WETH Price:", ethers.formatEther(wethPrice), "USD");
    
    const usdcPrice = await oracle.getAssetPrice1e18(USDC_ADDRESS);
    console.log("✅ USDC Price:", ethers.formatEther(usdcPrice), "USD");
    
    const daiPrice = await oracle.getAssetPrice1e18(DAI_ADDRESS);
    console.log("✅ DAI Price:", ethers.formatEther(daiPrice), "USD");
    
    console.log("\n🔗 Chainlink Feeds:");
    const wethFeed = await oracle.getPriceFeed(WETH_ADDRESS);
    console.log("✅ WETH Feed:", wethFeed);
    
    const usdcFeed = await oracle.getPriceFeed(USDC_ADDRESS);
    console.log("✅ USDC Feed:", usdcFeed);
    
    const daiFeed = await oracle.getPriceFeed(DAI_ADDRESS);
    console.log("✅ DAI Feed:", daiFeed);
    
    console.log("\n🎉 Oracle test successful!");
    
  } catch (error) {
    console.error("❌ Oracle test failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
