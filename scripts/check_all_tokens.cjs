const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Checking all token balances for:", deployer.address);
    
    // Token addresses from latest deployment
    const tokens = {
        WETH: "0x58E8D7188AcC7F49c2326476e5C34878eba951d2",
        DAI: "0x30F7a1B59A98056C07daA2101672abAc8e159f14", 
        USDC: "0x8A12e8a78819cf21FFAfd49da5f09f6C48dA4E41",
        LINK: "0xe7512f676D5fcBDF7B81B617F79a02E015838445"
    };
    
    for (const [symbol, address] of Object.entries(tokens)) {
        try {
            const contract = new ethers.Contract(address, [
                "function balanceOf(address) view returns (uint256)",
                "function decimals() view returns (uint8)"
            ], ethers.provider);
            
            const balance = await contract.balanceOf(deployer.address);
            const decimals = await contract.decimals();
            
            if (symbol === 'USDC') {
                console.log(`${symbol} Balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
            } else {
                console.log(`${symbol} Balance: ${ethers.formatEther(balance)} ${symbol}`);
            }
        } catch (error) {
            console.log(`${symbol} Error:`, error.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
