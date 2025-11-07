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
      url: "http://127.0.0.1:7545", // Ganache CLI port (match addresses.js)
      chainId: 1337, // Ganache default Chain ID (match addresses.js)
      accounts: {
        mnemonic: "end dry oppose genre below hotel inquiry actual foil scorpion brush ship", // Match addresses.js
        count: 10, // Generate 10 accounts
        path: "m/44'/60'/0'/0", // Standard HD path
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

