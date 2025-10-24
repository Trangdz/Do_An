const { MongoClient } = require('mongodb');
const { ethers } = require('ethers');
require('dotenv').config({ path: './config.env' });

async function testSupplyEvents() {
  let client;
  
  try {
    console.log('🧪 Testing Supply Events Detection...');
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
    
    // Define the correct ABI for LendingPool events (from actual contract)
    const poolABI = [
      "event Supplied(address indexed user, address indexed asset, uint256 amount)",
      "event Borrowed(address indexed user, address indexed asset, uint256 amount)",
      "event Withdrawn(address indexed user, address indexed asset, uint256 amount)",
      "event Repaid(address indexed user, address indexed onBehalfOf, address indexed asset, uint256 amount)",
      "event ReserveDataUpdated(address indexed asset, uint256 liquidityRate, uint256 borrowRate, uint256 timestamp)",
      "event CollateralEnabled(address indexed user, address indexed asset)",
      "event CollateralDisabled(address indexed user, address indexed asset)",
      "event Liquidated(address indexed user, address indexed asset, uint256 amount, uint256 timestamp)",
      "event CollateralSet(address indexed user, address indexed asset, bool useAsCollateral)"
    ];
    
    const poolContract = new ethers.Contract(poolAddress, poolABI, provider);
    
    // Get events from last 20 blocks
    const fromBlock = Math.max(0, latestBlock - 20);
    const toBlock = latestBlock;
    
    console.log(`🔍 Scanning blocks ${fromBlock} to ${toBlock} for events...`);
    
    // Get all events
    const supplyEvents = await poolContract.queryFilter('Supplied', fromBlock, toBlock);
    const borrowEvents = await poolContract.queryFilter('Borrowed', fromBlock, toBlock);
    const withdrawEvents = await poolContract.queryFilter('Withdrawn', fromBlock, toBlock);
    const repayEvents = await poolContract.queryFilter('Repaid', fromBlock, toBlock);
    const reserveDataEvents = await poolContract.queryFilter('ReserveDataUpdated', fromBlock, toBlock);
    
    console.log(`📊 Found events:`);
    console.log(`   - Supplied: ${supplyEvents.length}`);
    console.log(`   - Borrowed: ${borrowEvents.length}`);
    console.log(`   - Withdrawn: ${withdrawEvents.length}`);
    console.log(`   - Repaid: ${repayEvents.length}`);
    console.log(`   - ReserveDataUpdated: ${reserveDataEvents.length}`);
    
    // Process supply events
    if (supplyEvents.length > 0) {
      console.log(`\n📝 Processing ${supplyEvents.length} Supplied events...`);
      
      for (const event of supplyEvents) {
        try {
          console.log(`\n🔍 Processing Supplied event:`);
          console.log(`   - Transaction: ${event.transactionHash}`);
          console.log(`   - Block: ${event.blockNumber}`);
          console.log(`   - User: ${event.args.user}`);
          console.log(`   - Asset: ${event.args.asset}`);
          console.log(`   - Amount: ${ethers.formatEther(event.args.amount)}`);
          
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
            type: 'Supplied',
            timestamp: Date.now(), // Use current timestamp
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
          console.log(`✅ Inserted Supplied transaction: ${result.insertedId}`);
          
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
          console.log(`✅ Updated user stats`);
          
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
          console.log(`✅ Updated asset stats`);
          
        } catch (error) {
          console.error(`❌ Error processing Supplied event:`, error.message);
        }
      }
    } else {
      console.log(`\n❌ No Supplied events found in blocks ${fromBlock} to ${toBlock}`);
      console.log(`💡 This could mean:`);
      console.log(`   1. No supply transactions have been made`);
      console.log(`   2. Events are not being emitted by the contract`);
      console.log(`   3. ABI is incorrect`);
      console.log(`   4. Contract address is wrong`);
    }
    
    // Check if there are any transactions in the database
    console.log(`\n📊 Current database state:`);
    const transactionCount = await db.collection('transactions').countDocuments();
    const userCount = await db.collection('users').countDocuments();
    const assetCount = await db.collection('assets').countDocuments();
    
    console.log(`   - Transactions: ${transactionCount}`);
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Assets: ${assetCount}`);
    
    // Show recent transactions
    if (transactionCount > 0) {
      console.log(`\n📝 Recent transactions:`);
      const recentTransactions = await db.collection('transactions')
        .find({})
        .sort({ timestamp: -1 })
        .limit(5)
        .toArray();
      
      recentTransactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.type}: ${tx.amount} ${tx.asset.symbol || 'UNKNOWN'}`);
        console.log(`      Hash: ${tx.hash}`);
        console.log(`      User: ${tx.user}`);
        console.log(`      Block: ${tx.blockNumber}`);
        console.log(`      Time: ${new Date(tx.timestamp).toLocaleString()}`);
      });
    }
    
    console.log('\n✅ Supply events test completed!');
    
  } catch (error) {
    console.error('❌ Supply events test failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

testSupplyEvents();
