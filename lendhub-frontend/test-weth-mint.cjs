// Test script to verify WETH minting
const { ethers } = require('ethers');

const CONFIG = {
  RPC_URL: 'http://127.0.0.1:7545',
  WETH: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
};

async function testWethMint() {
  try {
    console.log('🔍 Testing WETH Minting...');
    
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    const privateKey = '0x18b3d7e15748c02a3bcbbf7d2e2e553a847afb24b7581db5ef8c8bf90f41179a';
    const signer = new ethers.Wallet(privateKey, provider);
    
    console.log('Using account:', await signer.getAddress());
    
    const ERC20_ABI = [
      'function mint(address to, uint256 amount) external',
      'function balanceOf(address owner) external view returns (uint256)',
      'function symbol() external view returns (string)',
      'function decimals() external view returns (uint8)',
    ];
    
    const wethContract = new ethers.Contract(CONFIG.WETH, ERC20_ABI, signer);
    
    // Check current balance
    console.log('\n📊 Current WETH Balance:');
    const balance = await wethContract.balanceOf(await signer.getAddress());
    console.log('Balance (wei):', balance.toString());
    console.log('Balance (ETH):', ethers.formatEther(balance));
    
    // Check contract info
    console.log('\n📋 Contract Info:');
    const symbol = await wethContract.symbol();
    const decimals = await wethContract.decimals();
    console.log('Symbol:', symbol);
    console.log('Decimals:', decimals);
    
    // Test minting 1 WETH
    console.log('\n🪙 Testing Mint 1 WETH:');
    const mintAmount = ethers.parseEther('1');
    console.log('Mint amount (wei):', mintAmount.toString());
    
    try {
      const tx = await wethContract.mint(await signer.getAddress(), mintAmount);
      console.log('Mint tx hash:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Mint tx confirmed:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
      
      // Check new balance
      const newBalance = await wethContract.balanceOf(await signer.getAddress());
      console.log('New balance (ETH):', ethers.formatEther(newBalance));
      
      console.log('✅ WETH minting works!');
      
    } catch (mintError) {
      console.error('❌ Mint failed:', mintError.message);
      console.error('Error details:', {
        code: mintError.code,
        reason: mintError.reason,
        data: mintError.data
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testWethMint();
