// Find existing WETH contract
const { ethers } = require('ethers');

const RPC_URL = 'http://127.0.0.1:7545';

async function findWETH() {
  try {
    console.log('🔄 Connecting to Ganache...');
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    const accounts = await provider.listAccounts();
    console.log('👤 Using account:', accounts[0]);
    
    // Check common WETH addresses
    const addresses = [
      '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
      '0x9fE46736679d2D9a65f0992F2272dE9f3c7fa6e0',
      '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      '0xCf1E760e374089A8930823Bec2d9867754EfE7A2'
    ];
    
    for (const addr of addresses) {
      try {
        console.log(`\n📍 Checking ${addr}...`);
        
        // Check if contract exists
        const code = await provider.getCode(addr);
        if (code === '0x') {
          console.log('❌ No contract at this address');
          continue;
        }
        
        console.log('✅ Contract found!');
        
        // Try to call balanceOf
        const wethContract = new ethers.Contract(addr, [
          'function balanceOf(address owner) view returns (uint256)',
          'function symbol() view returns (string)',
          'function name() view returns (string)',
          'function decimals() view returns (uint8)'
        ], provider);
        
        try {
          const symbol = await wethContract.symbol();
          const name = await wethContract.name();
          const decimals = await wethContract.decimals();
          const balance = await wethContract.balanceOf(accounts[0]);
          
          console.log('📊 Contract Info:');
          console.log('  Symbol:', symbol);
          console.log('  Name:', name);
          console.log('  Decimals:', decimals);
          console.log('  Balance:', ethers.utils.formatEther(balance));
          
          if (balance.gt(0)) {
            console.log('🎉 Found WETH with balance!');
            console.log('📍 Use this address:', addr);
            break;
          }
        } catch (error) {
          console.log('❌ Not a valid ERC20 contract');
        }
        
      } catch (error) {
        console.log('❌ Error checking address:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findWETH();
