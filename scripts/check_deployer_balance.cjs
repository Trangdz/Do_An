const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer Address:", deployer.address);
  console.log("ETH Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  // Token addresses from deployment
  const tokens = {
    WETH: "0xc3d7a424150Df50076671Ee048c1985b0dd6964A",
    DAI: "0x5EB79DDdC4948d4e9fDb698E204327a1cbAabaf0",
    USDC: "0x5f18b13AAD6C4b371cddc6946aE43a6a2a12d367",
    LINK: "0x8cFACae08536573f872964eEdC51B879Dd8802Da"
  };
  
  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
  ];
  
  console.log("\n📊 Token Balances:");
  for (const [symbol, address] of Object.entries(tokens)) {
    const contract = new ethers.Contract(address, ERC20_ABI, ethers.provider);
    const balance = await contract.balanceOf(deployer.address);
    const decimals = await contract.decimals();
    const formatted = ethers.formatUnits(balance, decimals);
    console.log(`${symbol}: ${formatted}`);
  }
}

main().catch(console.error);








