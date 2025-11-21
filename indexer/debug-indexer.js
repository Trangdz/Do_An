const { MongoClient } = require('mongodb');
const { ethers } = require('ethers');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

async function debugIndexer() {
  console.log('🔍 Debug Indexer - Kiểm tra từng bước\n');
  
  try {
    // 1. Kiểm tra environment variables
    console.log('1️⃣ Kiểm tra Environment Variables:');
    console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '✅' : '❌'}`);
    console.log(`   RPC_URL: ${process.env.RPC_URL ? '✅' : '❌'}`);
    console.log(`   LENDING_POOL_ADDRESS: ${process.env.LENDING_POOL_ADDRESS ? '✅' : '❌'}`);
    console.log(`   ORACLE_ADDRESS: ${process.env.ORACLE_ADDRESS ? '✅' : '❌'}\n`);
    
    if (!process.env.MONGODB_URI || !process.env.RPC_URL || !process.env.LENDING_POOL_ADDRESS) {
      throw new Error('Missing required environment variables');
    }
    
    // 2. Kiểm tra kết nối MongoDB
    console.log('2️⃣ Kiểm tra kết nối MongoDB:');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('lendhub_local');
    console.log('   ✅ Kết nối MongoDB thành công\n');
    
    // 3. Kiểm tra kết nối RPC
    console.log('3️⃣ Kiểm tra kết nối RPC:');
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const blockNumber = await provider.getBlockNumber();
    console.log(`   ✅ Kết nối RPC thành công`);
    console.log(`   📦 Block hiện tại: ${blockNumber}\n`);
    
    // 4. Kiểm tra contract
    console.log('4️⃣ Kiểm tra LendingPool contract:');
    const poolABI = [
      'event Supplied(address indexed user, address indexed asset, uint256 amount)',
      'event Withdrawn(address indexed user, address indexed asset, uint256 amount)',
      'event Borrowed(address indexed user, address indexed asset, uint256 amount)',
      'event Repaid(address indexed user, address indexed onBehalfOf, address indexed asset, uint256 amount)',
      'event Liquidated(address indexed liquidator, address indexed user, address indexed debtAsset, address collateralAsset, uint256 repayAmount1e18, uint256 collateralSeized1e18)'
    ];
    
    const pool = new ethers.Contract(process.env.LENDING_POOL_ADDRESS, poolABI, provider);
    console.log(`   ✅ Contract hợp lệ tại: ${process.env.LENDING_POOL_ADDRESS}\n`);
    
    // 5. Kiểm tra events trong các block gần đây
    console.log('5️⃣ Kiểm tra events trong các block gần đây:');
    const fromBlock = Math.max(0, blockNumber - 100);
    const toBlock = blockNumber;
    
    console.log(`   🔍 Tìm kiếm events từ block ${fromBlock} đến ${toBlock}...`);
    
    const [suppliedEvents, withdrawnEvents, borrowedEvents, repaidEvents, liquidatedEvents] = await Promise.all([
      pool.queryFilter('Supplied', fromBlock, toBlock).catch(err => {
        console.warn(`   ⚠️ Lỗi khi tìm Supplied events: ${err.message}`);
        return [];
      }),
      pool.queryFilter('Withdrawn', fromBlock, toBlock).catch(err => {
        console.warn(`   ⚠️ Lỗi khi tìm Withdrawn events: ${err.message}`);
        return [];
      }),
      pool.queryFilter('Borrowed', fromBlock, toBlock).catch(err => {
        console.warn(`   ⚠️ Lỗi khi tìm Borrowed events: ${err.message}`);
        return [];
      }),
      pool.queryFilter('Repaid', fromBlock, toBlock).catch(err => {
        console.warn(`   ⚠️ Lỗi khi tìm Repaid events: ${err.message}`);
        return [];
      }),
      pool.queryFilter('Liquidated', fromBlock, toBlock).catch(err => {
        console.warn(`   ⚠️ Lỗi khi tìm Liquidated events: ${err.message}`);
        return [];
      })
    ]);
    
    const allEvents = [...suppliedEvents, ...withdrawnEvents, ...borrowedEvents, ...repaidEvents, ...liquidatedEvents];
    console.log(`   📊 Tổng số events tìm thấy: ${allEvents.length}`);
    console.log(`      - Supplied: ${suppliedEvents.length}`);
    console.log(`      - Withdrawn: ${withdrawnEvents.length}`);
    console.log(`      - Borrowed: ${borrowedEvents.length}`);
    console.log(`      - Repaid: ${repaidEvents.length}`);
    console.log(`      - Liquidated: ${liquidatedEvents.length}\n`);
    
    // 6. Test ghi một event vào database
    if (allEvents.length > 0) {
      console.log('6️⃣ Test ghi event vào database:');
      const testEvent = allEvents[0];
      console.log(`   📝 Event test: ${testEvent.event}`);
      console.log(`   📦 Block: ${testEvent.blockNumber}`);
      console.log(`   🔗 TX Hash: ${testEvent.transactionHash}`);
      
      try {
        // Lấy block timestamp
        const block = await provider.getBlock(testEvent.blockNumber);
        const blockTimestamp = block.timestamp * 1000;
        
        // Xử lý event
        let user, asset, amount;
        if (testEvent.event === 'Liquidated') {
          user = testEvent.args.user;
          asset = testEvent.args.debtAsset;
          amount = testEvent.args.repayAmount1e18;
        } else if (testEvent.event === 'Repaid') {
          user = testEvent.args.onBehalfOf || testEvent.args.user;
          asset = testEvent.args.asset;
          amount = testEvent.args.amount;
        } else {
          user = testEvent.args.user;
          asset = testEvent.args.asset;
          amount = testEvent.args.amount;
        }
        
        // Lấy asset info
        let assetSymbol = 'UNKNOWN';
        let decimals = 18;
        try {
          const tokenContract = new ethers.Contract(asset, ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'], provider);
          assetSymbol = await tokenContract.symbol();
          decimals = await tokenContract.decimals();
        } catch (err) {
          console.warn(`   ⚠️ Không thể lấy asset info: ${err.message}`);
        }
        
        const testTransaction = {
          hash: testEvent.transactionHash,
          user: user,
          asset: {
            address: asset,
            symbol: assetSymbol,
            decimals: decimals
          },
          amount: ethers.formatUnits(amount, decimals),
          amountUSD: parseFloat(ethers.formatUnits(amount, decimals)) * 1, // Simple calculation
          type: testEvent.event,
          timestamp: blockTimestamp,
          blockNumber: testEvent.blockNumber,
          gas: { used: '0', price: '0', fee: '0' },
          status: 'success',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        console.log(`   💾 Đang ghi transaction vào database...`);
        const result = await db.collection('transactions').updateOne(
          { hash: testTransaction.hash },
          { $set: testTransaction },
          { upsert: true }
        );
        
        console.log(`   ✅ Ghi thành công!`);
        console.log(`      - Matched: ${result.matchedCount}`);
        console.log(`      - Modified: ${result.modifiedCount}`);
        console.log(`      - Upserted: ${result.upsertedCount}\n`);
        
        // Kiểm tra lại trong database
        const savedTx = await db.collection('transactions').findOne({ hash: testTransaction.hash });
        if (savedTx) {
          console.log(`   ✅ Xác nhận: Transaction đã được lưu trong database`);
          console.log(`      - Type: ${savedTx.type}`);
          console.log(`      - User: ${savedTx.user}`);
          console.log(`      - Amount: ${savedTx.amount} ${savedTx.asset.symbol}\n`);
        } else {
          console.log(`   ❌ Lỗi: Transaction không tìm thấy trong database\n`);
        }
        
      } catch (err) {
        console.error(`   ❌ Lỗi khi test ghi event: ${err.message}`);
        console.error(`   Stack: ${err.stack}\n`);
      }
    } else {
      console.log('   ⚠️ Không có events nào để test\n');
    }
    
    // 7. Kiểm tra dữ liệu hiện có trong database
    console.log('7️⃣ Kiểm tra dữ liệu trong database:');
    const txCount = await db.collection('transactions').countDocuments();
    const lastIndexed = await db.collection('metadata').findOne({ key: 'lastIndexedBlock' });
    console.log(`   📊 Số transactions: ${txCount}`);
    console.log(`   📦 Last indexed block: ${lastIndexed ? lastIndexed.value : 'Chưa có'}\n`);
    
    // 8. Kiểm tra một block cụ thể
    console.log('8️⃣ Kiểm tra một block cụ thể:');
    const testBlockNumber = blockNumber;
    console.log(`   🔍 Kiểm tra block ${testBlockNumber}...`);
    
    try {
      const blockEvents = await pool.queryFilter('Supplied', testBlockNumber, testBlockNumber);
      console.log(`   📊 Số Supplied events trong block ${testBlockNumber}: ${blockEvents.length}`);
      
      if (blockEvents.length > 0) {
        console.log(`   📝 Event đầu tiên:`, {
          event: blockEvents[0].event,
          user: blockEvents[0].args.user,
          asset: blockEvents[0].args.asset,
          amount: blockEvents[0].args.amount.toString()
        });
      }
    } catch (err) {
      console.error(`   ❌ Lỗi: ${err.message}`);
    }
    
    await client.close();
    console.log('\n✅ Hoàn thành debug!\n');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

debugIndexer();

























