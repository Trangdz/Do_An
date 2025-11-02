const { ethers } = require("ethers");

async function main() {
  try {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    
    console.log("✅ Ganache is RUNNING");
    console.log("Chain ID:", network.chainId.toString());
    console.log("Block Number:", blockNumber);
    
    // Check deployer account
    const deployerAddress = "0x0B21Dd338B67b0048378d2459BEfd44AE07C76F9";
    const ethBalance = await provider.getBalance(deployerAddress);
    console.log("\n📊 Deployer Account:", deployerAddress);
    console.log("ETH Balance:", ethers.formatEther(ethBalance), "ETH");
    
    // Check token balances
    const tokens = {
      WETH: "0xc3d7a424150Df50076671Ee048c1985b0dd6964A",
      DAI: "0x5EB79DDdC4948d4e9fDb698E204327a1cbAabaf0",
      USDC: "0x5f18b13AAD6C4b371cddc6946aE43a6a2a12d367",
      LINK: "0x8cFACae08536573f872964eEdC51B879Dd8802Da"
    };
    
    const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];
    
    console.log("\n📊 Token Balances:");
    for (const [symbol, address] of Object.entries(tokens)) {
      try {
        const contract = new ethers.Contract(address, ERC20_ABI, provider);
        const balance = await contract.balanceOf(deployerAddress);
        const decimals = await contract.decimals();
        const formatted = ethers.formatUnits(balance, decimals);
        console.log(`${symbol}: ${formatted}`);
      } catch (e) {
        console.log(`${symbol}: Contract not found or error`);
      }
    }
    
  } catch (error) {
    console.log("❌ Ganache is NOT running or not accessible");
    console.log("Error:", error.message);
    console.log("\n💡 Please start Ganache:");
    console.log("npx ganache --port 7545 --chain.chainId 1337 --wallet.mnemonic \"high project east dream doctor glad picnic fiscal assault asthma vendor amateur\" --wallet.totalAccounts 10");
  }
}

main().catch(console.error);










