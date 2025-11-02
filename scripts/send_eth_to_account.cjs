/*
  💰 Send ETH to Account
  
  Usage: npx hardhat run scripts/send_eth_to_account.cjs --network ganache
*/

const { ethers } = require("hardhat");

async function main() {
  const recipientAddress = "0x87EA1C24418b717D5e331e07d5246748eF3e96fE";
  const amountETH = "999"; // Send 999 ETH (deployer has ~999.97 ETH)
  
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              💰 SENDING ETH TO ACCOUNT                            ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  
  console.log("📦 From:", deployer.address);
  console.log("💰 Deployer Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("📥 To:", recipientAddress);
  console.log("💵 Amount:", amountETH, "ETH\n");

  const recipientBalanceBefore = await ethers.provider.getBalance(recipientAddress);
  console.log("📊 Recipient Balance Before:", ethers.formatEther(recipientBalanceBefore), "ETH\n");

  try {
    const tx = await deployer.sendTransaction({
      to: recipientAddress,
      value: ethers.parseEther(amountETH)
    });
    
    console.log("⏳ Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    await tx.wait();
    
    const recipientBalanceAfter = await ethers.provider.getBalance(recipientAddress);
    
    console.log("\n✅ Transaction confirmed!");
    console.log("📊 Recipient Balance After:", ethers.formatEther(recipientBalanceAfter), "ETH");
    console.log("💰 Amount received:", ethers.formatEther(recipientBalanceAfter - recipientBalanceBefore), "ETH");
    
    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════════════════╗");
    console.log("║                    ✅ ETH SENT SUCCESSFULLY!                     ║");
    console.log("╚════════════════════════════════════════════════════════════════════╝\n");

    console.log("💡 Next steps:");
    console.log("  1. Refresh frontend (Ctrl+F5)");
    console.log("  2. ETH balance should now be visible!\n");

  } catch (error) {
    console.error("\n❌ Error sending ETH:", error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

