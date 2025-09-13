import { ethers } from "hardhat";

async function main() {
  const [deployer, user, liquidator] = await ethers.getSigners();
  console.log({ deployer: deployer.address, user: user.address, liquidator: liquidator.address });

  const LENDING_POOL = "<PASTE_POOL>";
  const ORACLE       = "<PASTE_PRICE_ORACLE>";
  const WETH         = "<PASTE_WETH>";
  const DAI          = "<PASTE_DAI>";
  const ETH_USD_FEED = "<PASTE_ETH_USD_FEED>"; // MockV3Aggregator

  // Minimal ABIs
  const poolAbi = [
    "function lend(address,uint256) external",
    "function borrow(address,uint256) external",
    "function repay(address,uint256,address) external returns (uint256)",
    "function liquidationCall(address,address,address,uint256) external",
    "function accruePublic(address) external",
    "function getAccountData(address) view returns (uint256,uint256,uint256)"
  ];
  const erc20Abi = [
    "function mint(address,uint256) external",
    "function approve(address,uint256) external returns (bool)",
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];
  const aggAbi = [
    "function updateAnswer(int256) external"
  ];

  const pool = new ethers.Contract(LENDING_POOL, poolAbi, deployer);
  const poolUser = pool.connect(user);
  const poolLiq  = pool.connect(liquidator);
  const weth = new ethers.Contract(WETH, erc20Abi, deployer);
  const dai  = new ethers.Contract(DAI, erc20Abi, deployer);
  const feed = new ethers.Contract(ETH_USD_FEED, aggAbi, deployer);

  const wethDec = await weth.decimals();
  const daiDec  = await dai.decimals();

  // 1) Mint WETH & DAI cho user để deposit + cho liquidator có DAI trả nợ hộ
  await (await weth.mint(user.address, ethers.parseUnits("100", wethDec))).wait(); // 100 WETH
  await (await dai.mint(liquidator.address, ethers.parseUnits("100000", daiDec))).wait(); // 100k DAI

  // 2) User deposit 50 WETH
  await (await weth.connect(user).approve(LENDING_POOL, ethers.parseUnits("50", wethDec))).wait();
  await (await poolUser.lend(WETH, ethers.parseUnits("50", wethDec))).wait();
  console.log("User supplied 50 WETH");

  // 3) User borrow 30,000 DAI
  await (await poolUser.borrow(DAI, ethers.parseUnits("30000", daiDec))).wait();
  let [col, debt, hf] = await pool.getAccountData(user.address);
  console.log("After borrow -> HF:", ethers.formatUnits(hf,18));

  // 4) ETH price drop 1600 -> 1100 USD
  await (await feed.updateAnswer(1100n * 10n ** 8n)).wait();
  await (await pool.accruePublic(WETH)).wait(); // update indexes/rates for collateral asset
  [col, debt, hf] = await pool.getAccountData(user.address);
  console.log("After price drop -> HF:", ethers.formatUnits(hf,18)); // should be < 1

  // 5) Liquidation: liquidator repays 10,000 DAI on behalf of user, seizes WETH with bonus
  await (await dai.connect(liquidator).approve(LENDING_POOL, ethers.parseUnits("10000", daiDec))).wait();
  await (await poolLiq.liquidationCall(DAI, WETH, user.address, ethers.parseUnits("10000", daiDec))).wait();

  [col, debt, hf] = await pool.getAccountData(user.address);
  console.log("After liquidation -> HF:", ethers.formatUnits(hf,18));
}
main().catch(console.error);
