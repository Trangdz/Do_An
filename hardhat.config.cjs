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
        mnemonic: "sponsor desert enter giggle rescue praise garbage essay group satisfy cliff opera",
      },
    },
  },
};

module.exports = config;
