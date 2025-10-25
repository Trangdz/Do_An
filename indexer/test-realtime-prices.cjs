const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './config.env' });

async function testRealtimePrices() {
  console.log('🧪 Testing real-time price updates...');
  
  let client;
  
  try {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('lendhub_local');
    
    // Monitor price changes
    console.log('👀 Monitoring price changes...');
    console.log('Press Ctrl+C to stop\n');
    
    let lastPrices = {};
    let updateCount = 0;
    
    const monitorPrices = async () => {
      try {
        const assets = await db.collection('assets').find({}).toArray();
        
        console.log(`\n⏰ ${new Date().toLocaleTimeString()} - Price Update #${++updateCount}`);
        
        for (const asset of assets) {
          const currentPrice = asset.currentPrice;
          const lastPrice = lastPrices[asset.address];
          
          if (currentPrice) {
            if (lastPrice) {
              const change = ((currentPrice - lastPrice) / lastPrice * 100);
              const changeSymbol = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
              const changeText = change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;
              
              console.log(`  ${asset.address.slice(0, 10)}...: $${currentPrice} ${changeSymbol} ${changeText}`);
            } else {
              console.log(`  ${asset.address.slice(0, 10)}...: $${currentPrice} (initial)`);
            }
            
            lastPrices[asset.address] = currentPrice;
          }
        }
        
        // Check for transactions with updated prices
        const recentTxs = await db.collection('transactions')
          .find({})
          .sort({ timestamp: -1 })
          .limit(3)
          .toArray();
        
        if (recentTxs.length > 0) {
          console.log('  📊 Recent transactions:');
          for (const tx of recentTxs) {
            console.log(`    ${tx.type}: ${tx.amount} ${tx.asset.symbol} = $${tx.amountUSD.toFixed(2)}`);
          }
        }
        
      } catch (error) {
        console.error('❌ Error monitoring prices:', error.message);
      }
    };
    
    // Initial check
    await monitorPrices();
    
    // Monitor every 5 seconds
    const interval = setInterval(monitorPrices, 5000);
    
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

testRealtimePrices();
