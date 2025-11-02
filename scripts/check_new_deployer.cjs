const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("\n🔍 Current Deployer Account:");
  console.log("Address:", deployer.address);
  console.log("ETH Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  // New token addresses from latest deployment
  const tokens = {
    WETH: "0x5f80375E3501088449b2E8Dbb1264Ee8567c32Cf",
    DAI: "0xBf4187dbfD1fa444fD4439A7bebC80a418b869d6",
    USDC: "0x5b67574CCce86a9595892D7c4dbFD5363f63DF7b",
    LINK: "0xc87d865f096D242f6EFA1110Ab2a4FaDA8dCF7f2"
  };
  
  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
  ];
  
  console.log("\n📊 Token Balances:");
  for (const [symbol, address] of Object.entries(tokens)) {
    try {
      const contract = new ethers.Contract(address, ERC20_ABI, ethers.provider);
      const balance = await contract.balanceOf(deployer.address);
      const decimals = await contract.decimals();
      const formatted = ethers.formatUnits(balance, decimals);
      console.log(`${symbol}: ${formatted}`);
    } catch (e) {
      console.log(`${symbol}: ERROR - ${e.message}`);
    }
  }
  
  // Get private key
  console.log("\n🔑 Private Key for MetaMask:");
  console.log("Use this account address:", deployer.address);
}

main().catch(console.error);








