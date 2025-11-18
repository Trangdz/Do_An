const { ethers } = require('ethers');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

async function checkContract() {
  console.log('🔍 Kiểm tra contract addresses...\n');
  
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const currentBlock = await provider.getBlockNumber();
  
  console.log(`📦 Block hiện tại: ${currentBlock}\n`);
  
  // Test addresses từ cả 2 config files
  const testAddresses = [
    { name: 'config.env', address: '0xF55E914814E7f6Cd6538d1170C311424dea8EAFc' },
    { name: 'config-local.env', address: '0x56328671A331a3563e86C4CC53b5E1945733A3E3' }
  ];
  
  // Thêm address từ env nếu có
  if (process.env.LENDING_POOL_ADDRESS) {
    testAddresses.push({ 
      name: 'Current ENV', 
      address: process.env.LENDING_POOL_ADDRESS 
    });
  }
  
  console.log('🔍 Kiểm tra các addresses:\n');
  
  for (const test of testAddresses) {
    try {
      console.log(`📍 ${test.name}: ${test.address}`);
      const code = await provider.getCode(test.address);
      
      if (code === '0x' || code === '0x0') {
        console.log(`   ❌ Không có contract tại address này\n`);
      } else {
        console.log(`   ✅ Có contract! (code length: ${code.length} characters)`);
        
        // Thử gọi một function để xác nhận đây là LendingPool
        try {
          const poolABI = ['function getReservesList() view returns (address[])'];
          const pool = new ethers.Contract(test.address, poolABI, provider);
          const reserves = await pool.getReservesList();
          console.log(`   ✅ Xác nhận: Đây là LendingPool contract`);
          console.log(`   📊 Số reserves: ${reserves.length}`);
          
          // Tìm events trong 100 blocks gần đây
          const eventABI = [
            'event Supplied(address indexed user, address indexed asset, uint256 amount)'
          ];
          const eventPool = new ethers.Contract(test.address, eventABI, provider);
          const fromBlock = Math.max(0, currentBlock - 100);
          const events = await eventPool.queryFilter('Supplied', fromBlock, currentBlock);
          console.log(`   📈 Events trong 100 blocks gần đây: ${events.length}`);
          
        } catch (verifyError) {
          console.log(`   ⚠️ Không thể verify là LendingPool: ${verifyError.message}`);
        }
        
        console.log('');
      }
    } catch (error) {
      console.log(`   ❌ Lỗi khi kiểm tra: ${error.message}\n`);
    }
  }
  
  // Gợi ý
  console.log('💡 Gợi ý:');
  console.log('   1. Nếu không có contract nào, cần deploy contract trước');
  console.log('   2. Nếu có contract, cập nhật LENDING_POOL_ADDRESS trong config.env');
  console.log('   3. Chạy script deploy: node scripts/deploy_ganache_simple.cjs\n');
}

checkContract().catch(console.error);




















