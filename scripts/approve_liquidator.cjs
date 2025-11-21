const hre = require("hardhat");
const { ethers } = hre;
const path = require("path");

async function main() {
  const addresses = require(path.join(
    process.cwd(),
    "lendhub-frontend-nextjs",
    "src",
    "addresses.js"
  ));

  const liquidatorAddress =
    process.env.LIQUIDATOR_ADDRESS ||
    addresses.User5Address ||
    (await ethers.getSigners())[0].address;

  const usdcAddress = addresses.USDCAddress;
  const lendingPoolAddress = addresses.LendingPoolAddress;

  console.log("🔐 Preparing approval for liquidator:", liquidatorAddress);
  console.log("USDC:", usdcAddress);
  console.log("LendingPool:", lendingPoolAddress);

  let signer;
  try {
    signer = await ethers.getSigner(liquidatorAddress);
  } catch (err) {
    const signers = await ethers.getSigners();
    signer = signers.find(
      (s) => s.address.toLowerCase() === liquidatorAddress.toLowerCase()
    );
  }

  if (!signer) {
    throw new Error(
      `Không tìm thấy signer cho ${liquidatorAddress}. Hãy chắc chắn địa chỉ này thuộc mnemonic trong hardhat.config.cjs`
    );
  }

  console.log("Using signer:", await signer.getAddress());
  const usdc = await ethers.getContractAt("ERC20", usdcAddress, signer);

  const balance = await usdc.balanceOf(liquidatorAddress);
  console.log("USDC balance:", ethers.formatUnits(balance, 6), "USDC");

  const allowance = await usdc.allowance(liquidatorAddress, lendingPoolAddress);
  console.log(
    "Existing allowance:",
    allowance === 0n ? 0 : ethers.formatUnits(allowance, 6),
    "USDC"
  );

  if (allowance >= ethers.MaxUint256 / 2n) {
    console.log("Allowance đã rất lớn, bỏ qua cập nhật.");
    return;
  }

  const tx = await usdc.approve(lendingPoolAddress, ethers.MaxUint256);
  console.log("⏳ Approving...");
  await tx.wait();
  console.log("✅ Approval tx hash:", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

