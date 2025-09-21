const { ethers } = require('hardhat');

async function main() {
  console.log('🚀 Deploying all tokens with withdraw functionality...');
  
  const [deployer] = await ethers.getSigners();
  console.log('📝 Deploying with account:', deployer.address);
  
  // Deploy WETH with withdraw (thay thế WETH cũ)
  console.log('\n🪙 Deploying WETH...');
  const WETH = await ethers.getContractFactory('TokenWithWithdraw');
  const weth = await WETH.deploy(
    'Wrapped Ether',
    'WETH',
    18,
    0 // Không mint ban đầu, chỉ deposit/withdraw
  );
  await weth.waitForDeployment();
  const wethAddress = await weth.getAddress();
  console.log('✅ WETH deployed at:', wethAddress);

  // Deploy DAI with withdraw
  console.log('\n🪙 Deploying DAI...');
  const DAI = await ethers.getContractFactory('TokenWithWithdraw');
  const dai = await DAI.deploy(
    'Dai Stablecoin',
    'DAI', 
    18,
    1000000 // 1M initial supply
  );
  await dai.waitForDeployment();
  const daiAddress = await dai.getAddress();
  console.log('✅ DAI deployed at:', daiAddress);
  
  // Deploy USDC with withdraw
  console.log('\n🪙 Deploying USDC...');
  const USDC = await ethers.getContractFactory('TokenWithWithdraw');
  const usdc = await USDC.deploy(
    'USD Coin',
    'USDC',
    6, // USDC has 6 decimals
    1000000 // 1M initial supply
  );
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log('✅ USDC deployed at:', usdcAddress);
  
  // Deploy LINK with withdraw
  console.log('\n🪙 Deploying LINK...');
  const LINK = await ethers.getContractFactory('TokenWithWithdraw');
  const link = await LINK.deploy(
    'Chainlink Token',
    'LINK',
    18,
    1000000 // 1M initial supply
  );
  await link.waitForDeployment();
  const linkAddress = await link.getAddress();
  console.log('✅ LINK deployed at:', linkAddress);
  
  // Test withdraw functionality
  console.log('\n🧪 Testing withdraw functionality...');
  
  try {
    // Test DAI withdraw
    console.log('Testing DAI withdraw...');
    const daiBalance = await dai.balanceOf(deployer.address);
    console.log('DAI balance:', ethers.formatEther(daiBalance));
    
    // Add some ETH to contract for withdrawals
    await dai.addLiquidity({ value: ethers.parseEther('10') });
    console.log('Added 10 ETH to DAI contract for withdrawals');
    
    // Test withdraw 1 DAI
    const withdrawTx = await dai.withdraw(ethers.parseEther('1'));
    await withdrawTx.wait();
    console.log('✅ DAI withdraw test successful!');
    
  } catch (error) {
    console.error('❌ Withdraw test failed:', error.message);
  }
  
  // Update addresses.js
  console.log('\n📝 Updating addresses.js...');
  const fs = require('fs');
  const path = require('path');
  const addressesPath = path.join(__dirname, '..', 'lendhub-frontend-nextjs', 'src', 'addresses.js');
  
  const addressesContent = `// Contract addresses (auto-updated by deploy script)
export const ETHAddress = "0x0000000000000000000000000000000000000000";
export const LendingPoolAddress = "0x6A390857c83B00c915101ba92e85390F3D092Da4";
export const InterestRateModelAddress = "0x886B0BCCAa9787e6253A34FCbb0B0C41515fC1ad";
export const LendingHelperAddress = "0x0000000000000000000000000000000000000000"; // Not deployed
export const WETHAddress = "${wethAddress}";
export const DAIAddress = "${daiAddress}";
export const USDCAddress = "${usdcAddress}";
export const LINKAddress = "${linkAddress}";
export const PriceOracleAddress = "0xd49Ffcb8507478C3b35886a0A6F7a0C75eC730e0";
export const MockV3AggregatorAddress = "0x3814c61Cdd91708fc8391AF266Bf1e28CB2a43a5";
`;
  
  fs.writeFileSync(addressesPath, addressesContent);
  console.log('✅ Updated addresses.js');
  
  console.log('\n🎉 All tokens deployed with withdraw functionality!');
  console.log('\n📍 Token addresses:');
  console.log(`WETH: ${wethAddress}`);
  console.log(`DAI:  ${daiAddress}`);
  console.log(`USDC: ${usdcAddress}`);
  console.log(`LINK: ${linkAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
