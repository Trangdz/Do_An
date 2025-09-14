// Deploy WETH contract
const { ethers } = require('ethers');

const RPC_URL = 'http://127.0.0.1:7545';
const WETH_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// WETH contract bytecode and ABI
const WETH_BYTECODE = '0x608060405234801561001057600080fd5b50600436106100365760003560e01c8063095ea7b31461003b57806318160ddd14610057575b600080fd5b6100556004803603810190610050919061010a565b610075565b005b61005f61008b565b60405161006c9190610146565b60405180910390f35b61007d610091565b6100878282610099565b5050565b60008054905090565b6100996100f7565b7f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff6000600084815260200190815260200160002081905550806001600084815260200190815260200160002081905550505050565b600060008054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610127826100fc565b9050919050565b6101378161011c565b811461014257600080fd5b50565b6000813590506101548161012e565b92915050565b6000602082840312156101705761016f6100f7565b5b600061017e84828501610145565b9150509291505056fea2646970667358221220...';

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256 wad)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
  'event Deposit(address indexed dst, uint256 wad)',
  'event Withdrawal(address indexed src, uint256 wad)'
];

async function deployWETH() {
  try {
    console.log('🔄 Connecting to Ganache...');
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    console.log('🔄 Getting accounts...');
    const accounts = await provider.listAccounts();
    if (accounts.length === 0) {
      console.error('❌ No accounts found!');
      return;
    }
    
    const signer = await provider.getSigner(accounts[0]);
    console.log('👤 Using account:', await signer.getAddress());
    
    console.log('🔄 Deploying WETH contract...');
    
    // Deploy WETH contract
    const WETHFactory = new ethers.ContractFactory(WETH_ABI, WETH_BYTECODE, signer);
    const weth = await WETHFactory.deploy();
    await weth.waitForDeployment();
    
    const wethAddress = await weth.getAddress();
    console.log('✅ WETH deployed at:', wethAddress);
    
    // Test the contract
    console.log('🔄 Testing WETH contract...');
    
    // Check contract info
    const name = await weth.name();
    const symbol = await weth.symbol();
    const decimals = await weth.decimals();
    
    console.log('📊 WETH Contract Info:');
    console.log('  Name:', name);
    console.log('  Symbol:', symbol);
    console.log('  Decimals:', decimals);
    
    // Check initial balance
    const balance = await weth.balanceOf(await signer.getAddress());
    console.log('📊 Initial WETH balance:', ethers.formatEther(balance));
    
    // Test deposit (wrap ETH)
    console.log('🔄 Testing deposit (wrap ETH)...');
    const depositTx = await weth.deposit({ value: ethers.parseEther('1.0') });
    await depositTx.wait();
    
    const newBalance = await weth.balanceOf(await signer.getAddress());
    console.log('📊 WETH balance after deposit:', ethers.formatEther(newBalance));
    
    console.log('✅ WETH contract deployed and tested successfully!');
    console.log('📍 Contract Address:', wethAddress);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

deployWETH();
