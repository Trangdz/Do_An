const fs = require('fs');
const path = require('path');

class ConfigUpdater {
  constructor() {
    this.configPath = './config.env';
  }

  async updatePoolAddress(newAddress) {
    try {
      console.log('🔄 Updating LENDING_POOL_ADDRESS in config.env...');
      
      // Read current config
      let configContent = '';
      if (fs.existsSync(this.configPath)) {
        configContent = fs.readFileSync(this.configPath, 'utf8');
      }
      
      // Update or add LENDING_POOL_ADDRESS
      const addressLine = `LENDING_POOL_ADDRESS=${newAddress}`;
      
      if (configContent.includes('LENDING_POOL_ADDRESS=')) {
        // Update existing line
        configContent = configContent.replace(
          /LENDING_POOL_ADDRESS=.*/,
          addressLine
        );
        console.log('✅ Updated existing LENDING_POOL_ADDRESS');
      } else {
        // Add new line
        configContent += `\n${addressLine}\n`;
        console.log('✅ Added new LENDING_POOL_ADDRESS');
      }
      
      // Write back to file
      fs.writeFileSync(this.configPath, configContent);
      console.log(`📝 Updated config.env with address: ${newAddress}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error updating config:', error);
      return false;
    }
  }

  async updateOracleAddress(newAddress) {
    try {
      console.log('🔄 Updating ORACLE_ADDRESS in config.env...');
      
      // Read current config
      let configContent = '';
      if (fs.existsSync(this.configPath)) {
        configContent = fs.readFileSync(this.configPath, 'utf8');
      }
      
      // Update or add ORACLE_ADDRESS
      const addressLine = `ORACLE_ADDRESS=${newAddress}`;
      
      if (configContent.includes('ORACLE_ADDRESS=')) {
        // Update existing line
        configContent = configContent.replace(
          /ORACLE_ADDRESS=.*/,
          addressLine
        );
        console.log('✅ Updated existing ORACLE_ADDRESS');
      } else {
        // Add new line
        configContent += `\n${addressLine}\n`;
        console.log('✅ Added new ORACLE_ADDRESS');
      }
      
      // Write back to file
      fs.writeFileSync(this.configPath, configContent);
      console.log(`📝 Updated config.env with oracle: ${newAddress}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error updating oracle config:', error);
      return false;
    }
  }

  async updateRpcUrl(newUrl) {
    try {
      console.log('🔄 Updating RPC_URL in config.env...');
      
      // Read current config
      let configContent = '';
      if (fs.existsSync(this.configPath)) {
        configContent = fs.readFileSync(this.configPath, 'utf8');
      }
      
      // Update or add RPC_URL
      const urlLine = `RPC_URL=${newUrl}`;
      
      if (configContent.includes('RPC_URL=')) {
        // Update existing line
        configContent = configContent.replace(
          /RPC_URL=.*/,
          urlLine
        );
        console.log('✅ Updated existing RPC_URL');
      } else {
        // Add new line
        configContent += `\n${urlLine}\n`;
        console.log('✅ Added new RPC_URL');
      }
      
      // Write back to file
      fs.writeFileSync(this.configPath, configContent);
      console.log(`📝 Updated config.env with RPC: ${newUrl}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error updating RPC config:', error);
      return false;
    }
  }

  async updateMongoUri(newUri) {
    try {
      console.log('🔄 Updating MONGODB_URI in config.env...');
      
      // Read current config
      let configContent = '';
      if (fs.existsSync(this.configPath)) {
        configContent = fs.readFileSync(this.configPath, 'utf8');
      }
      
      // Update or add MONGODB_URI
      const uriLine = `MONGODB_URI=${newUri}`;
      
      if (configContent.includes('MONGODB_URI=')) {
        // Update existing line
        configContent = configContent.replace(
          /MONGODB_URI=.*/,
          uriLine
        );
        console.log('✅ Updated existing MONGODB_URI');
      } else {
        // Add new line
        configContent += `\n${uriLine}\n`;
        console.log('✅ Added new MONGODB_URI');
      }
      
      // Write back to file
      fs.writeFileSync(this.configPath, configContent);
      console.log(`📝 Updated config.env with MongoDB: ${newUri}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error updating MongoDB config:', error);
      return false;
    }
  }

  async updateAllAddresses(addresses) {
    try {
      console.log('🚀 Updating all contract addresses...');
      
      const { poolAddress, oracleAddress, rpcUrl, mongoUri } = addresses;
      
      if (poolAddress) {
        await this.updatePoolAddress(poolAddress);
      }
      
      if (oracleAddress) {
        await this.updateOracleAddress(oracleAddress);
      }
      
      if (rpcUrl) {
        await this.updateRpcUrl(rpcUrl);
      }
      
      if (mongoUri) {
        await this.updateMongoUri(mongoUri);
      }
      
      console.log('✅ All addresses updated successfully!');
      return true;
      
    } catch (error) {
      console.error('❌ Error updating addresses:', error);
      return false;
    }
  }

  readCurrentConfig() {
    try {
      if (!fs.existsSync(this.configPath)) {
        console.log('⚠️ Config file not found');
        return null;
      }
      
      const content = fs.readFileSync(this.configPath, 'utf8');
      const lines = content.split('\n');
      const config = {};
      
      lines.forEach(line => {
        if (line.includes('=') && !line.startsWith('#')) {
          const [key, value] = line.split('=');
          config[key.trim()] = value.trim();
        }
      });
      
      return config;
      
    } catch (error) {
      console.error('❌ Error reading config:', error);
      return null;
    }
  }
}

// Export for use in other scripts
module.exports = ConfigUpdater;

// CLI usage
if (require.main === module) {
  const updater = new ConfigUpdater();
  
  // Example usage
  const addresses = {
    poolAddress: '0x99E9FeE4528ab3eD69e07E775cE868209f5FC3d7',
    oracleAddress: '0x211047ff1b0181fE687D15e02357c77782be7B89',
    rpcUrl: 'http://127.0.0.1:7545',
    mongoUri: 'mongodb://localhost:27017/lendhub_local'
  };
  
  updater.updateAllAddresses(addresses).then(success => {
    if (success) {
      console.log('🎉 Config update completed!');
    } else {
      console.log('❌ Config update failed!');
    }
  });
}
