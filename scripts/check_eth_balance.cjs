const { ethers } = require("hardhat");

async function main() {
  const accountAddress = process.argv[2] || "0x87EA1C24418b717D5e331e07d5246748eF3e96fE";
  
  console.log("\n🔍 Checking ETH balance...\n");
  console.log("Account:", accountAddress);
  
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  try {
    const balance = await provider.getBalance(accountAddress);
    const balanceEth = ethers.formatEther(balance);
    
    console.log("ETH Balance:", balanceEth, "ETH");
    console.log("Balance (wei):", balance.toString());
    
    if (balance === 0n) {
      console.log("\n⚠️  Account has 0 ETH!");
      console.log("💡 Ganache should give each account 1000 ETH by default");
    } else {
      console.log("\n✅ Account has ETH!");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);



