const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1) Deploy PriceOracle
  const Oracle = await ethers.getContractFactory("PriceOracle");
  const oracle = await Oracle.deploy();
  await oracle.waitForDeployment();
  console.log("PriceOracle:", await oracle.getAddress());

  // 2) Nhập địa chỉ token từ bước 00_deploy_mocks.ts
  const DAI = "0xf877004dC804Bd501a2627bB3b1379247B1D4950";
  const USDC = "0x8fAcF8BAb86D86C5E30CA90ba25B7E0e13342FF2";

  // 3) Set prices directly (1e18 format)
  await (await oracle.setAssetPrice(DAI, ethers.parseEther("1"))).wait(); // DAI = $1
  await (await oracle.setAssetPrice(USDC, ethers.parseEther("1"))).wait(); // USDC = $1
  await (await oracle.setAssetPrice(ethers.ZeroAddress, ethers.parseEther("1600"))).wait(); // ETH = $1600
  
  console.log("Prices set:");
  console.log("DAI: $1");
  console.log("USDC: $1");
  console.log("ETH: $1600");
}

main().catch((e) => { 
  console.error(e); 
  process.exit(1); 
});
