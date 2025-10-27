# Testnet Deployment Guide

## Prerequisites

1. **Get Testnet ETH:**
   - Sepolia: https://sepoliafaucet.com/
   - Goerli: https://goerli-faucet.pk910.de/

2. **Get Infura API Key:**
   - Visit: https://infura.io/
   - Create account and get API key
   - Update .env file with your key

3. **Get Mnemonic:**
   - Use MetaMask or generate new wallet
   - Copy 12-word mnemonic phrase
   - Update .env file with your mnemonic

## Deployment Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Update .env file:**
   - Add your Infura API key
   - Add your mnemonic phrase

3. **Deploy to Sepolia:**
   ```bash
   npx hardhat run scripts/deploy_testnet.cjs --network sepolia
   ```

4. **Deploy to Goerli:**
   ```bash
   npx hardhat run scripts/deploy_testnet.cjs --network goerli
   ```

## Testnet Features

✅ Real Chainlink Price Feeds
✅ Testnet ETH required
✅ Production-like environment
✅ Real price data from Chainlink
✅ Staleness protection
✅ Manual fallback prices

## Contract Addresses

After deployment, update these addresses in your frontend:
- LendingPool
- PriceOracle
- ERC20 Tokens
- Chainlink Feeds

## Testing

1. **Test Oracle:**
   ```bash
   npx hardhat run scripts/test_oracle.cjs --network sepolia
   ```

2. **Test Lending:**
   - Connect MetaMask to Sepolia
   - Import testnet tokens
   - Test lending/borrowing

## Production Deployment

When ready for mainnet:
1. Update Chainlink feeds to mainnet addresses
2. Deploy to mainnet
3. Configure real Chainlink feeds
4. Set up monitoring and alerts
