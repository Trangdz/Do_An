const fs = require('fs');

// Simple script to update config.env with new addresses
function updateConfig() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node update-config.cjs <pool_address> [oracle_address]');
    console.log('Example: node update-config.cjs 0x99E9FeE4528ab3eD69e07E775cE868209f5FC3d7');
    process.exit(1);
  }
  
  const poolAddress = args[0];
  const oracleAddress = args[1] || '0x211047ff1b0181fE687D15e02357c77782be7B89';
  
  try {
    console.log('🔄 Updating config.env...');
    
    // Read current config
    let configContent = '';
    if (fs.existsSync('./config.env')) {
      configContent = fs.readFileSync('./config.env', 'utf8');
    }
    
    // Update LENDING_POOL_ADDRESS
    if (configContent.includes('LENDING_POOL_ADDRESS=')) {
      configContent = configContent.replace(
        /LENDING_POOL_ADDRESS=.*/,
        `LENDING_POOL_ADDRESS=${poolAddress}`
      );
      console.log(`✅ Updated LENDING_POOL_ADDRESS: ${poolAddress}`);
    } else {
      configContent += `\nLENDING_POOL_ADDRESS=${poolAddress}\n`;
      console.log(`✅ Added LENDING_POOL_ADDRESS: ${poolAddress}`);
    }
    
    // Update ORACLE_ADDRESS
    if (configContent.includes('ORACLE_ADDRESS=')) {
      configContent = configContent.replace(
        /ORACLE_ADDRESS=.*/,
        `ORACLE_ADDRESS=${oracleAddress}`
      );
      console.log(`✅ Updated ORACLE_ADDRESS: ${oracleAddress}`);
    } else {
      configContent += `\nORACLE_ADDRESS=${oracleAddress}\n`;
      console.log(`✅ Added ORACLE_ADDRESS: ${oracleAddress}`);
    }
    
    // Write back to file
    fs.writeFileSync('./config.env', configContent);
    
    console.log('🎉 Config updated successfully!');
    console.log('📋 Current config:');
    console.log(`   🏦 Pool: ${poolAddress}`);
    console.log(`   💰 Oracle: ${oracleAddress}`);
    console.log(`   🔗 RPC: http://127.0.0.1:7545`);
    console.log(`   🗄️ MongoDB: mongodb://localhost:27017/lendhub_local`);
    
  } catch (error) {
    console.error('❌ Error updating config:', error);
    process.exit(1);
  }
}

updateConfig();
