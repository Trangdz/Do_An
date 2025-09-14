// Test script to mint WETH directly
import { ethers } from 'ethers';

const CONFIG = {
  RPC_URL: 'http://127.0.0.1:7545',
  WETH: '0x3801415922E64e42227Dd403795ED850F4FAd3cB',
};

const ERC20_ABI = [
  'function mint(address to, uint256 amount) external',
  'function balanceOf(address owner) external view returns (uint256)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
];

async function testMintWETH() {
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    
    // Use provided private key (Acc 1)
    const privateKey = '0x18b3d7e15748c02a3bcbbf7d2e2e553a847afb24b7581db5ef8c8bf90f41179a';
    const signer = new ethers.Wallet(privateKey, provider);
    
    console.log('Using account:', await signer.getAddress());
    
    // Check ETH balance
    const ethBalance = await provider.getBalance(await signer.getAddress());
    console.log('ETH balance:', ethers.formatEther(ethBalance));
    
    const wethContract = new ethers.Contract(CONFIG.WETH, ERC20_ABI, signer);
    
    // Check current balance
    const currentBalance = await wethContract.balanceOf(await signer.getAddress());
    console.log('Current WETH balance:', ethers.formatEther(currentBalance));
    
    // Mint 20 WETH
    const amount = ethers.parseEther('20');
    console.log('Minting 20 WETH...');
    
    const tx = await wethContract.mint(await signer.getAddress(), amount);
    console.log('Transaction hash:', tx.hash);
    
    await tx.wait();
    console.log('Transaction confirmed!');
    
    // Check new balance
    const newBalance = await wethContract.balanceOf(await signer.getAddress());
    console.log('New WETH balance:', ethers.formatEther(newBalance));
    
    // Check symbol and decimals
    const symbol = await wethContract.symbol();
    const decimals = await wethContract.decimals();
    console.log('Token symbol:', symbol);
    console.log('Token decimals:', decimals);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testMintWETH();
