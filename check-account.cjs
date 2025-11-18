const { ethers } = require('ethers');
const addresses = require('./lendhub-frontend-nextjs/src/addresses.js');
const abi = require('./lendhub-frontend-nextjs/src/abis/LendingPool.json');
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
(async () => {
  const pool = new ethers.Contract(addresses.LendingPoolAddress, abi, provider);
  const user = addresses.User1Address; // example user connected on UI
  const data = await pool.getAccountData(user);
  console.log('collateral', data[0].toString());
  console.log('debt', data[1].toString());
  console.log('health', data[2].toString());
})();
