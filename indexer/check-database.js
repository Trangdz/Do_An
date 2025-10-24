const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './config.env' });

async function checkDatabase() {
  let client;
  
  try {
    console.log('🔍 Checking MongoDB database...');
    console.log(`📊 MongoDB URI: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
    
    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('lendhub');
    
    // Check collections
    console.log('\n📋 Collections:');
    const collections = await db.listCollections().toArray();
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    // Check transactions
    console.log('\n📝 Transactions:');
    const transactions = await db.collection('transactions').find({}).sort({ timestamp: -1 }).limit(5).toArray();
    console.log(`   Total: ${await db.collection('transactions').countDocuments()}`);
    transactions.forEach(tx => {
      console.log(`   - ${tx.type}: ${tx.amount} ${tx.asset.symbol} (${tx.amountUSD} USD)`);
      console.log(`     Hash: ${tx.hash}`);
      console.log(`     User: ${tx.user}`);
      console.log(`     Block: ${tx.blockNumber}`);
      console.log(`     Time: ${new Date(tx.timestamp).toLocaleString()}`);
      console.log('');
    });
    
    // Check users
    console.log('👥 Users:');
    const users = await db.collection('users').find({}).toArray();
    console.log(`   Total: ${users.length}`);
    users.forEach(user => {
      console.log(`   - ${user.address}: ${user.totalTransactions} tx, ${user.totalVolume} USD`);
    });
    
    // Check assets
    console.log('\n💰 Assets:');
    const assets = await db.collection('assets').find({}).toArray();
    console.log(`   Total: ${assets.length}`);
    assets.forEach(asset => {
      console.log(`   - ${asset.symbol}: ${asset.totalTransactions} tx, ${asset.totalVolume} USD`);
    });
    
    // Check metadata
    console.log('\n📊 Metadata:');
    const metadata = await db.collection('metadata').find({}).toArray();
    metadata.forEach(meta => {
      console.log(`   - ${meta.key}: ${meta.value}`);
    });
    
    // Check for recent events
    console.log('\n🔍 Recent Events (last 10 minutes):');
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    const recentEvents = await db.collection('transactions').find({
      timestamp: { $gte: tenMinutesAgo }
    }).sort({ timestamp: -1 }).toArray();
    
    if (recentEvents.length > 0) {
      console.log(`   Found ${recentEvents.length} recent events:`);
      recentEvents.forEach(event => {
        console.log(`   - ${event.type}: ${event.amount} ${event.asset.symbol} at block ${event.blockNumber}`);
      });
    } else {
      console.log('   No recent events found');
    }
    
    console.log('\n✅ Database check completed!');
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

checkDatabase();

