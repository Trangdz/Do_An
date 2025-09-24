const { HardhatUserConfig } = require("hardhat/config");
require("@nomicfoundation/hardhat-toolbox");
// const dotenv = require("dotenv");
// dotenv.config();

const config = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    
    ganache: {
      url: "http://127.0.0.1:7545", // RPC Ganache
      type: "http",
      chainId: 1337,                // hoặc 5777 tùy phiên bản Ganache
      accounts: {
        mnemonic: "noodle bargain mystery voice aware drink toast practice grape actress hungry problem",
      },
    },
  },
};

module.exports = config;
