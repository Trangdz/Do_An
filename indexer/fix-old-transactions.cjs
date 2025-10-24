const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './config.env' });

async function fixOldTransactions() {
  console.log('🔧 Fixing old transactions...');
  
  let client;
  
  try {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('lendhub_local');
    const txCollection = db.collection('transactions');
    
    // Hardcoded prices and symbols
    const knownAssets = {
      '0xf7087e183958b9292a6a2DeDA6D4Bb8FEea50472': { symbol: 'USDC', price: 1.0 },
      '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': { symbol: 'WETH', price: 2000.0 },
      '0x7e1600E50472a5850A295cB8eeEB5C323c1f6254': { symbol: 'DAI', price: 1.0 },
      '0x92c2Dc1Fc29b180de2dA0FdB217823D939b6E0A5': { symbol: 'WETH', price: 2000.0 }
    };
    
    // Lấy tất cả transactions có vấn đề
    const problematicTxs = await txCollection.find({
      $or: [
        { type: 'Unknown' },
        { 'asset.symbol': 'UNKNOWN' },
        { amountUSD: 0 }
      ]
    }).toArray();
    
    console.log(`📊 Found ${problematicTxs.length} problematic transactions`);
    
    for (const tx of problematicTxs) {
      console.log(`🔧 Fixing transaction: ${tx.hash.slice(0, 10)}...`);
      
      const assetInfo = knownAssets[tx.asset.address];
      if (assetInfo) {
        const amountFloat = parseFloat(tx.amount);
        const usdValue = amountFloat * assetInfo.price;
        
        await txCollection.updateOne(
          { _id: tx._id },
          {
            $set: {
              type: tx.type === 'Unknown' ? 'Lend' : tx.type,
              'asset.symbol': assetInfo.symbol,
              amountUSD: usdValue,
              updatedAt: new Date()
            }
          }
        );
        
        console.log(`✅ Fixed: ${tx.amount} ${assetInfo.symbol} = $${usdValue}`);
      } else {
        console.log(`⚠️ Unknown asset: ${tx.asset.address}`);
      }
    }
    
    // Kiểm tra kết quả
    const fixedCount = await txCollection.countDocuments({ amountUSD: { $gt: 0 } });
    const totalCount = await txCollection.countDocuments();
    
    console.log(`\n🎉 Fix completed!`);
    console.log(`📊 Total transactions: ${totalCount}`);
    console.log(`💰 Transactions with USD value: ${fixedCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connection closed');
    }
  }
}

fixOldTransactions();
