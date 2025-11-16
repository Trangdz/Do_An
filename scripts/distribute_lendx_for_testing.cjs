const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// LENDX Token ABI (simplified)
const LENDX_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║        🎁 DISTRIBUTING LENDX TOKENS FOR TESTING                   ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  console.log("📋 Deployer:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("📋 Balance:", ethers.formatEther(balance), "ETH\n");

  // Read addresses
  const addressesPath = path.join(__dirname, "../lendhub-frontend-nextjs/src/addresses.js");
  let addressesContent = fs.readFileSync(addressesPath, "utf8");
  
  // Extract LENDX token address
  const lendxMatch = addressesContent.match(/export const LENDXTokenAddress = "([^"]+)"/);
  if (!lendxMatch) {
    throw new Error("LENDXTokenAddress not found in addresses.js");
  }
  const LENDXTokenAddress = lendxMatch[1];
  console.log("📋 LENDX Token Address:", LENDXTokenAddress);

  // Extract user addresses
  const userAddresses = [];
  for (let i = 0; i < 10; i++) {
    const userMatch = addressesContent.match(new RegExp(`export const User${i}Address = "([^"]+)"`));
    if (userMatch) {
      userAddresses.push(userMatch[1]);
    }
  }

  console.log(`\n📋 Found ${userAddresses.length} demo users\n`);

  // Connect to LENDX token contract
  const lendxToken = await ethers.getContractAt(LENDX_ABI, LENDXTokenAddress, deployer);

  // Check deployer balance
  const deployerBalance = await lendxToken.balanceOf(deployer.address);
  console.log("📋 Deployer LENDX Balance:", ethers.formatEther(deployerBalance), "LENDX\n");

  // Distribution plan:
  // Proposers (>= 10,000 LENDX): Can create proposals
  // Voters (< 10,000 LENDX): Can only vote
  const distribution = [
    { user: 0, amount: 50000, role: "Proposer" },   // User0: 50K - Proposer
    { user: 1, amount: 20000, role: "Proposer" },  // User1: 20K - Proposer
    { user: 2, amount: 15000, role: "Proposer" },  // User2: 15K - Proposer
    { user: 3, amount: 5000, role: "Voter" },      // User3: 5K - Voter (no proposal rights)
    { user: 4, amount: 3000, role: "Voter" },     // User4: 3K - Voter
    { user: 5, amount: 1000, role: "Voter" },     // User5: 1K - Voter
    { user: 6, amount: 500, role: "Voter" },      // User6: 500 - Voter
    { user: 7, amount: 0, role: "No tokens" },   // User7: 0 - No tokens
    { user: 8, amount: 0, role: "No tokens" },   // User8: 0 - No tokens
    { user: 9, amount: 0, role: "No tokens" },   // User9: 0 - No tokens
  ];

  console.log("📋 Distribution Plan:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  distribution.forEach(({ user, amount, role }) => {
    const address = userAddresses[user];
    const emoji = amount >= 10000 ? "👑" : amount > 0 ? "🗳️" : "👤";
    console.log(`${emoji} User${user}: ${amount.toLocaleString()} LENDX - ${role}`);
    if (address) {
      console.log(`   Address: ${address}`);
    }
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Calculate total needed
  const totalNeeded = distribution.reduce((sum, d) => sum + d.amount, 0);
  const totalNeededWei = ethers.parseEther(totalNeeded.toString());
  console.log(`📋 Total LENDX needed: ${totalNeeded.toLocaleString()} LENDX\n`);

  if (deployerBalance < totalNeededWei) {
    throw new Error(`Insufficient LENDX balance. Need ${totalNeeded} LENDX, have ${ethers.formatEther(deployerBalance)} LENDX`);
  }

  // Distribute tokens
  console.log("🚀 Starting distribution...\n");
  
  for (const { user, amount, role } of distribution) {
    if (amount === 0) {
      console.log(`⏭️  Skipping User${user} (0 LENDX)`);
      continue;
    }

    const userAddress = userAddresses[user];
    if (!userAddress) {
      console.log(`⚠️  User${user} address not found, skipping`);
      continue;
    }

    try {
      // Check current balance
      const currentBalance = await lendxToken.balanceOf(userAddress);
      const currentBalanceFormatted = ethers.formatEther(currentBalance);
      
      if (parseFloat(currentBalanceFormatted) >= amount) {
        console.log(`✅ User${user} already has ${currentBalanceFormatted} LENDX (>= ${amount}), skipping`);
        continue;
      }

      // Calculate amount to transfer
      const amountWei = ethers.parseEther(amount.toString());
      const amountToTransfer = amountWei - currentBalance;
      
      if (amountToTransfer <= 0n) {
        console.log(`✅ User${user} already has enough LENDX`);
        continue;
      }

      console.log(`📤 Transferring ${ethers.formatEther(amountToTransfer)} LENDX to User${user}...`);
      const tx = await lendxToken.transfer(userAddress, amountToTransfer);
      console.log(`   Transaction: ${tx.hash}`);
      await tx.wait();
      
      // Verify balance
      const newBalance = await lendxToken.balanceOf(userAddress);
      console.log(`   ✅ User${user} now has ${ethers.formatEther(newBalance)} LENDX (${role})\n`);
    } catch (error) {
      console.error(`   ❌ Error transferring to User${user}:`, error.message);
      console.log("");
    }
  }

  // Final summary
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║                    ✅ DISTRIBUTION COMPLETE                        ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  console.log("📊 Final Balances:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  for (let i = 0; i < userAddresses.length; i++) {
    const userAddress = userAddresses[i];
    if (!userAddress) continue;
    
    try {
      const balance = await lendxToken.balanceOf(userAddress);
      const balanceFormatted = parseFloat(ethers.formatEther(balance));
      const { role } = distribution[i];
      const emoji = balanceFormatted >= 10000 ? "👑" : balanceFormatted > 0 ? "🗳️" : "👤";
      const canPropose = balanceFormatted >= 10000 ? "✅ Can propose" : balanceFormatted > 0 ? "✅ Can vote" : "❌ No tokens";
      
      console.log(`${emoji} User${i}: ${balanceFormatted.toLocaleString(undefined, { maximumFractionDigits: 2 })} LENDX - ${canPropose}`);
    } catch (error) {
      console.log(`❌ User${i}: Error checking balance`);
    }
  }
  
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Check deployer remaining balance
  const remainingBalance = await lendxToken.balanceOf(deployer.address);
  console.log(`📋 Deployer remaining balance: ${ethers.formatEther(remainingBalance)} LENDX\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

