const { ethers } = require('ethers');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

async function findEvents() {
  console.log('🔍 Tìm kiếm events trong toàn bộ blockchain...\n');
  
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const currentBlock = await provider.getBlockNumber();
    
    console.log(`📦 Block hiện tại: ${currentBlock}`);
    console.log(`🏦 Contract: ${process.env.LENDING_POOL_ADDRESS}\n`);
    
    const poolABI = [
      'event Supplied(address indexed user, address indexed asset, uint256 amount)',
      'event Withdrawn(address indexed user, address indexed asset, uint256 amount)',
      'event Borrowed(address indexed user, address indexed asset, uint256 amount)',
      'event Repaid(address indexed user, address indexed onBehalfOf, address indexed asset, uint256 amount)',
      'event Liquidated(address indexed liquidator, address indexed user, address indexed debtAsset, address collateralAsset, uint256 repayAmount1e18, uint256 collateralSeized1e18)'
    ];
    
    const pool = new ethers.Contract(process.env.LENDING_POOL_ADDRESS, poolABI, provider);
    
    // Tìm từ block 0 đến block hiện tại (hoặc có thể giới hạn range)
    const fromBlock = 0;
    const toBlock = currentBlock;
    
    console.log(`🔍 Tìm kiếm events từ block ${fromBlock} đến ${toBlock}...`);
    console.log(`⏳ Đang tìm kiếm (có thể mất vài phút)...\n`);
    
    const startTime = Date.now();
    
    // Query tất cả events
    const [suppliedEvents, withdrawnEvents, borrowedEvents, repaidEvents, liquidatedEvents] = await Promise.all([
      pool.queryFilter('Supplied', fromBlock, toBlock).catch(err => {
        console.warn(`⚠️ Lỗi khi tìm Supplied events: ${err.message}`);
        return [];
      }),
      pool.queryFilter('Withdrawn', fromBlock, toBlock).catch(err => {
        console.warn(`⚠️ Lỗi khi tìm Withdrawn events: ${err.message}`);
        return [];
      }),
      pool.queryFilter('Borrowed', fromBlock, toBlock).catch(err => {
        console.warn(`⚠️ Lỗi khi tìm Borrowed events: ${err.message}`);
        return [];
      }),
      pool.queryFilter('Repaid', fromBlock, toBlock).catch(err => {
        console.warn(`⚠️ Lỗi khi tìm Repaid events: ${err.message}`);
        return [];
      }),
      pool.queryFilter('Liquidated', fromBlock, toBlock).catch(err => {
        console.warn(`⚠️ Lỗi khi tìm Liquidated events: ${err.message}`);
        return [];
      })
    ]);
    
    const allEvents = [...suppliedEvents, ...withdrawnEvents, ...borrowedEvents, ...repaidEvents, ...liquidatedEvents];
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n📊 Kết quả tìm kiếm (mất ${duration} giây):`);
    console.log(`   📝 Tổng số events: ${allEvents.length}`);
    console.log(`      - Supplied: ${suppliedEvents.length}`);
    console.log(`      - Withdrawn: ${withdrawnEvents.length}`);
    console.log(`      - Borrowed: ${borrowedEvents.length}`);
    console.log(`      - Repaid: ${repaidEvents.length}`);
    console.log(`      - Liquidated: ${liquidatedEvents.length}\n`);
    
    if (allEvents.length > 0) {
      console.log(`📋 Chi tiết events:\n`);
      
      // Group by block
      const eventsByBlock = {};
      allEvents.forEach(event => {
        if (!eventsByBlock[event.blockNumber]) {
          eventsByBlock[event.blockNumber] = [];
        }
        eventsByBlock[event.blockNumber].push(event);
      });
      
      const blocks = Object.keys(eventsByBlock).sort((a, b) => parseInt(a) - parseInt(b));
      
      console.log(`📦 Events được tìm thấy trong ${blocks.length} blocks:\n`);
      
      blocks.slice(0, 20).forEach(blockNum => {
        const events = eventsByBlock[blockNum];
        console.log(`   Block ${blockNum}: ${events.length} event(s)`);
        events.forEach((event, idx) => {
          console.log(`      ${idx + 1}. ${event.event}`);
          console.log(`         TX: ${event.transactionHash}`);
          if (event.event === 'Supplied' || event.event === 'Withdrawn' || event.event === 'Borrowed') {
            console.log(`         User: ${event.args.user}`);
            console.log(`         Asset: ${event.args.asset}`);
            console.log(`         Amount: ${event.args.amount.toString()}`);
          }
        });
        console.log('');
      });
      
      if (blocks.length > 20) {
        console.log(`   ... và ${blocks.length - 20} blocks khác\n`);
      }
      
      // Tìm block đầu tiên và cuối cùng có events
      const firstBlock = Math.min(...blocks.map(b => parseInt(b)));
      const lastBlock = Math.max(...blocks.map(b => parseInt(b)));
      console.log(`📊 Block range có events: ${firstBlock} - ${lastBlock}`);
      
    } else {
      console.log(`⚠️ KHÔNG TÌM THẤY EVENTS NÀO!\n`);
      console.log(`💡 Có thể:`);
      console.log(`   1. Chưa có giao dịch nào trên contract`);
      console.log(`   2. Contract address không đúng`);
      console.log(`   3. Events không được emit từ contract`);
      console.log(`   4. Blockchain đang ở testnet/local và chưa có transactions\n`);
      
      // Kiểm tra contract có được deploy không
      console.log(`🔍 Kiểm tra contract deployment...`);
      const code = await provider.getCode(process.env.LENDING_POOL_ADDRESS);
      if (code === '0x') {
        console.log(`❌ Không có contract tại address này!`);
      } else {
        console.log(`✅ Contract đã được deploy (code length: ${code.length} characters)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

findEvents();

























