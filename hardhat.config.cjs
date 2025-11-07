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
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    ganache: {
      url: "http://127.0.0.1:8545", // Ganache CLI default port
      chainId: 5777,
      accounts: {
        mnemonic: "payment deny what dwarf child talent all high job leopard relief follow",
        count: 10, // Generate 10 accounts
      },
    },
    hardhat: {
      chainId: 5777,
      accounts: {
        mnemonic: "dwarf virtual cotton sudden uncover initial true apple call prepare inquiry west",
        count: 10,
      },
    },
  },
};
module.exports = config;

