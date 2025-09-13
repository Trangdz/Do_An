import { ethers } from "hardhat";

async function main() {
  const [user] = await ethers.getSigners();
  console.log("User:", user.address);

  // ==== PASTE các địa chỉ ====
  const LENDING_POOL = "0x4464e7E4d1dAb44D4B192e59eE44570547b0baf7"; // từ 02_deploy_pool_init
  const DAI          = "0xD6Bb60F1e4DfBd9900A122be7323055f20dcdCc7";
  const USDC         = "0x3fA48052E5D39C7d94773312f878B01E0e3de6Ea";

  // ABI tối thiểu để gọi các hàm cần thiết
  const poolAbi = [
    "function lend(address asset, uint256 amount) external",
    "function withdraw(address asset, uint256 requested) external returns (uint256)",
    "function accruePublic(address asset) external",
    "function reserves(address) view returns (uint128 reserveCash, uint128 totalDebtPrincipal, uint128 liquidityIndex, uint128 variableBorrowIndex, uint64 liquidityRateRayPerSec, uint64 variableBorrowRateRayPerSec, uint16 reserveFactorBps, uint16 ltvBps, uint16 liqThresholdBps, uint16 liqBonusBps, uint16 closeFactorBps, uint8 decimals, bool isBorrowable, uint16 optimalUBps, uint64 baseRateRayPerSec, uint64 slope1RayPerSec, uint64 slope2RayPerSec, uint40 lastUpdate)"
  ];
  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function decimals() view returns (uint8)"
  ];

  const pool = new ethers.Contract(LENDING_POOL, poolAbi, user);
  const dai  = new ethers.Contract(DAI, erc20Abi, user);
  const usdc = new ethers.Contract(USDC, erc20Abi, user);

  // ======= STEP 1: Kiểm tra balances ban đầu =======
  const daiBal0  = await dai.balanceOf(user.address);
  const usdcBal0 = await usdc.balanceOf(user.address);
  const daiDec   = await dai.decimals();
  const usdcDec  = await usdc.decimals();
  console.log(`DAI balance:  ${ethers.formatUnits(daiBal0, daiDec)}`);
  console.log(`USDC balance: ${ethers.formatUnits(usdcBal0, usdcDec)}`);

  // ======= STEP 2: Approve DAI cho LendingPool =======
  const lendAmountDAI = ethers.parseUnits("10000", daiDec); // 10k DAI
  let tx = await dai.approve(LENDING_POOL, lendAmountDAI);
  await tx.wait();
  console.log("Approved DAI.");

  // ======= STEP 3: Lend DAI =======
  tx = await pool.lend(DAI, lendAmountDAI);
  await tx.wait();
  console.log("Lended 10,000 DAI.");

  // Xem trạng thái reserve sau khi lend
  let r = await pool.reserves(DAI);
  console.log("ReserveCash DAI (1e18):", r.reserveCash.toString());
  console.log("LiquidityIndex:", r.liquidityIndex.toString());

  // ======= STEP 4: Gọi accruePublic vài lần (demo index & rates di chuyển theo thời gian) =======
  // (Tuỳ chọn) đợi vài giây giữa các lần nếu muốn thấy dt > 0; nhưng on-chain dt phụ thuộc block timestamp
  tx = await pool.accruePublic(DAI); await tx.wait();
  console.log("Accrued DAI once.");
  tx = await pool.accruePublic(DAI); await tx.wait();
  console.log("Accrued DAI twice.");

  // ======= STEP 5: Withdraw DAI =======
  // Thử rút số lượng vượt reserveCash/x_max để kiểm tra clamp (ví dụ rút 12k DAI)
  const withdrawReq = ethers.parseUnits("12000", daiDec);
  tx = await pool.withdraw(DAI, withdrawReq);
  const rcpt = await tx.wait();
  // Hàm withdraw(asset, requested) returns (uint256 amount1e18),
  // nhưng vì ethers v6 không trả giá trị trả về dễ đọc từ receipt, bạn có thể đọc reserve state để xác nhận
  console.log("Withdraw called (requested 12k). Check logs/state for actual withdrawn.");

  // ======= STEP 6: Lặp lại với USDC để kiểm tra decimals 6 =======
  const lendAmountUSDC = ethers.parseUnits("6000", usdcDec); // 6,000 USDC (6 decimals)
  tx = await usdc.approve(LENDING_POOL, lendAmountUSDC); await tx.wait();
  tx = await pool.lend(USDC, lendAmountUSDC); await tx.wait();
  console.log("Lended 6,000 USDC (6 decimals).");

  // Accrue & Withdraw USDC 7,000 để thấy clamp (vì chỉ có 6,000 + lãi)
  await (await pool.accruePublic(USDC)).wait();
  const withdrawUSDCReq = ethers.parseUnits("7000", usdcDec);
  await (await pool.withdraw(USDC, withdrawUSDCReq)).wait();
  console.log("Requested withdraw 7,000 USDC (should be clamped to available).");

  console.log("Demo finished. Check console of 03_show_rates.ts if you are listening to events.");
}

main().catch((e) => { console.error(e); process.exit(1); });
