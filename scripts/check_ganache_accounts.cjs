const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking Ganache Accounts");
    console.log("=" .repeat(50));
    
    try {
        // Connect to Ganache
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        
        // Get network info
        const network = await provider.getNetwork();
        console.log("Network:", network.name, "Chain ID:", network.chainId.toString());
        
        // Get block number
        const blockNumber = await provider.getBlockNumber();
        console.log("Current block:", blockNumber);
        
        // Get first few accounts
        console.log("\nAvailable Accounts:");
        for (let i = 0; i < 5; i++) {
            try {
                const signer = await provider.getSigner(i);
                const address = await signer.getAddress();
                const balance = await provider.getBalance(address);
                console.log(`Account ${i}: ${address} (${ethers.formatEther(balance)} ETH)`);
            } catch (error) {
                console.log(`Account ${i}: Error - ${error.message}`);
            }
        }
        
        // Check if contracts exist
        const LendingPoolAddress = "0xbd7291F534fb3fDABF398a1D29D89Df2fe980d19";
        const USDCAddress = "0x4c763c7552204844f595aAE1C727698CF301B3F2";
        
        console.log("\nContract Status:");
        const poolCode = await provider.getCode(LendingPoolAddress);
        const usdcCode = await provider.getCode(USDCAddress);
        
        console.log("LendingPool exists:", poolCode !== "0x");
        console.log("USDC exists:", usdcCode !== "0x");
        
        if (poolCode === "0x") {
            console.log("❌ LendingPool not found! Need to redeploy.");
        }
        if (usdcCode === "0x") {
            console.log("❌ USDC not found! Need to redeploy.");
        }
        
    } catch (error) {
        console.log("❌ Error connecting to Ganache:", error.message);
        console.log("💡 Make sure Ganache is running: npx hardhat node --hostname 127.0.0.1 --port 8545");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
