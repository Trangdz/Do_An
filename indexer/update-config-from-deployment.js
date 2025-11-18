const fs = require('fs');
const path = require('path');

// Read deployment file
const deploymentPath = path.join(__dirname, '..', 'deployments', 'local-chainlink.json');

if (!fs.existsSync(deploymentPath)) {
  console.error('❌ Deployment file not found:', deploymentPath);
  console.log('💡 Please deploy contracts first: npx hardhat run scripts/deploy_ganache_simple.cjs --network ganache');
  process.exit(1);
}

const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

// Update config.env
const configPath = path.join(__dirname, 'config.env');
let configContent = fs.readFileSync(configPath, 'utf8');

// Update LENDING_POOL_ADDRESS
configContent = configContent.replace(
  /LENDING_POOL_ADDRESS=0x[A-Fa-f0-9]{40}/,
  `LENDING_POOL_ADDRESS=${deployment.contracts.lendingPool}`
);

// Update ORACLE_ADDRESS
configContent = configContent.replace(
  /ORACLE_ADDRESS=0x[A-Fa-f0-9]{40}/,
  `ORACLE_ADDRESS=${deployment.contracts.priceOracle}`
);

fs.writeFileSync(configPath, configContent);

console.log('✅ Updated config.env with addresses from deployment:');
console.log(`   LENDING_POOL_ADDRESS: ${deployment.contracts.lendingPool}`);
console.log(`   ORACLE_ADDRESS: ${deployment.contracts.priceOracle}`);
console.log(`\n📝 Token addresses:`);
console.log(`   WETH: ${deployment.tokens.weth}`);
console.log(`   USDC: ${deployment.tokens.usdc}`);
console.log(`   DAI: ${deployment.tokens.dai}`);
console.log(`   LINK: ${deployment.tokens.link}`);






















