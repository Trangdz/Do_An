const fs = require('fs');
const { ethers } = require('ethers');

const artifact = JSON.parse(
  fs.readFileSync('artifacts/contracts/core/LendingPool.sol/LendingPool.json', 'utf-8')
);

for (const item of artifact.abi) {
  if (item.type !== 'function') continue;
  const sig = `${item.name}(${item.inputs.map(i => i.type).join(',')})`;
  const selector = ethers.id(sig).slice(0, 10);
  console.log(selector, sig);
}

