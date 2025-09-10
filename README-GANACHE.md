# LendHub v1 - Ganache Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Ganache CLI
- MetaMask

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Ganache
```bash
ganache-cli --port 8545 --gasLimit 0x1fffffffffffff --gasPrice 0x1 --networkId 1337 --deterministic
```

### 3. Deploy Contracts
```bash
npx hardhat run scripts/deploy-ganache.js --network ganache
```

### 4. Update Addresses
Copy the deployed addresses from the output and update `addresses-ganache.js`.

### 5. Run Tests
```bash
npx hardhat test
```

### 6. Run Demo
```bash
npx hardhat run scripts/demo-ganache.js --network ganache
```

## 📁 Project Structure

```
contracts/
├── MockOracle.sol          # Mock price oracle (1e8 format)
├── MockToken.sol           # Mock ERC20 tokens with configurable decimals
├── RiskManager.sol         # Risk management and health factor calculations
├── LendingPoolV2.sol       # Main lending/borrowing contract
└── AggregatorV3Interface.sol # Chainlink interface

scripts/
├── deploy-ganache.js       # Deploy all contracts to Ganache
└── demo-ganache.js         # Demo script showing protocol usage

test/
└── LendHub.test.js         # Comprehensive test suite

addresses-ganache.js        # Contract addresses for Ganache
```

## 🏗️ Architecture

### Core Contracts

1. **MockOracle**: Provides mock price feeds in 1e8 format
   - ETH: $2000
   - USDC: $1
   - DAI: $1
   - LINK: $10

2. **MockToken**: ERC20 tokens with configurable decimals
   - USDC: 6 decimals
   - DAI: 18 decimals
   - WETH: 18 decimals
   - LINK: 18 decimals

3. **RiskManager**: Manages risk parameters and health factors
   - Collateral factors: 70-85%
   - Liquidation threshold: 85%
   - Interest rate calculations

4. **LendingPoolV2**: Main protocol contract
   - Supply/withdraw tokens
   - Borrow/repay tokens
   - Health factor checks
   - Interest rate updates

### Key Features

- **Multi-token support**: USDC, DAI, WETH, LINK
- **Risk management**: Health factor calculations
- **Interest rates**: Dynamic rates based on utilization
- **Collateral factors**: Different factors per token
- **Liquidation protection**: Prevents unhealthy positions

## 🧪 Testing

### Run All Tests
```bash
npx hardhat test
```

### Run Specific Test
```bash
npx hardhat test --grep "Lending Pool"
```

### Test Coverage
- Token configuration
- Oracle price feeds
- Risk management
- Lending operations
- Borrowing operations
- Health factor calculations
- Interest rate calculations

## 🎯 Demo Scenarios

The demo script shows:
1. Token distribution to test accounts
2. Price feed verification
3. Pool state monitoring
4. Supply operations
5. Borrow operations
6. Health factor checks
7. Repay operations
8. Withdraw operations

## 🔧 Configuration

### Ganache Network
- RPC: http://127.0.0.1:8545
- Chain ID: 1337
- Gas Limit: Unlimited
- Gas Price: 1 wei

### MetaMask Setup
1. Add custom network:
   - Network Name: Ganache
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 1337
   - Currency Symbol: ETH

2. Import test accounts using private keys from Ganache

## 📊 Token Distribution

Each test account receives:
- 10,000 USDC (6 decimals)
- 10,000 DAI (18 decimals)
- 10 WETH (18 decimals)
- 1,000 LINK (18 decimals)

## 🛡️ Risk Parameters

- **USDC**: 80% collateral factor
- **DAI**: 80% collateral factor
- **WETH**: 85% collateral factor
- **LINK**: 70% collateral factor

## 🚨 Troubleshooting

### Common Issues

1. **"Cannot borrow" error**
   - Check if user has sufficient collateral
   - Verify health factor is above 100%

2. **"Withdrawal would make user unhealthy"**
   - Reduce withdrawal amount
   - Repay some debt first

3. **"Token not supported"**
   - Ensure token is added to RiskManager
   - Check if token is added to LendingPool

### Debug Commands

```bash
# Check contract state
npx hardhat console --network ganache

# View contract storage
npx hardhat inspect LendingPoolV2 --network ganache

# Gas estimation
npx hardhat test --gas-report
```

## 📈 Next Steps

1. **Frontend Integration**: Update frontend to use LendingPoolV2
2. **Liquidation**: Implement liquidation mechanism
3. **Governance**: Add governance token and voting
4. **Flash Loans**: Implement flash loan functionality
5. **Multi-chain**: Deploy to other testnets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
