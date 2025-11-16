const { MongoClient } = require('mongodb');
const { ethers } = require('ethers');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

async function checkDatabaseAmounts() {
  console.log('🔍 Kiểm tra amounts trong database...\n');
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('lendhub_local');
    
    console.log('✅ Connected to MongoDB\n');
    
    // Get recent transactions
    const transactions = await db.collection('transactions')
      .find({})
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();
    
    console.log(`📊 Found ${transactions.length} recent transactions:\n`);
    
    transactions.forEach((tx, index) => {
      console.log(`\n${index + 1}. Transaction ${tx.hash.slice(0, 10)}...`);
      console.log(`   Type: ${tx.type}`);
      console.log(`   Asset: ${tx.asset?.symbol || 'Unknown'} (${tx.asset?.decimals || 'N/A'} decimals)`);
      console.log(`   Amount (stored): ${tx.amount}`);
      console.log(`   Amount Raw: ${tx.amountRaw || 'N/A'}`);
      console.log(`   Amount USD: ${tx.amountUSD}`);
      
      // Check if amountRaw exists
      if (tx.amountRaw) {
        const rawAmount = BigInt(tx.amountRaw);
        const formatted18 = ethers.formatUnits(rawAmount.toString(), 18);
        const formatted6 = parseFloat(formatted18).toFixed(6);
        
        console.log(`   📊 Format với 18 decimals: ${formatted18}`);
        console.log(`   📊 Format với 6 decimals: ${formatted6}`);
        
        // Compare
        const storedAmount = parseFloat(tx.amount || '0');
        const correctAmount = parseFloat(formatted6);
        
        if (Math.abs(storedAmount - correctAmount) > 0.000001) {
          console.log(`   ❌ SAI! Stored: ${storedAmount}, Correct: ${correctAmount}`);
        } else {
          console.log(`   ✅ ĐÚNG!`);
        }
      } else {
        console.log(`   ⚠️ Không có amountRaw để kiểm tra`);
      }
    });
    
    await client.close();
    console.log('\n✅ Hoàn thành!\n');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

checkDatabaseAmounts();














