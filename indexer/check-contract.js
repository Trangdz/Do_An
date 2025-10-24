const { ethers } = require('ethers');
require('dotenv').config({ path: './config.env' });

async function checkContract() {
  try {
    console.log('🔍 Checking contract functions...');
    console.log(`🔗 RPC URL: ${process.env.RPC_URL}`);
    console.log(`🏦 Pool Address: ${process.env.LENDING_POOL_ADDRESS}`);
    
    // Connect to Ganache
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const poolAddress = process.env.LENDING_POOL_ADDRESS;
    
    // Get contract bytecode
    const code = await provider.getCode(poolAddress);
    console.log(`📦 Contract code length: ${code.length} bytes`);
    
    // Try to get contract info using different methods
    console.log('\n📋 Method 1: Try to call common functions...');
    
    // Common function signatures to try
    const commonFunctions = [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
      'function totalSupply() view returns (uint256)',
      'function balanceOf(address) view returns (uint256)',
      'function owner() view returns (address)',
      'function getOwner() view returns (address)',
      'function admin() view returns (address)',
      'function getAdmin() view returns (address)'
    ];
    
    for (const funcSig of commonFunctions) {
      try {
        const contract = new ethers.Contract(poolAddress, [funcSig], provider);
        const funcName = funcSig.split('(')[0].split(' ')[1];
        
        if (funcName === 'name') {
          const result = await contract.name();
          console.log(`✅ ${funcName}(): ${result}`);
        } else if (funcName === 'symbol') {
          const result = await contract.symbol();
          console.log(`✅ ${funcName}(): ${result}`);
        } else if (funcName === 'decimals') {
          const result = await contract.decimals();
          console.log(`✅ ${funcName}(): ${result}`);
        } else if (funcName === 'totalSupply') {
          const result = await contract.totalSupply();
          console.log(`✅ ${funcName}(): ${result}`);
        } else if (funcName === 'owner' || funcName === 'getOwner') {
          const result = await contract[funcName]();
          console.log(`✅ ${funcName}(): ${result}`);
        } else if (funcName === 'admin' || funcName === 'getAdmin') {
          const result = await contract[funcName]();
          console.log(`✅ ${funcName}(): ${result}`);
        }
      } catch (error) {
        // Function doesn't exist, continue
      }
    }
    
    console.log('\n📋 Method 2: Try to decode contract bytecode...');
    
    // Try to find function selectors in bytecode
    const functionSelectors = [
      '0x70a08231', // balanceOf(address)
      '0x18160ddd', // totalSupply()
      '0x06fdde03', // name()
      '0x95d89b41', // symbol()
      '0x313ce567', // decimals()
      '0x8da5cb5b', // owner()
      '0x7c4a3d75', // admin()
      '0xa9059cbb', // transfer(address,uint256)
      '0x23b872dd', // transferFrom(address,address,uint256)
      '0x095ea7b3', // approve(address,uint256)
      '0x40c10f19', // mint(address,uint256)
      '0x42966c68', // burn(uint256)
      '0x79cc6790', // burnFrom(address,uint256)
      '0x27e235e3', // balances(address)
      '0x18160ddd', // totalSupply()
      '0x8da5cb5b', // owner()
      '0x7c4a3d75', // admin()
      '0x8f283970', // changeAdmin(address)
      '0xf851a440', // admin()
      '0x5c60da1b', // implementation()
      '0x3659cfe6', // upgradeTo(address)
      '0x4f1ef286', // upgradeToAndCall(address,bytes)
      '0x8c7a63ae', // proxyAdmin()
      '0xf851a440', // admin()
      '0x5c60da1b', // implementation()
      '0x3659cfe6', // upgradeTo(address)
      '0x4f1ef286', // upgradeToAndCall(address,bytes)
      '0x8c7a63ae', // proxyAdmin()
      '0xf851a440', // admin()
      '0x5c60da1b', // implementation()
      '0x3659cfe6', // upgradeTo(address)
      '0x4f1ef286', // upgradeToAndCall(address,bytes)
      '0x8c7a63ae'  // proxyAdmin()
    ];
    
    console.log('🔍 Searching for function selectors in bytecode...');
    for (const selector of functionSelectors) {
      if (code.includes(selector)) {
        console.log(`✅ Found selector: ${selector}`);
      }
    }
    
    console.log('\n📋 Method 3: Try to get contract events...');
    
    // Try to get events from contract
    try {
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 100);
      
      console.log(`🔍 Scanning blocks ${fromBlock} to ${currentBlock} for any events...`);
      
      // Get all logs from the contract
      const logs = await provider.getLogs({
        address: poolAddress,
        fromBlock: fromBlock,
        toBlock: currentBlock
      });
      
      console.log(`📊 Found ${logs.length} logs from contract`);
      
      if (logs.length > 0) {
        console.log('📋 Sample log:');
        console.log(JSON.stringify(logs[0], null, 2));
      }
      
    } catch (error) {
      console.log('❌ Error getting logs:', error.message);
    }
    
    console.log('\n✅ Contract check completed!');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkContract();



