const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Test script to verify proposal state calculation logic
 */
async function main() {
  console.log("🧪 Testing Proposal State Calculation Logic\n");

  // Read addresses
  const addressesPath = path.join(__dirname, "../lendhub-frontend-nextjs/src/addresses.js");
  if (!fs.existsSync(addressesPath)) {
    console.error("❌ addresses.js not found");
    process.exit(1);
  }

  const addressesContent = fs.readFileSync(addressesPath, "utf8");
  const governorMatch = addressesContent.match(/export const GovernorAddress\s*=\s*"([^"]+)";/);
  
  if (!governorMatch) {
    console.error("❌ GovernorAddress not found in addresses.js");
    process.exit(1);
  }

  const governorAddress = governorMatch[1];
  console.log(`📍 Governor Address: ${governorAddress}\n`);

  // Connect to contract
  const [deployer] = await ethers.getSigners();
  const GovernorABI = [
    "function proposalCount() external view returns (uint256)",
    "function getProposal(uint256 proposalId) external view returns (tuple(uint256 id, address proposer, string title, string summary, string description, string motivation, string ipfsHash, uint256 votesFor, uint256 votesAgainst, uint8 state, uint256 createdAt, uint256 votingEnd, uint256 executionTime, bool executed))"
  ];

  const governor = new ethers.Contract(governorAddress, GovernorABI, deployer);

  try {
    // Contract constants (hardcoded to match contract)
    const QUORUM = BigInt("1000000000000000000000"); // 1_000 * 1e18
    const VOTING_PERIOD = 180; // 3 minutes in seconds
    
    console.log("📊 Contract Constants:");
    console.log(`   QUORUM: ${QUORUM.toString()} (${ethers.formatEther(QUORUM.toString())} LENDX)`);
    console.log(`   VOTING_PERIOD: ${VOTING_PERIOD} seconds (${VOTING_PERIOD / 60} minutes)\n`);

    // Get proposal count
    const proposalCount = await governor.proposalCount();
    console.log(`📋 Total Proposals: ${proposalCount.toString()}\n`);

    if (Number(proposalCount) === 0) {
      console.log("⚠️  No proposals found. Create a proposal first to test state calculation.");
      return;
    }

    // Test each proposal
    for (let i = 1; i <= Number(proposalCount); i++) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📝 Proposal #${i}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      const proposal = await governor.getProposal(i);
      
      const votesFor = BigInt(proposal.votesFor.toString());
      const votesAgainst = BigInt(proposal.votesAgainst.toString());
      const totalVotes = votesFor + votesAgainst;
      const votingEnd = Number(proposal.votingEnd);
      const now = Math.floor(Date.now() / 1000);
      const state = Number(proposal.state);
      
      const stateNames = ["Created", "Active", "Succeeded", "Defeated", "Executed", "Canceled"];
      const currentState = stateNames[state] || `Unknown(${state})`;

      console.log(`   Title: ${proposal.title}`);
      console.log(`   Current State: ${currentState} (${state})`);
      console.log(`   Votes For: ${ethers.formatEther(votesFor.toString())} LENDX`);
      console.log(`   Votes Against: ${ethers.formatEther(votesAgainst.toString())} LENDX`);
      console.log(`   Total Votes: ${ethers.formatEther(totalVotes.toString())} LENDX`);
      console.log(`   Voting End: ${new Date(votingEnd * 1000).toLocaleString()}`);
      console.log(`   Now: ${new Date(now * 1000).toLocaleString()}`);
      console.log(`   Time Remaining: ${votingEnd > now ? `${Math.floor((votingEnd - now) / 60)} minutes` : "Ended"}`);

      // Calculate expected state
      if (state === 1 && votingEnd <= now) { // Active and voting ended
        console.log(`\n   🔍 State Calculation Test:`);
        console.log(`      Voting period ended: ${votingEnd <= now ? "✅ Yes" : "❌ No"}`);
        console.log(`      Total votes >= QUORUM: ${totalVotes >= QUORUM ? "✅ Yes" : "❌ No"} (${ethers.formatEther(totalVotes.toString())} >= ${ethers.formatEther(QUORUM.toString())})`);
        console.log(`      Votes For > Votes Against: ${votesFor > votesAgainst ? "✅ Yes" : "❌ No"}`);
        
        if (totalVotes >= QUORUM && votesFor > votesAgainst) {
          console.log(`      ✅ Expected State: Succeeded`);
          console.log(`      ${state === 2 ? "✅" : "❌"} Actual State: ${currentState}`);
        } else {
          console.log(`      ✅ Expected State: Defeated`);
          console.log(`      ${state === 3 ? "✅" : "❌"} Actual State: ${currentState}`);
        }
      } else if (state === 1 && votingEnd > now) {
        console.log(`\n   ℹ️  Proposal is still Active (voting period not ended)`);
      } else {
        console.log(`\n   ℹ️  Proposal is already in final state: ${currentState}`);
      }
    }

    console.log(`\n\n✅ Test completed!`);
    console.log(`\n💡 Note: Frontend will auto-calculate state for Active proposals when voting period ends.`);
    console.log(`   No transaction needed - state is calculated client-side.`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.data) {
      console.error("   Data:", error.data);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

