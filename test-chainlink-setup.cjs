const { ethers } = require('ethers');

class ChainlinkDockerTester {
  constructor() {
    this.ganacheUrl = 'http://localhost:8545';
    this.node1Url = 'http://localhost:6688';
    this.node2Url = 'http://localhost:6689';
  }

  async testGanache() {
    console.log('🧪 Testing Ganache Connection...');
    console.log('=' .repeat(50));

    try {
      const provider = new ethers.JsonRpcProvider(this.ganacheUrl);
      
      // Test basic connection
      const blockNumber = await provider.getBlockNumber();
      console.log(`✅ Ganache connected - Block: ${blockNumber}`);
      
      // Get accounts
      const accounts = await provider.listAccounts();
      console.log(`✅ Found ${accounts.length} accounts`);
      
      // Check balances
      for (let i = 0; i < Math.min(3, accounts.length); i++) {
        const balance = await provider.getBalance(accounts[i]);
        console.log(`   Account ${i}: ${ethers.formatEther(balance)} ETH`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Ganache connection failed:', error.message);
      return false;
    }
  }

  async testChainlinkNode1() {
    console.log('\n🧪 Testing Chainlink Node 1...');
    console.log('=' .repeat(50));

    try {
      const response = await fetch(`${this.node1Url}/health`);
      if (response.ok) {
        console.log('✅ Node 1 health check passed');
        return true;
      } else {
        console.log(`❌ Node 1 health check failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Node 1 connection failed:', error.message);
      return false;
    }
  }

  async testChainlinkNode2() {
    console.log('\n🧪 Testing Chainlink Node 2...');
    console.log('=' .repeat(50));

    try {
      const response = await fetch(`${this.node2Url}/health`);
      if (response.ok) {
        console.log('✅ Node 2 health check passed');
        return true;
      } else {
        console.log(`❌ Node 2 health check failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Node 2 connection failed:', error.message);
      return false;
    }
  }

  async testOracleContract() {
    console.log('\n🧪 Testing Oracle Contract Integration...');
    console.log('=' .repeat(50));

    try {
      const provider = new ethers.JsonRpcProvider(this.ganacheUrl);
      
      // Test with your deployed Oracle contract
      const oracleAddress = '0xb8A99b2272541eA6f63f579839AEFA20A8f00937';
      const oracleABI = [
        'function getAssetPrice1e18(address token) external view returns (uint256)'
      ];
      
      const oracle = new ethers.Contract(oracleAddress, oracleABI, provider);
      
      // Test with WETH
      const wethAddress = '0x7e1600E50472a5850A295cB8eeEB5C323c1f6254';
      const price = await oracle.getAssetPrice1e18(wethAddress);
      const priceFormatted = parseFloat(ethers.formatEther(price));
      
      console.log(`✅ Oracle contract working - WETH price: $${priceFormatted}`);
      return true;
    } catch (error) {
      console.error('❌ Oracle contract test failed:', error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log('🔗 CHAINLINK DOCKER TEST SUITE');
    console.log('=' .repeat(50));
    
    const results = {
      ganache: await this.testGanache(),
      node1: await this.testChainlinkNode1(),
      node2: await this.testChainlinkNode2(),
      oracle: await this.testOracleContract()
    };
    
    console.log('\n📊 TEST RESULTS:');
    console.log('=' .repeat(50));
    console.log(`Ganache: ${results.ganache ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Node 1:  ${results.node1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Node 2:  ${results.node2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Oracle:  ${results.oracle ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = Object.values(results).every(result => result);
    
    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('✅ Chainlink Docker setup is working correctly');
    } else {
      console.log('\n⚠️ SOME TESTS FAILED');
      console.log('❌ Check the troubleshooting guide');
    }
    
    return allPassed;
  }
}

async function main() {
  const tester = new ChainlinkDockerTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ChainlinkDockerTester;





