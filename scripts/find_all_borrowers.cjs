const hre = require("hardhat");
const { ethers } = require("hardhat");

/**
 * Script to find ALL users who have borrowed (from all events)
 * This helps debug why liquidation page might miss some users
 */
async function main() {
  console.log("=== Finding All Borrowers ===\n");

  const poolAddress = require("../lendhub-frontend-nextjs/src/addresses.js").LendingPoolAddress;
  console.log("LendingPool:", poolAddress);
  console.log("");

  const provider = hre.ethers.provider;
  const current = await provider.getBlockNumber();
  console.log("Current block:", current);
  console.log("");

  const pool = await hre.ethers.getContractAt("LendingPool", poolAddress);
  const iface = new ethers.Interface([
    "event Borrowed(address indexed user, address indexed asset, uint256 amount)",
    "event Repaid(address indexed user, address indexed onBehalfOf, address indexed asset, uint256 amount)"
  ]);

  // Get ALL Borrowed events from block 0
  console.log("1️⃣ Scanning ALL Borrowed events from block 0...");
  const borrowedTopic = iface.getEvent('Borrowed').topicHash;
  const borrowedLogs = await provider.getLogs({
    address: poolAddress,
    topics: [borrowedTopic],
    fromBlock: 0,
    toBlock: current
  });
  console.log(`   Found ${borrowedLogs.length} Borrowed events`);
  
  const borrowers = new Set();
  for (const log of borrowedLogs) {
    try {
      const parsed = iface.parseLog(log);
      const user = parsed.args.user.toLowerCase();
      borrowers.add(user);
    } catch (e) {
      // Skip invalid logs
    }
  }
  console.log(`   Unique borrowers: ${borrowers.size}`);
  console.log("");

  // Get ALL Repaid events to find users who might still have debt
  console.log("2️⃣ Scanning ALL Repaid events from block 0...");
  const repaidTopic = iface.getEvent('Repaid').topicHash;
  const repaidLogs = await provider.getLogs({
    address: poolAddress,
    topics: [repaidTopic],
    fromBlock: 0,
    toBlock: current
  });
  console.log(`   Found ${repaidLogs.length} Repaid events`);
  
  const repayers = new Set();
  for (const log of repaidLogs) {
    try {
      const parsed = iface.parseLog(log);
      const user = parsed.args.user.toLowerCase();
      const onBehalfOf = parsed.args.onBehalfOf.toLowerCase();
      repayers.add(user);
      repayers.add(onBehalfOf);
    } catch (e) {
      // Skip invalid logs
    }
  }
  console.log(`   Unique repayers: ${repayers.size}`);
  console.log("");

  // Combine all potential users
  const allUsers = new Set([...borrowers, ...repayers]);
  console.log(`3️⃣ Total unique users from events: ${allUsers.size}`);
  console.log("");

  // Check each user's current account data
  console.log("4️⃣ Checking current account data for each user...");
  const usersWithDebt = [];
  const usersWithHF = [];
  
  for (const user of Array.from(allUsers)) {
    try {
      const [coll, debt, hf] = await pool.getAccountData(user);
      const debtNum = Number(ethers.formatUnits(debt, 18));
      const hfNum = Number(ethers.formatUnits(hf, 18));
      
      if (debtNum > 0.000001) {
        usersWithDebt.push({ user, debt: debtNum, hf: hfNum });
      }
      
      if (hfNum < 1.0 && hfNum > 0) {
        usersWithHF.push({ user, debt: debtNum, hf: hfNum });
      }
    } catch (e) {
      // Skip errors
    }
  }
  
  console.log(`   Users with debt > 0: ${usersWithDebt.length}`);
  console.log(`   Users with HF < 1: ${usersWithHF.length}`);
  console.log("");

  // Display results
  if (usersWithDebt.length > 0) {
    console.log("📊 Users with debt:");
    usersWithDebt.forEach(({ user, debt, hf }) => {
      console.log(`   ${user}: Debt=$${debt.toFixed(2)}, HF=${hf.toFixed(4)}`);
    });
    console.log("");
  }

  if (usersWithHF.length > 0) {
    console.log("🔴 Users with HF < 1 (LIQUIDATABLE):");
    usersWithHF.forEach(({ user, debt, hf }) => {
      console.log(`   ${user}: Debt=$${debt.toFixed(2)}, HF=${hf.toFixed(4)}`);
    });
    console.log("");
  } else {
    console.log("⚠️  No users found with HF < 1");
    console.log("");
  }

  // Check demo users
  console.log("5️⃣ Checking demo users from addresses.js...");
  try {
    const addresses = require("../lendhub-frontend-nextjs/src/addresses.js");
    const demoUsers = [
      addresses.User0Address,
      addresses.User1Address,
      addresses.User2Address,
      addresses.User3Address,
      addresses.User4Address,
      addresses.User5Address,
      addresses.User6Address,
      addresses.User7Address,
      addresses.User8Address,
      addresses.User9Address,
    ].filter(addr => addr && addr !== '0x0000000000000000000000000000000000000000');

    console.log(`   Found ${demoUsers.length} demo users`);
    
    for (const user of demoUsers) {
      try {
        const [coll, debt, hf] = await pool.getAccountData(user);
        const debtNum = Number(ethers.formatUnits(debt, 18));
        const hfNum = Number(ethers.formatUnits(hf, 18));
        
        if (debtNum > 0.000001 || hfNum < 1.0) {
          console.log(`   ${user}: Debt=$${debtNum.toFixed(2)}, HF=${hfNum.toFixed(4)} ${hfNum < 1.0 ? '🔴 LIQUIDATABLE' : ''}`);
        }
      } catch (e) {
        // Skip errors
      }
    }
  } catch (e) {
    console.log("   Could not read demo users from addresses.js");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

