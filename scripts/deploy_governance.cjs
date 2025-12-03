const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { updateAddresses } = require("./utils/update_addresses.cjs");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Read addresses (LENDX token, LendingPool, assets...) from frontend addresses.js
  const addressesPath = path.join(__dirname, "../lendhub-frontend-nextjs/src/addresses.js");
  let addresses = {};

  if (fs.existsSync(addressesPath)) {
    const addressesContent = fs.readFileSync(addressesPath, "utf8");

    // Extract LENDXTokenAddress
    const lendxMatch = addressesContent.match(/LENDXTokenAddress\s*=\s*"([^"]+)"/);
    if (lendxMatch) {
      addresses.LENDXTokenAddress = lendxMatch[1];
    }

    // Extract LendingPool and asset addresses if present
    const poolMatch = addressesContent.match(/LendingPoolAddress\s*=\s*"([^"]+)"/);
    if (poolMatch) {
      addresses.LendingPoolAddress = poolMatch[1];
    }

    const wethMatch = addressesContent.match(/WETHAddress\s*=\s*"([^"]+)"/);
    if (wethMatch) {
      addresses.WETHAddress = wethMatch[1];
    }

    const daiMatch = addressesContent.match(/DAIAddress\s*=\s*"([^"]+)"/);
    if (daiMatch) {
      addresses.DAIAddress = daiMatch[1];
    }

    const usdcMatch = addressesContent.match(/USDCAddress\s*=\s*"([^"]+)"/);
    if (usdcMatch) {
      addresses.USDCAddress = usdcMatch[1];
    }

    const linkMatch = addressesContent.match(/LINKAddress\s*=\s*"([^"]+)"/);
    if (linkMatch) {
      addresses.LINKAddress = linkMatch[1];
    }
  }

  if (!addresses.LENDXTokenAddress || addresses.LENDXTokenAddress === '0x0000000000000000000000000000000000000000') {
    console.error("❌ LENDXTokenAddress not found. Please deploy LENDX token system first.");
    process.exit(1);
  }

  console.log("\n📋 Found LENDX Token:", addresses.LENDXTokenAddress);

  // Deploy LendHubGovernor
  console.log("\n🚀 Deploying LendHubGovernor...");
  const LendHubGovernor = await ethers.getContractFactory("LendHubGovernor");
  const governor = await LendHubGovernor.deploy(
    addresses.LENDXTokenAddress,
    deployer.address // initial owner
  );
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();

  console.log("✅ LendHubGovernor deployed to:", governorAddress);

  // Update addresses.js safely
  console.log("\n📝 Updating addresses.js...");
  try {
    const result = updateAddresses({ GovernorAddress: governorAddress }, addressesPath);
    console.log("✅ Updated addresses.js");
    if (result.duplicates) {
      console.warn("⚠️  WARNING: Found duplicates:", result.duplicates);
    }
  } catch (error) {
    console.error("❌ Error updating addresses.js:", error.message);
    throw error;
  }

  // Save deployment info
  const deploymentInfo = {
    network: "ganache",
    deployer: deployer.address,
    contracts: {
      governor: governorAddress,
      lendxToken: addresses.LENDXTokenAddress,
    },
    timestamp: new Date().toISOString(),
  };

  const deploymentPath = path.join(__dirname, "../local-governance.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("✅ Saved deployment info to local-governance.json");

  // ============================================================
  // Optional: Auto-wire Governor with existing LendingPool + assets
  // ============================================================
  if (
    addresses.LendingPoolAddress &&
    addresses.LendingPoolAddress !== "0x0000000000000000000000000000000000000000"
  ) {
    console.log("\n🔧 Detected existing LendingPool. Wiring Governor ↔ LendingPool...");
    const poolAddress = addresses.LendingPoolAddress;

    // Verify LendingPool contract actually exists
    const poolCode = await ethers.provider.getCode(poolAddress);
    if (poolCode === "0x" || poolCode === "0x0") {
      console.log("⚠️  LendingPoolAddress is set but no contract code found. Skipping wiring.");
    } else {
      try {
        // Minimal ABIs for wiring
        const GovernorABI = [
          "function setLendingPool(address _lendingPool) external",
          "function setAssetAddress(string memory symbol, address assetAddress) external",
          "function lendingPool() external view returns (address)",
          "function assetAddresses(string memory) external view returns (address)",
        ];
        const LendingPoolABI = [
          "function setGovernor(address _governor) external",
          "function governor() external view returns (address)",
        ];

        const governorForSetup = new ethers.Contract(
          governorAddress,
          GovernorABI,
          deployer
        );
        const lendingPoolForSetup = new ethers.Contract(
          poolAddress,
          LendingPoolABI,
          deployer
        );

        // 1) Set LendingPool in Governor
        try {
          const currentLendingPool = await governorForSetup.lendingPool();
          if (currentLendingPool.toLowerCase() !== poolAddress.toLowerCase()) {
            const tx = await governorForSetup.setLendingPool(poolAddress);
            await tx.wait();
            console.log("✅ LendingPool set in Governor:", poolAddress);
          } else {
            console.log("✅ LendingPool already set in Governor");
          }
        } catch (err) {
          console.log(
            "⚠️  Could not set LendingPool in Governor:",
            err.message || err
          );
        }

        // 2) Wire Governor in LendingPool
        try {
          const currentGovernor = await lendingPoolForSetup.governor();
          if (currentGovernor.toLowerCase() !== governorAddress.toLowerCase()) {
            const tx = await lendingPoolForSetup.setGovernor(governorAddress);
            await tx.wait();
            console.log("✅ Governor set in LendingPool:", governorAddress);
            console.log("   LendingPool can now execute governance proposals");
          } else {
            console.log("✅ Governor already set in LendingPool");
          }
        } catch (err) {
          console.log(
            "⚠️  Could not set Governor in LendingPool (may not have setGovernor function yet)"
          );
          console.log("   Details:", err.message || err);
        }

        // 3) Set asset addresses in Governor (if available)
        const assets = [];
        if (addresses.WETHAddress) {
          assets.push({ symbol: "WETH", address: addresses.WETHAddress });
        }
        if (addresses.DAIAddress) {
          assets.push({ symbol: "DAI", address: addresses.DAIAddress });
        }
        if (addresses.USDCAddress) {
          assets.push({ symbol: "USDC", address: addresses.USDCAddress });
        }
        if (addresses.LINKAddress) {
          assets.push({ symbol: "LINK", address: addresses.LINKAddress });
        }

        if (assets.length > 0) {
          console.log("🔧 Setting asset addresses in Governor...");
          for (const asset of assets) {
            try {
              const currentAddress = await governorForSetup.assetAddresses(
                asset.symbol
              );
              if (currentAddress.toLowerCase() !== asset.address.toLowerCase()) {
                const tx = await governorForSetup.setAssetAddress(
                  asset.symbol,
                  asset.address
                );
                await tx.wait();
                console.log(
                  `✅ ${asset.symbol} address set in Governor: ${asset.address}`
                );
              } else {
                console.log(
                  `✅ ${asset.symbol} address already set in Governor (${asset.address})`
                );
              }
            } catch (err) {
              console.log(
                `⚠️  Could not set ${asset.symbol} in Governor:`,
                err.message || err
              );
            }
          }
        } else {
          console.log(
            "ℹ️  No asset addresses (WETH/DAI/USDC/LINK) found in addresses.js, skipping asset mapping."
          );
        }
      } catch (setupError) {
        console.log(
          "⚠️  Auto-wiring Governor with existing LendingPool failed:",
          setupError.message || setupError
        );
      }
    }
  } else {
    console.log(
      "\nℹ️  No existing LendingPoolAddress found in addresses.js. " +
        "Governor is deployed but not yet wired to a pool."
    );
  }

  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              ✅ GOVERNANCE DEPLOYMENT COMPLETE                      ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝");
  console.log("\n📊 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📍 LendHubGovernor: ${governorAddress}`);
  console.log(`📍 LENDX Token:     ${addresses.LENDXTokenAddress}`);
  if (addresses.LendingPoolAddress) {
    console.log(`📍 LendingPool:     ${addresses.LendingPoolAddress}`);
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n💡 Next steps:");
  console.log("   1. Test creating proposals");
  console.log("   2. Test voting on proposals");
  console.log("   3. Execute proposals and verify LendingPool config changes");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

