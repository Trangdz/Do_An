// Token list for Ganache (similar to LendHub v1)
const tokenList = {
  token: [
    {
      address: "0x0000000000000000000000000000000000000000",
      name: "ETH",
      symbol: "ETH",
      decimal: 18,
      image: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
      apy: 0,
      isCollateral: true,
    },
    {
      address: "0xb5d81ad8Cacf1F3462e4C264Fd1850E4448464DA",
      name: "Wrapped Ether",
      symbol: "WETH",
      decimal: 18,
      image: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
      apy: 0,
      isCollateral: true,
    },
    {
      address: "0xD7C7F0F9DA99f7630FFE1336333db8818caa3fc2",
      name: "Dai Stablecoin",
      symbol: "DAI",
      decimal: 18,
      image: "https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png",
      apy: 0,
      isCollateral: true,
    },
    {
      address: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
      name: "USD Coin",
      symbol: "USDC",
      decimal: 6,
      image: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
      apy: 0,
      isCollateral: true,
    },
    {
      address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      name: "ChainLink Token",
      symbol: "LINK",
      decimal: 18,
      image: "https://cryptologos.cc/logos/chainlink-link-logo.png",
      apy: 0,
      isCollateral: false,
    },
  ],
};

module.exports = tokenList;


