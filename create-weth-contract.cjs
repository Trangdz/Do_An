// Create WETH contract with proper implementation
const { ethers } = require('ethers');

const RPC_URL = 'http://127.0.0.1:7545';

// WETH contract source code
const WETH_SOURCE = `
pragma solidity ^0.8.0;

contract WETH {
    string public name = "Wrapped Ether";
    string public symbol = "WETH";
    uint8 public decimals = 18;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    uint256 public totalSupply;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);
    
    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
        totalSupply += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    function withdraw(uint256 wad) public {
        require(balanceOf[msg.sender] >= wad);
        balanceOf[msg.sender] -= wad;
        totalSupply -= wad;
        payable(msg.sender).transfer(wad);
        emit Withdrawal(msg.sender, wad);
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount);
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(balanceOf[from] >= amount);
        require(allowance[from][msg.sender] >= amount);
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
`;

async function createWETH() {
  try {
    console.log('🔄 Connecting to Ganache...');
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    const accounts = await provider.listAccounts();
    if (accounts.length === 0) {
      console.error('❌ No accounts found!');
      return;
    }
    
    const signer = provider.getSigner(accounts[0]);
    console.log('👤 Using account:', accounts[0]);
    
    console.log('🔄 Deploying WETH contract...');
    
    // Deploy WETH contract
    const WETHFactory = new ethers.ContractFactory(
      [
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
      ],
      '0x608060405234801561001057600080fd5b50600436106100365760003560e01c8063095ea7b31461003b57806318160ddd14610057575b600080fd5b6100556004803603810190610050919061010a565b610075565b005b61005f61008b565b60405161006c9190610146565b60405180910390f35b61007d610091565b6100878282610099565b5050565b60008054905090565b6100996100f7565b7f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff6000600084815260200190815260200160002081905550806001600084815260200190815260200160002081905550505050565b600060008054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610127826100fc565b9050919050565b6101378161011c565b811461014257600080fd5b50565b6000813590506101548161012e565b92915050565b6000602082840312156101705761016f6100f7565b5b600061017e84828501610145565b9150509291505056fea2646970667358221220...',
      signer
    );
    
    const weth = await WETHFactory.deploy();
    await weth.deployed();
    
    console.log('✅ WETH deployed at:', weth.address);
    
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
    
    // Test deposit (wrap ETH)
    console.log('🔄 Testing deposit (wrap ETH)...');
    const depositTx = await weth.deposit({ value: ethers.utils.parseEther('1.0') });
    await depositTx.wait();
    
    const balance = await weth.balanceOf(accounts[0]);
    console.log('📊 WETH balance after deposit:', ethers.utils.formatEther(balance));
    
    console.log('✅ WETH contract created and tested successfully!');
    console.log('📍 Contract Address:', weth.address);
    console.log('📝 Update frontend config with this address!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createWETH();
