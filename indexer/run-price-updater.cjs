const RealtimePriceUpdater = require('./realtime-price-updater.cjs');

async function startPriceUpdater() {
  console.log('🚀 Starting standalone price updater...');
  
  const updater = new RealtimePriceUpdater();
  
  try {
    await updater.start();
    
    // Keep running
    console.log('✅ Price updater is running...');
    console.log('Press Ctrl+C to stop');
    
  } catch (error) {
    console.error('❌ Error starting price updater:', error);
    process.exit(1);
  }
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Stopping price updater...');
    await updater.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Stopping price updater...');
    await updater.stop();
    process.exit(0);
  });
}

startPriceUpdater();
