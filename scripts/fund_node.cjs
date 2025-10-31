const { ethers } = require("hardhat");

async function main() {
  const node = process.env.NODE_ADDRESS;
  const amountEth = process.env.AMOUNT_ETH || "1.0";
  if (!node) throw new Error("Set NODE_ADDRESS env var");

  const [sender] = await ethers.getSigners();
  console.log("From:", sender.address);
  console.log("To (node):", node);
  console.log("Amount:", amountEth, "ETH");

  const tx = await sender.sendTransaction({ to: node, value: ethers.parseEther(amountEth) });
  await tx.wait();
  console.log("Sent. Tx:", tx.hash);
}

main().catch((e) => { console.error(e); process.exit(1); });


