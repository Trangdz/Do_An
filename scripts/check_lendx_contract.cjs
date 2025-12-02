const hre = require("hardhat");

async function main() {
  const LENDXTokenAddress = "0x1Ff150e33dEe880Dc799d94f7854F7D33c6413a3";
  const provider = hre.ethers.provider;
  
  console.log("=== Checking LENDX Token Contract ===\n");
  console.log(`Address: ${LENDXTokenAddress}`);
  
  // Check if contract has code
  const code = await provider.getCode(LENDXTokenAddress);
  console.log(`\n📋 Contract Code:`);
  console.log(`   Length: ${code.length} bytes`);
  console.log(`   Has code: ${code !== '0x' && code !== '0x0'}`);
  
  if (code === '0x' || code === '0x0') {
    console.log("\n❌ Contract NOT deployed at this address!");
    console.log("   The address has no code.");
    console.log("\n💡 Solution: Deploy LENDX token contract first.");
    return;
  }
  
  // Try to call balanceOf
  try {
    const LENDX_ABI = [
      'function balanceOf(address owner) view returns (uint256)',
      'function totalSupply() view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)',
      'function name() view returns (string)',
    ];
    
    const contract = new hre.ethers.Contract(LENDXTokenAddress, LENDX_ABI, provider);
    
    console.log("\n📋 Testing contract calls:");
    
    try {
      const name = await contract.name();
      console.log(`   ✅ name(): ${name}`);
    } catch (e) {
      console.log(`   ❌ name() failed: ${e.message}`);
    }
    
    try {
      const symbol = await contract.symbol();
      console.log(`   ✅ symbol(): ${symbol}`);
    } catch (e) {
      console.log(`   ❌ symbol() failed: ${e.message}`);
    }
    
    try {
      const decimals = await contract.decimals();
      console.log(`   ✅ decimals(): ${decimals}`);
    } catch (e) {
      console.log(`   ❌ decimals() failed: ${e.message}`);
    }
    
    try {
      const totalSupply = await contract.totalSupply();
      console.log(`   ✅ totalSupply(): ${hre.ethers.formatEther(totalSupply)}`);
    } catch (e) {
      console.log(`   ❌ totalSupply() failed: ${e.message}`);
    }
    
    // Test balanceOf with zero address
    try {
      const balance = await contract.balanceOf("0x0000000000000000000000000000000000000000");
      console.log(`   ✅ balanceOf(zero): ${hre.ethers.formatEther(balance)}`);
    } catch (e) {
      console.log(`   ❌ balanceOf() failed: ${e.message}`);
      console.log(`   Error details:`, e);
    }
    
  } catch (err) {
    console.log("\n❌ Error calling contract:");
    console.log(`   ${err.message}`);
    console.log("\n💡 Possible causes:");
    console.log("   1. ABI doesn't match contract");
    console.log("   2. Contract is not ERC20 compatible");
    console.log("   3. RPC connection issue");
  }
  
  // Check RPC
  console.log("\n📋 RPC Connection:");
  try {
    const blockNumber = await provider.getBlockNumber();
    console.log(`   ✅ Connected! Current block: ${blockNumber}`);
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);
  } catch (e) {
    console.log(`   ❌ RPC connection failed: ${e.message}`);
  }
}

main().catch(console.error);












