// Direct WETH minting script
const { ethers } = require('ethers');

async function mintWethDirect() {
  try {
    console.log('🔍 Minting WETH Directly...');
    
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
    const privateKey = '0x18b3d7e15748c02a3bcbbf7d2e2e553a847afb24b7581db5ef8c8bf90f41179a';
    const signer = new ethers.Wallet(privateKey, provider);
    
    console.log('Using account:', await signer.getAddress());
    
    // Deploy fresh WETH contract
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const weth = await ERC20Mock.deploy("Wrapped ETH", "WETH", 18);
    await weth.waitForDeployment();
    
    const wethAddress = await weth.getAddress();
    console.log('WETH deployed at:', wethAddress);
    
    // Mint 100 WETH to our account
    const mintAmount = ethers.parseEther('100');
    const tx = await weth.mint(await signer.getAddress(), mintAmount);
    await tx.wait();
    
    console.log('✅ Minted 100 WETH to account');
    
    // Check balance
    const balance = await weth.balanceOf(await signer.getAddress());
    console.log('WETH Balance:', ethers.formatEther(balance));
    
    // Update frontend config
    console.log('\n📝 Update frontend config with:');
    console.log(`WETH: ${wethAddress}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

mintWethDirect();
