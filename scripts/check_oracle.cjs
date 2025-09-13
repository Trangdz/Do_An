const { ethers } = require("hardhat");

async function main() {
  const PRICE_ORACLE = "0x36065e9508D5ceB5C93FE28d12E4C4C0E95f9cdF";
  const WETH = "0xb97A17cC3e41FAdeb4fC11235FB6e4B00872568C";
  const DAI = "0xdC4E7fe9923d2ec366BD44C94caFbC308533c4b0";
  
  const oracle = await ethers.getContractAt(["function getAssetPrice1e18(address) view returns (uint256)"], PRICE_ORACLE);
  
  try {
    const wethPrice = await oracle.getAssetPrice1e18(WETH);
    console.log("WETH price:", ethers.formatEther(wethPrice));
  } catch (error) {
    console.log("WETH price error:", error.message);
  }
  
  try {
    const daiPrice = await oracle.getAssetPrice1e18(DAI);
    console.log("DAI price:", ethers.formatEther(daiPrice));
  } catch (error) {
    console.log("DAI price error:", error.message);
  }
}

main().catch(console.error);
