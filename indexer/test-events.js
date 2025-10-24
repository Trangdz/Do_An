const { MongoClient } = require('mongodb');
const { ethers } = require('ethers');
require('dotenv').config({ path: './config.env' });

async function testEvents() {
  let client;
  
  try {
    console.log('🧪 Testing blockchain events...');
    console.log(`📊 MongoDB URI: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
    console.log(`🔗 RPC URL: ${process.env.RPC_URL}`);
    console.log(`🏦 Pool Address: ${process.env.LENDING_POOL_ADDRESS}`);
    
    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('lendhub');
    
    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const poolAddress = process.env.LENDING_POOL_ADDRESS;
    
    console.log('✅ Connected to blockchain');
    
    // Get latest block
    const latestBlock = await provider.getBlockNumber();
    console.log(`📦 Latest block: ${latestBlock}`);
    
    // Get pool contract (we'll use a simple ABI for testing)
    const poolABI = [
      "event Supply(address indexed user, address indexed asset, uint256 amount, uint256 timestamp)",
      "event Borrow(address indexed user, address indexed asset, uint256 amount, uint256 timestamp)",
      "event Withdraw(address indexed user, address indexed asset, uint256 amount, uint256 timestamp)",
      "event Repay(address indexed user, address indexed asset, uint256 amount, uint256 timestamp)"
    ];
    
    const poolContract = new ethers.Contract(poolAddress, poolABI, provider);
    
    // Get events from last 10 blocks
    const fromBlock = Math.max(0, latestBlock - 10);
    const toBlock = latestBlock;
    
    console.log(`🔍 Scanning blocks ${fromBlock} to ${toBlock}...`);
    
    // Get all events
    const supplyEvents = await poolContract.queryFilter('Supply', fromBlock, toBlock);
    const borrowEvents = await poolContract.queryFilter('Borrow', fromBlock, toBlock);
    const withdrawEvents = await poolContract.queryFilter('Withdraw', fromBlock, toBlock);
    const repayEvents = await poolContract.queryFilter('Repay', fromBlock, toBlock);
    
    console.log(`📊 Found events:`);
    console.log(`   - Supply: ${supplyEvents.length}`);
    console.log(`   - Borrow: ${borrowEvents.length}`);
    console.log(`   - Withdraw: ${withdrawEvents.length}`);
    console.log(`   - Repay: ${repayEvents.length}`);
    
    // Process events
    const allEvents = [
      ...supplyEvents.map(e => ({ ...e, type: 'Supply' })),
      ...borrowEvents.map(e => ({ ...e, type: 'Borrow' })),
      ...withdrawEvents.map(e => ({ ...e, type: 'Withdraw' })),
      ...repayEvents.map(e => ({ ...e, type: 'Repay' }))
    ];
    
    console.log(`\n📝 Processing ${allEvents.length} events...`);
    
    for (const event of allEvents) {
      try {
        // Create transaction record
        const transaction = {
          hash: event.transactionHash,
          user: event.args.user,
          asset: {
            address: event.args.asset,
            symbol: 'UNKNOWN', // We'll need to map this
            decimals: 18
          },
          amount: ethers.formatEther(event.args.amount),
          amountUSD: 0, // We'll need to calculate this
          type: event.type,
          timestamp: Date.now(),
          blockNumber: event.blockNumber,
          gas: {
            used: '21000',
            price: '20000000000',
            fee: '0.00042'
          },
          status: 'success',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Insert transaction
        const result = await db.collection('transactions').insertOne(transaction);
        console.log(`✅ Inserted ${event.type} event: ${result.insertedId}`);
        
        // Update user stats
        await db.collection('users').updateOne(
          { address: event.args.user },
          { 
            $inc: { totalTransactions: 1 },
            $set: { 
              lastActivity: new Date(),
              updatedAt: new Date()
            }
          },
          { upsert: true }
        );
        
        // Update asset stats
        await db.collection('assets').updateOne(
          { address: event.args.asset },
          { 
            $inc: { totalTransactions: 1 },
            $set: { 
              updatedAt: new Date()
            }
          },
          { upsert: true }
        );
        
      } catch (error) {
        console.error(`❌ Error processing event:`, error.message);
      }
    }
    
    // Check final counts
    console.log('\n📊 Final database state:');
    const transactionCount = await db.collection('transactions').countDocuments();
    const userCount = await db.collection('users').countDocuments();
    const assetCount = await db.collection('assets').countDocuments();
    
    console.log(`   Transactions: ${transactionCount}`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Assets: ${assetCount}`);
    
    console.log('\n✅ Event testing completed!');
    
  } catch (error) {
    console.error('❌ Event testing failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

testEvents();