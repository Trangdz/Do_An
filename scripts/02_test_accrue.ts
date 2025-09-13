import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const IRM = await ethers.getContractFactory("InterestRateModel");
  const irm = await IRM.deploy();
  await irm.waitForDeployment();

  const Oracle = await ethers.getContractFactory("PriceOracle");
  const oracle = await Oracle.deploy(0);
  await oracle.waitForDeployment();

  const Pool = await ethers.getContractFactory("LendingPool");
  const pool = await Pool.deploy(await irm.getAddress(), await oracle.getAddress());
  await pool.waitForDeployment();

  console.log("LendingPool:", await pool.getAddress());

  // TODO: bạn map reserveData cho token rồi gọi thử _accrue (public version để test)
}

main().catch(console.error);
