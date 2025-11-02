const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ConfigUpdater = require('./auto-update-config.cjs');

class AutoDeployAndUpdate {
  constructor() {
    this.configUpdater = new ConfigUpdater();
    this.deployScript = '../scripts/deploy.js'; // Adjust path as needed
  }

  async deployContracts() {
    try {
      console.log('🚀 Starting contract deployment...');
      
      // Change to project root directory
      const projectRoot = path.resolve(__dirname, '..');
      process.chdir(projectRoot);
      
      console.log(`📁 Working directory: ${process.cwd()}`);
      
      // Run deployment script
      console.log('⏳ Deploying contracts...');
      const deployOutput = execSync('npx hardhat run scripts/deploy.js --network ganache', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      console.log('✅ Deployment completed!');
      console.log('📋 Deployment output:');
      console.log(deployOutput);
      
      return this.parseDeploymentOutput(deployOutput);
      
    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      return null;
    }
  }

  parseDeploymentOutput(output) {
    try {
      console.log('🔍 Parsing deployment output...');
      
      const addresses = {};
      
      // Look for contract addresses in the output
      const lines = output.split('\n');
      
      lines.forEach(line => {
        // Look for patterns like "LendingPool deployed to: 0x..."
        if (line.includes('LendingPool deployed to:')) {
          const match = line.match(/LendingPool deployed to: (0x[a-fA-F0-9]{40})/);
          if (match) {
            addresses.poolAddress = match[1];
            console.log(`🏦 Found LendingPool: ${match[1]}`);
          }
        }
        
        // Look for Oracle addresses
        if (line.includes('Oracle deployed to:')) {
          const match = line.match(/Oracle deployed to: (0x[a-fA-F0-9]{40})/);
          if (match) {
            addresses.oracleAddress = match[1];
            console.log(`💰 Found Oracle: ${match[1]}`);
          }
        }
        
        // Look for other contract addresses
        if (line.includes('deployed to:') && line.includes('0x')) {
          const match = line.match(/deployed to: (0x[a-fA-F0-9]{40})/);
          if (match && !addresses.poolAddress) {
            addresses.poolAddress = match[1];
            console.log(`📝 Found contract: ${match[1]}`);
          }
        }
      });
      
      return addresses;
      
    } catch (error) {
      console.error('❌ Error parsing deployment output:', error);
      return {};
    }
  }

  async updateConfigWithAddresses(addresses) {
    try {
      console.log('🔄 Updating config with deployed addresses...');
      
      // Change back to indexer directory
      process.chdir(path.resolve(__dirname));
      
      const updateData = {
        poolAddress: addresses.poolAddress,
        oracleAddress: addresses.oracleAddress,
        rpcUrl: 'http://127.0.0.1:8545',
        mongoUri: 'mongodb://localhost:27017/lendhub_local'
      };
      
      const success = await this.configUpdater.updateAllAddresses(updateData);
      
      if (success) {
        console.log('✅ Config updated successfully!');
        console.log('📋 Updated addresses:');
        console.log(`   🏦 Pool: ${addresses.poolAddress || 'Not found'}`);
        console.log(`   💰 Oracle: ${addresses.oracleAddress || 'Not found'}`);
        console.log(`   🔗 RPC: ${updateData.rpcUrl}`);
        console.log(`   🗄️ MongoDB: ${updateData.mongoUri}`);
      } else {
        console.log('❌ Config update failed!');
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ Error updating config:', error);
      return false;
    }
  }

  async run() {
    try {
      console.log('🚀 Starting auto-deploy and config update...');
      
      // Step 1: Deploy contracts
      const addresses = await this.deployContracts();
      
      if (!addresses || Object.keys(addresses).length === 0) {
        console.log('⚠️ No addresses found in deployment output');
        console.log('💡 You may need to manually update config.env');
        return false;
      }
      
      // Step 2: Update config
      const configUpdated = await this.updateConfigWithAddresses(addresses);
      
      if (configUpdated) {
        console.log('🎉 Auto-deploy and config update completed!');
        console.log('✅ Ready to start indexer with new addresses');
      } else {
        console.log('❌ Config update failed');
      }
      
      return configUpdated;
      
    } catch (error) {
      console.error('❌ Auto-deploy failed:', error);
      return false;
    }
  }
}

// Export for use in other scripts
module.exports = AutoDeployAndUpdate;

// CLI usage
if (require.main === module) {
  const autoDeploy = new AutoDeployAndUpdate();
  
  autoDeploy.run().then(success => {
    if (success) {
      console.log('🎉 Auto-deploy completed successfully!');
      console.log('💡 You can now run: node index.js');
    } else {
      console.log('❌ Auto-deploy failed!');
      process.exit(1);
    }
  });
}

