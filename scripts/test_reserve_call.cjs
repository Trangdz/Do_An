/**
 * Test calling reserves() function directly
 */

const hre = require("hardhat");

async function main() {
  console.log("🧪 Testing reserves() call...\n");
  
  const ethers = hre.ethers;
  
  // Get addresses
  const addresses = require("../lendhub-frontend-nextjs/src/addresses.js");
  const poolAddress = addresses.LendingPoolAddress;
  const wethAddress = addresses.WETHAddress;
  const daiAddress = addresses.DAIAddress;
  const usdcAddress = addresses.USDCAddress;
  
  console.log("📍 Pool:", poolAddress);
  console.log("📍 WETH:", wethAddress);
  console.log("📍 DAI:", daiAddress);
  console.log("📍 USDC:", usdcAddress);
  
  // Create pool contract
  const poolABI = [
    'function reserves(address) external view returns (uint128, uint128, uint128, uint128, uint64, uint64, uint16, uint16, uint16, uint16, uint16, uint8, bool, uint16, uint64, uint64, uint64, uint40)'
  ];
  
  const provider = ethers.provider;
  const pool = new ethers.Contract(poolAddress, poolABI, provider);
  
  // Test each token
  const tokens = [
    { name: 'WETH', address: wethAddress },
    { name: 'DAI', address: daiAddress },
    { name: 'USDC', address: usdcAddress }
  ];
  
  for (const token of tokens) {
    console.log(`\n📊 Testing ${token.name}...`);
    
    try {
      const reserveData = await pool.reserves(token.address);
      console.log(`✅ Success! Length: ${reserveData.length}`);
      console.log(`   Cash: ${reserveData[0].toString()}`);
      console.log(`   Debt: ${reserveData[1].toString()}`);
      console.log(`   Decimals: ${reserveData[11]}`);
      console.log(`   Base Rate: ${reserveData[14].toString()}`);
    } catch (error) {
      console.error(`❌ Error:`, error.message);
      console.error(`   Code:`, error.code);
      console.error(`   Data:`, error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

