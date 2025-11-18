const { ethers } = require('ethers');
const addresses = require('./lendhub-frontend-nextjs/src/addresses.js');
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
const abi = ['function getCurrentSupplyBalance(address user, address asset) view returns (uint256)'];
(async () => {
  const pool = new ethers.Contract(addresses.LendingPoolAddress, abi, provider);
  const user = addresses.User1Address;
  const supply = await pool.getCurrentSupplyBalance(user, addresses.WETHAddress);
  console.log('supply1e18', supply.toString());
})();
