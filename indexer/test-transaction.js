const { ethers } = require('ethers');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

async function testTransaction() {
  console.log('🧪 Test thực hiện giao dịch và kiểm tra events...\n');
  
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const network = await provider.getNetwork();
    
    // Get accounts from Ganache
    const accounts = await provider.listAccounts();
    if (accounts.length === 0) {
      console.error('❌ Không tìm thấy accounts trong Ganache');
      return;
    }
    
    console.log(`📦 Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`👤 Accounts available: ${accounts.length}`);
    console.log(`   Deployer: ${accounts[0]}\n`);
    
    const signer = new ethers.Wallet(accounts[0], provider);
    const poolAddress = process.env.LENDING_POOL_ADDRESS;
    
    // Check contract
    const code = await provider.getCode(poolAddress);
    if (code === '0x') {
      console.error('❌ Contract không tồn tại tại address:', poolAddress);
      return;
    }
    
    console.log('✅ Contract tồn tại tại:', poolAddress);
    
    // Get contract instance
    const poolABI = [
      'function supply(address asset, uint256 amount) external',
      'function getReservesList() view returns (address[])',
      'event Supplied(address indexed user, address indexed asset, uint256 amount)'
    ];
    
    const pool = new ethers.Contract(poolAddress, poolABI, provider);
    
    // Get reserves
    let reserves = [];
    try {
      reserves = await pool.getReservesList();
      console.log(`📊 Số reserves: ${reserves.length}`);
      if (reserves.length === 0) {
        console.log('⚠️ Chưa có reserves nào được khởi tạo');
        console.log('💡 Cần init reserves trước khi supply');
        return;
      }
      reserves.forEach((addr, i) => {
        console.log(`   ${i + 1}. ${addr}`);
      });
    } catch (err) {
      console.warn('⚠️ Không thể lấy reserves list:', err.message);
    }
    
    if (reserves.length === 0) {
      console.log('\n💡 Để test, bạn cần:');
      console.log('   1. Đảm bảo reserves đã được init');
      console.log('   2. User có token để supply');
      console.log('   3. User đã approve token cho LendingPool');
      return;
    }
    
    // Use first reserve as test asset
    const testAsset = reserves[0];
    console.log(`\n🪙 Test asset: ${testAsset}`);
    
    // Check balance
    const tokenABI = ['function balanceOf(address) view returns (uint256)', 'function symbol() view returns (string)'];
    const token = new ethers.Contract(testAsset, tokenABI, provider);
    
    try {
      const balance = await token.balanceOf(signer.address);
      const symbol = await token.symbol();
      console.log(`💰 Balance của ${symbol}: ${ethers.formatEther(balance)}`);
      
      if (balance === 0n) {
        console.log('⚠️ Balance = 0, không thể test supply');
        console.log('💡 Cần mint token cho user trước');
        return;
      }
      
      // Check allowance
      const poolContract = new ethers.Contract(poolAddress, ['function allowance(address, address) view returns (uint256)'], provider);
      const allowance = await token.allowance(signer.address, poolAddress);
      console.log(`🔐 Allowance: ${ethers.formatEther(allowance)}`);
      
      if (allowance === 0n) {
        console.log('\n💡 Cần approve token trước khi supply');
        console.log('   Hoặc sử dụng frontend để thực hiện giao dịch');
        return;
      }
      
      // Test supply (small amount)
      const supplyAmount = ethers.parseEther('1'); // 1 token
      console.log(`\n📤 Thực hiện supply ${ethers.formatEther(supplyAmount)} ${symbol}...`);
      
      const poolWithSigner = pool.connect(signer);
      const tx = await poolWithSigner.supply(testAsset, supplyAmount);
      console.log(`   TX Hash: ${tx.hash}`);
      console.log(`   ⏳ Đang chờ confirmation...`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ Transaction confirmed tại block ${receipt.blockNumber}`);
      
      // Check for events
      const events = receipt.logs.filter(log => {
        try {
          const parsed = pool.interface.parseLog(log);
          return parsed && parsed.name === 'Supplied';
        } catch {
          return false;
        }
      });
      
      if (events.length > 0) {
        console.log(`\n✅ Tìm thấy ${events.length} Supplied event(s):`);
        events.forEach((log, i) => {
          const parsed = pool.interface.parseLog(log);
          console.log(`   ${i + 1}. User: ${parsed.args.user}`);
          console.log(`      Asset: ${parsed.args.asset}`);
          console.log(`      Amount: ${ethers.formatEther(parsed.args.amount)}`);
        });
        console.log('\n💡 Indexer sẽ tự động bắt được event này!');
      } else {
        console.log('\n⚠️ Không tìm thấy Supplied event trong transaction');
      }
      
    } catch (err) {
      console.error('❌ Lỗi:', err.message);
      if (err.message.includes('allowance')) {
        console.log('\n💡 Cần approve token trước:');
        console.log('   - Sử dụng frontend để approve và supply');
        console.log('   - Hoặc approve trực tiếp qua contract');
      }
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error('Stack:', error.stack);
  }
}

testTransaction();

























