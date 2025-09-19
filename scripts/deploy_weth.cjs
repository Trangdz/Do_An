const { ethers } = require('hardhat');

async function main() {
  console.log('🚀 Deploying WETH contract...');
  
  const WETH = await ethers.getContractFactory('WETH');
  const weth = await WETH.deploy();
  await weth.waitForDeployment();
  
  const wethAddress = await weth.getAddress();
  console.log('✅ WETH deployed at:', wethAddress);
  
  // Test deposit function
  console.log('🔄 Testing deposit function...');
  const [deployer] = await ethers.getSigners();
  
  try {
    const depositTx = await weth.deposit({ value: ethers.parseEther('0.1') });
    await depositTx.wait();
    console.log('✅ Deposit test successful!');
    
    const balance = await weth.balanceOf(deployer.address);
    console.log('📊 WETH balance:', ethers.formatEther(balance));
  } catch (error) {
    console.error('❌ Deposit test failed:', error.message);
  }
  
  console.log('\n📍 Update your frontend with this WETH address:', wethAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
