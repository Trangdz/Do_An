const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🚀 Redeploying LendingPool without auto-collateral...\n');

  const [deployer] = await ethers.getSigners();
  console.log('📝 Deploying with account:', deployer.address);
  console.log('💰 Account balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n');

  // Deploy InterestRateModel
  console.log('📦 Deploying InterestRateModel...');
  const InterestRateModel = await ethers.getContractFactory('InterestRateModel');
  const interestRateModel = await InterestRateModel.deploy();
  await interestRateModel.waitForDeployment();
  const interestRateModelAddress = await interestRateModel.getAddress();
  console.log('✅ InterestRateModel deployed to:', interestRateModelAddress);

  // Deploy PriceOracle
  console.log('\n📦 Deploying PriceOracle...');
  const PriceOracle = await ethers.getContractFactory('PriceOracle');
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.waitForDeployment();
  const priceOracleAddress = await priceOracle.getAddress();
  console.log('✅ PriceOracle deployed to:', priceOracleAddress);

  // Get WETH and DAI addresses (replace with actual deployed addresses)
  const WETH = '0xF2b48E224A990D10d20E16a94D82fb544460Aa40'; // Update with your WETH
  const DAI = '0x3860b74A29244165837d6913aB229350dd08e4dc'; // Update with your DAI

  // Deploy LendingPool
  console.log('\n📦 Deploying LendingPool...');
  const LendingPool = await ethers.getContractFactory('LendingPool');
  const lendingPool = await LendingPool.deploy(
    interestRateModelAddress,
    priceOracleAddress,
    WETH,
    DAI
  );
  await lendingPool.waitForDeployment();
  const lendingPoolAddress = await lendingPool.getAddress();
  console.log('✅ LendingPool deployed to:', lendingPoolAddress);

  // Save addresses
  const addresses = {
    LendingPool: lendingPoolAddress,
    InterestRateModel: interestRateModelAddress,
    PriceOracle: priceOracleAddress,
    WETH: WETH,
    DAI: DAI,
  };

  console.log('\n📝 Saving addresses to addresses.js...');
  const addressesFile = path.join(__dirname, '../lendhub-frontend-nextjs/src/addresses.js');
  const content = `// Auto-generated for GANACHE
// Network: http://127.0.0.1:7545 | Chain ID: 1337
// Mnemonic: test test test test test test test test test test test junk

export const ETHAddress = "0x0000000000000000000000000000000000000000";
export const LendingPoolAddress = "${addresses.LendingPool}";
export const InterestRateModelAddress = "${addresses.InterestRateModel}";
export const PriceOracleAddress = "${addresses.PriceOracle}";
export const LendingHelperAddress = "0x0000000000000000000000000000000000000000";
export const WETHAddress = "${addresses.WETH}";
export const DAIAddress = "${addresses.DAI}";
export const USDCAddress = "0xaC6605AaE3eA6D215f19d85dA8865C6bC5C4ce99";
export const LINKAddress = "0xCfB1107E9d553B39BdB1429a8854BfF086941aD8";

// 10 Demo Users (each has 100 WETH, 50K DAI, 50K USDC, 10K LINK)
export const User0Address = "0x57A108aCE172241A878173FcE37c7d6B6a9B5405";
export const User1Address = "0x1da2b1a94a213Ea9949591cE577bA4b3D19ad4f6";
export const User2Address = "0xe62b24d3E9eF5D3Dd10B4f7370560fd5E5ee1a2d";
export const User3Address = "0x5cB4D892e781198d62F999059E342EF60C11149a";
export const User4Address = "0x00E6a01ebe681Dba0957ee88E2064f18BD3a83a0";
export const User5Address = "0x075769d3eFEEc68529ddF4d1e3b3b8e3EF5a1D8f";
export const User6Address = "0x057217d79C4319deBD0352FcfA57891759C91597";
export const User7Address = "0x6D0bd0dFcB21d1aA7c4D938d536d10ab2a60C8FB";
export const User8Address = "0x91be16cFeBA0B82A9e711fC5629337B08b0f38ff";
export const User9Address = "0x681a2903f5685Cc948a4D74F477df7e0cD1504d5";
`;

  fs.writeFileSync(addressesFile, content);
  console.log('✅ Saved addresses to', addressesFile);

  // Copy ABI
  console.log('\n📋 Copying ABI to frontend...');
  const artifactFile = path.join(__dirname, '../artifacts/contracts/core/LendingPool.sol/LendingPool.json');
  const abiFile = path.join(__dirname, '../lendhub-frontend-nextjs/src/abis/LendingPool.json');
  
  const artifact = JSON.parse(fs.readFileSync(artifactFile, 'utf8'));
  fs.writeFileSync(abiFile, JSON.stringify({ abi: artifact.abi }, null, 2));
  console.log('✅ Copied ABI to', abiFile);

  console.log('\n✅ Deployment complete!');
  console.log('\n📌 Next steps:');
  console.log('1. Run your initialization script to setup reserves');
  console.log('2. Copy addresses to your frontend');
  console.log('3. Restart frontend server');
  console.log('4. Refresh browser (Ctrl + Shift + R)');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

