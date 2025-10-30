/**
 * Check interest snapshots in database
 * Usage: node check-snapshots.cjs [userAddress] [asset]
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'lendhub';

async function checkSnapshots() {
  let client;
  
  try {
    const userAddress = process.argv[2];
    const asset = process.argv[3];
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(MONGODB_DB);
    const collection = db.collection('interest_snapshots');
    
    // Build query
    const query = {};
    if (userAddress) {
      query.user = userAddress.toLowerCase();
    }
    if (asset) {
      query.asset = asset.toUpperCase();
    }
    
    console.log(`🔍 Searching for snapshots...`);
    if (Object.keys(query).length > 0) {
      console.log(`   Query:`, query);
    }
    
    const snapshots = await collection.find(query).toArray();
    
    if (snapshots.length === 0) {
      console.log('❌ No snapshots found');
      return;
    }
    
    console.log(`\n✅ Found ${snapshots.length} snapshot(s):\n`);
    
    snapshots.forEach((doc, i) => {
      const timestamp = new Date(doc.lastUpdateTimestamp * 1000);
      const updatedAt = new Date(doc.updatedAt);
      const now = Math.floor(Date.now() / 1000);
      const ageSeconds = now - doc.lastUpdateTimestamp;
      const ageHours = (ageSeconds / 3600).toFixed(2);
      
      console.log(`${i + 1}. ${doc.asset} - ${doc.user.slice(0, 10)}...`);
      console.log(`   Scaled Balance: ${doc.scaledBalance}`);
      console.log(`   Liquidity Index: ${doc.liquidityIndex}`);
      console.log(`   Liquidity Rate: ${(doc.liquidityRate * 100).toFixed(2)}%`);
      console.log(`   Last Update: ${timestamp.toLocaleString()}`);
      console.log(`   Saved At: ${updatedAt.toLocaleString()}`);
      console.log(`   Age: ${ageHours} hours`);
      
      // Calculate current balance
      if (doc.liquidityRate > 0) {
        const SECONDS_PER_YEAR = 31536000;
        const rateMultiplier = 1 + (doc.liquidityRate * ageSeconds) / SECONDS_PER_YEAR;
        const currentIndex = doc.liquidityIndex * rateMultiplier;
        const currentBalance = doc.scaledBalance * currentIndex;
        const interestEarned = currentBalance - (doc.scaledBalance * doc.liquidityIndex);
        
        console.log(`   ────────────────────────────`);
        console.log(`   Current Balance: ${currentBalance.toFixed(6)}`);
        console.log(`   Interest Earned: ${interestEarned.toFixed(6)}`);
      }
      
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkSnapshots();



