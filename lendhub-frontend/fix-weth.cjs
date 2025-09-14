// Fix WETH by minting directly
const { ethers } = require('ethers');

async function fixWeth() {
  try {
    console.log('🔧 Fixing WETH...');
    
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
    const privateKey = '0x18b3d7e15748c02a3bcbbf7d2e2e553a847afb24b7581db5ef8c8bf90f41179a';
    const signer = new ethers.Wallet(privateKey, provider);
    
    console.log('Using account:', await signer.getAddress());
    
    // Try to mint WETH using the existing contract
    const WETH_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    const ERC20_ABI = [
      'function mint(address to, uint256 amount) external',
      'function balanceOf(address owner) external view returns (uint256)',
      'function symbol() external view returns (string)',
    ];
    
    const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, signer);
    
    // Try to mint 10 WETH
    const mintAmount = ethers.parseEther('10');
    console.log('Attempting to mint 10 WETH...');
    
    try {
      const tx = await wethContract.mint(await signer.getAddress(), mintAmount);
      console.log('Mint tx hash:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Mint tx confirmed:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
      
      // Check balance
      const balance = await wethContract.balanceOf(await signer.getAddress());
      console.log('WETH Balance:', ethers.formatEther(balance));
      
      console.log('✅ WETH minting successful!');
      
    } catch (mintError) {
      console.error('❌ Mint failed:', mintError.message);
      
      // Try to check if contract exists
      try {
        const symbol = await wethContract.symbol();
        console.log('Contract symbol:', symbol);
      } catch (symbolError) {
        console.error('Contract symbol error:', symbolError.message);
        console.log('❌ Contract does not exist or is not deployed properly');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixWeth();
