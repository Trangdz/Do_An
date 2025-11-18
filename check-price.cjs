const { ethers } = require('ethers');
const addresses = require('./lendhub-frontend-nextjs/src/addresses.js');
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
const oracleAbi = ['function getAssetPrice1e18(address asset) view returns (uint256)'];
(async () => {
  const oracle = new ethers.Contract(addresses.PriceOracleAddress, oracleAbi, provider);
  const price = await oracle.getAssetPrice1e18(addresses.WETHAddress);
  console.log('price1e18', price.toString());
})();
