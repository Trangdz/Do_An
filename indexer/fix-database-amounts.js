const { MongoClient } = require('mongodb');
const { ethers } = require('ethers');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

async function fixDatabaseAmounts() {
  console.log('🔧 Fixing amounts in database...\n');
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('lendhub_local');
    
    console.log('✅ Connected to MongoDB\n');
    
    // Get all transactions
    const transactions = await db.collection('transactions').find({}).toArray();
    console.log(`📊 Found ${transactions.length} transactions to check\n`);
    
    let fixed = 0;
    let skipped = 0;
    
    for (const tx of transactions) {
      try {
        // Check if amountRaw exists and is a valid BigInt string
        if (!tx.amountRaw) {
          console.log(`⚠️ Transaction ${tx.hash} has no amountRaw, skipping...`);
          skipped++;
          continue;
        }
        
        // Parse the raw amount (it's in 1e18 format)
        const rawAmount = BigInt(tx.amountRaw);
        
        // Format with 18 decimals (correct for 1e18 format)
        const amountIn1e18 = ethers.formatUnits(rawAmount.toString(), 18);
        const amountFloat = parseFloat(amountIn1e18);
        let correctAmount = amountFloat.toFixed(6);
        // Remove trailing zeros
        correctAmount = correctAmount.replace(/\.?0+$/, '');
        
        // Check if amount needs fixing
        const currentAmount = parseFloat(tx.amount || '0');
        const correctAmountFloat = parseFloat(correctAmount);
        
        // If difference is significant (more than 0.000001), fix it
        if (Math.abs(currentAmount - correctAmountFloat) > 0.000001) {
          console.log(`\n🔧 Fixing transaction ${tx.hash.slice(0, 10)}...`);
          console.log(`   Current amount: ${tx.amount} ${tx.asset?.symbol || 'Unknown'}`);
          console.log(`   Correct amount: ${correctAmount} ${tx.asset?.symbol || 'Unknown'}`);
          
          // Recalculate USD value with correct amount
          const price = tx.amountUSD / currentAmount; // Get price from current USD/amount
          const correctUSD = correctAmountFloat * price;
          
          console.log(`   Current USD: $${tx.amountUSD}`);
          console.log(`   Correct USD: $${correctUSD.toFixed(2)}`);
          
          // Update transaction
          await db.collection('transactions').updateOne(
            { hash: tx.hash },
            {
              $set: {
                amount: correctAmount,
                amountUSD: correctUSD,
                updatedAt: new Date()
              }
            }
          );
          
          fixed++;
          console.log(`   ✅ Fixed!`);
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Error fixing transaction ${tx.hash}:`, error.message);
      }
    }
    
    console.log(`\n✅ Done!`);
    console.log(`   Fixed: ${fixed} transactions`);
    console.log(`   Skipped: ${skipped} transactions (already correct)\n`);
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixDatabaseAmounts();

