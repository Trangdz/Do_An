const AdvancedPriceUpdater = require('./advanced-price-updater.cjs');

async function startAdvancedUpdater() {
  console.log('🚀 Starting Advanced Real-time Price Updater...');
  console.log('📊 Features:');
  console.log('  - Multiple price sources (CoinGecko, CoinMarketCap, CryptoCompare)');
  console.log('  - Weighted average pricing');
  console.log('  - Ultra-fast 5-second updates');
  console.log('  - Price change tracking');
  console.log('  - Confidence scoring');
  console.log('  - Price history storage');
  
  const updater = new AdvancedPriceUpdater();
  
  try {
    await updater.start();
    
    // Keep running
    console.log('\n✅ Advanced price updater is running...');
    console.log('🔄 Prices update every 5 seconds');
    console.log('📈 Real-time price changes will be displayed');
    console.log('Press Ctrl+C to stop\n');
    
  } catch (error) {
    console.error('❌ Error starting advanced price updater:', error);
    process.exit(1);
  }
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Stopping advanced price updater...');
    await updater.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Stopping advanced price updater...');
    await updater.stop();
    process.exit(0);
  });
}

startAdvancedUpdater();
