import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1) Deploy PriceOracle (maxStale = 0 => tắt stale check; có thể để 3600 = 1h)
  const Oracle = await ethers.getContractFactory("PriceOracle");
  const oracle = await Oracle.deploy(0);
  await oracle.waitForDeployment();
  console.log("PriceOracle:", await oracle.getAddress());

  // 2) Nhập địa chỉ token + feed từ bước 00_deploy_mocks.ts
  // Bạn dán lại các địa chỉ log ra lúc trước:
  const DAI = "<PASTE_DAI_ADDRESS>";
  const USDC = "<PASTE_USDC_ADDRESS>";
  const ETHUSD_FEED = "<PASTE_ETHUSD_FEED_ADDRESS>";
  const DAIUSD_FEED = "<PASTE_DAIUSD_FEED_ADDRESS>";
  const USDCUSD_FEED = "<PASTE_USDCUSD_FEED_ADDRESS>";

  // 3) Map token -> feed
  await (await oracle.setFeed(DAI, DAIUSD_FEED)).wait();
  await (await oracle.setFeed(USDC, USDCUSD_FEED)).wait();
  // Nếu bạn cũng có WETH mock, setFeed(WETH, ETHUSD_FEED)
  console.log("Feeds mapped.");
}

main().catch((e) => { console.error(e); process.exit(1); });
