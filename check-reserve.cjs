const { ethers } = require('ethers');
const addresses = require('./lendhub-frontend-nextjs/src/addresses.js');
const abi = require('./lendhub-frontend-nextjs/src/abis/LendingPool.json');
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
(async () => {
  const pool = new ethers.Contract(addresses.LendingPoolAddress, abi, provider);
  const r = await pool.reserves(addresses.WETHAddress);
  console.log('ltvBps', Number(r.ltvBps));
  console.log('liqThresholdBps', Number(r.liqThresholdBps));
  console.log('decimals', Number(r.decimals));
})();
