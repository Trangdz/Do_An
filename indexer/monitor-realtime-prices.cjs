const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './config.env' });

async function monitorRealtimePrices() {
  console.log('👀 Starting Real-time Price Monitor...');
  console.log('📊 Monitoring price changes every 2 seconds');
  console.log('Press Ctrl+C to stop\n');
  
  let client;
  let lastPrices = {};
  let updateCount = 0;
  
  try {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('lendhub_local');
    
    const monitorPrices = async () => {
      try {
        const assets = await db.collection('assets').find({}).toArray();
        const recentTxs = await db.collection('transactions')
          .find({})
          .sort({ timestamp: -1 })
          .limit(5)
          .toArray();
        
        console.log(`\n⏰ ${new Date().toLocaleTimeString()} - Update #${++updateCount}`);
        console.log('📊 Current Prices:');
        
        for (const asset of assets) {
          const currentPrice = asset.currentPrice;
          const lastPrice = lastPrices[asset.address];
          
          if (currentPrice) {
            if (lastPrice) {
              const change = ((currentPrice - lastPrice) / lastPrice * 100);
              const changeSymbol = change > 0.1 ? '📈' : change < -0.1 ? '📉' : '➡️';
              const changeText = change > 0 ? `+${change.toFixed(3)}%` : `${change.toFixed(3)}%`;
              const confidence = asset.confidence ? `(${Math.round(asset.confidence * 100)}%)` : '';
              
              console.log(`  ${asset.address.slice(0, 12)}...: $${currentPrice.toFixed(6)} ${changeSymbol} ${changeText} ${confidence}`);
            } else {
              console.log(`  ${asset.address.slice(0, 12)}...: $${currentPrice.toFixed(6)} (initial)`);
            }
            
            lastPrices[asset.address] = currentPrice;
          }
        }
        
        if (recentTxs.length > 0) {
          console.log('\n📈 Recent Transactions:');
          for (const tx of recentTxs) {
            const timeAgo = Math.floor((Date.now() - tx.timestamp) / 1000);
            console.log(`  ${tx.type}: ${tx.amount} ${tx.asset.symbol} = $${tx.amountUSD.toFixed(2)} (${timeAgo}s ago)`);
          }
        }
        
        // Show price history
        const priceHistory = await db.collection('priceHistory')
          .find({})
          .sort({ timestamp: -1 })
          .limit(1)
          .toArray();
        
        if (priceHistory.length > 0) {
          const latest = priceHistory[0];
          console.log(`\n📊 Latest Price Data: ${latest.timestamp.toLocaleTimeString()}`);
        }
        
      } catch (error) {
        console.error('❌ Error monitoring prices:', error.message);
      }
    };
    
    // Initial check
    await monitorPrices();
    
    // Monitor every 2 seconds
    const interval = setInterval(monitorPrices, 2000);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping price monitor...');
      clearInterval(interval);
      if (client) client.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

monitorRealtimePrices();
