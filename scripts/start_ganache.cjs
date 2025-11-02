const { spawn } = require('child_process');

console.log('🚀 Starting Ganache...');

// Start Ganache with specific configuration
const ganache = spawn('npx', ['ganache', '--port', '8545', '--chainId', '1337', '--gasLimit', '10000000'], {
  stdio: 'inherit',
  shell: true
});

ganache.on('error', (err) => {
  console.error('❌ Failed to start Ganache:', err);
});

ganache.on('close', (code) => {
  console.log(`Ganache process exited with code ${code}`);
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping Ganache...');
  ganache.kill();
  process.exit(0);
});

console.log('✅ Ganache started on http://127.0.0.1:8545');
console.log('Press Ctrl+C to stop');
