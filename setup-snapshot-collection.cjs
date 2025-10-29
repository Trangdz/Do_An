/**
 * Setup MongoDB collection for interest snapshots
 * Run: node setup-snapshot-collection.cjs
 */

require('dotenv').config();
// Also try loading from indexer/config.env if root .env doesn't have MONGODB_URI
if (!process.env.MONGODB_URI) {
  require('dotenv').config({ path: './indexer/config.env' });
}

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
// Extract DB name from URI if present, otherwise use default
const MONGODB_DB = process.env.MONGODB_DB || (MONGODB_URI.includes('/lendhub_local') ? 'lendhub_local' : 'lendhub');

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI not found in environment variables');
  console.error('💡 Please create a .env file in the root directory with:');
  console.error('   MONGODB_URI=mongodb://localhost:27017/lendhub_local');
  console.error('   or use MongoDB Atlas: MONGODB_URI=mongodb+srv://...');
  process.exit(1);
}

async function setupCollection() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected');
    
    const db = client.db(MONGODB_DB);
    const collection = db.collection('interest_snapshots');
    
    // 1. Create unique index on user + asset
    console.log('\n📋 Creating unique index on (user, asset)...');
    await collection.createIndex(
      { user: 1, asset: 1 },
      { unique: true, name: 'user_asset_unique' }
    );
    console.log('✅ Index created');
    
    // 2. Create index on user for faster queries
    console.log('\n📋 Creating index on user...');
    await collection.createIndex({ user: 1 });
    console.log('✅ Index created');
    
    // 3. Check existing documents
    console.log('\n📊 Checking existing documents...');
    const count = await collection.countDocuments();
    console.log(`Found ${count} snapshot(s)`);
    
    if (count > 0) {
      console.log('\n📝 Sample documents:');
      const samples = await collection.find({}).limit(3).toArray();
      samples.forEach((doc, i) => {
        console.log(`\n${i + 1}. User: ${doc.user}`);
        console.log(`   Asset: ${doc.asset}`);
        console.log(`   Balance: ${doc.scaledBalance}`);
        console.log(`   Index: ${doc.liquidityIndex}`);
        console.log(`   Rate: ${doc.liquidityRate}`);
        console.log(`   Updated: ${new Date(doc.updatedAt).toLocaleString()}`);
      });
    }
    
    // 4. Show collection stats
    console.log('\n📈 Collection Info:');
    const stats = await db.command({ collStats: 'interest_snapshots' });
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   Count: ${stats.count}`);
    
    console.log('\n✅ Setup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Disconnected');
    }
  }
}

setupCollection();

