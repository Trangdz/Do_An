import { ethers } from "hardhat";

const SECONDS_PER_YEAR = 365 * 24 * 3600;
const toRayPerSec = (apr: number) => BigInt(Math.floor(apr * 1e27 / SECONDS_PER_YEAR));

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // ==== PASTE các địa chỉ có sẵn ====
  const PRICE_ORACLE = "0xD7CCEdba9a62e4a61Ca1FFb6992669Bb3C18e32D";   // từ 01_deploy_oracle.ts
  const DAI = "0xD6Bb60F1e4DfBd9900A122be7323055f20dcdCc7";
  const USDC = "0x3fA48052E5D39C7d94773312f878B01E0e3de6Ea";

  // Triển khai InterestRateModel + LendingPool
  const IRM = await ethers.getContractFactory("InterestRateModel");
  const irm = await IRM.deploy();
  await irm.waitForDeployment();
  console.log("IRM:", await irm.getAddress());

  const Pool = await ethers.getContractFactory("LendingPool");
  const pool = await Pool.deploy(await irm.getAddress(), PRICE_ORACLE);
  await pool.waitForDeployment();
  const poolAddr = await pool.getAddress();
  console.log("LendingPool:", poolAddr);

  // Tham số lãi suất (per-second, RAY)
  // baseAPR ~ 2%/năm, slope1 ~ 5%/năm, slope2 ~ 60%/năm
  const base = toRayPerSec(0.02);
  const s1   = toRayPerSec(0.05);
  const s2   = toRayPerSec(0.60);

  // Tham số rủi ro
  const reserveFactorBps = 1000; // 10%
  const ltvBps           = 7500; // 75%
  const liqThresholdBps  = 8000; // 80%
  const liqBonusBps      = 500;  // 5%
  const closeFactorBps   = 5000; // 50%
  const optimalUBps      = 8000; // 80%

  // Init DAI (18 decimals, borrowable = true)
  let tx = await pool.initReserve(
    DAI, 18,
    reserveFactorBps, ltvBps, liqThresholdBps, liqBonusBps, closeFactorBps,
    true, // isBorrowable
    optimalUBps, base, s1, s2
  );
  await tx.wait();
  console.log("DAI init done.");

  // Init USDC (6 decimals, borrowable = true)
  tx = await pool.initReserve(
    USDC, 6,
    reserveFactorBps, ltvBps, liqThresholdBps, liqBonusBps, closeFactorBps,
    true,
    optimalUBps, base, s1, s2
  );
  await tx.wait();
  console.log("USDC init done.");

  console.log("DONE. Save LendingPool address:", poolAddr);
}

main().catch((e) => { console.error(e); process.exit(1); });
