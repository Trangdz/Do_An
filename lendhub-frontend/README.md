# LendHub v2 - DeFi Lending Protocol Frontend

A modern, responsive frontend for the LendHub v2 DeFi lending protocol built with React, TypeScript, Tailwind CSS, and ethers.js v6.

## 🚀 Features

- **Wallet Integration**: MetaMask connection with automatic network switching
- **Real-time Data**: Live price feeds, interest rates, and utilization metrics
- **Lending Operations**: Supply, withdraw, borrow, and repay tokens
- **Health Factor Monitoring**: Real-time HF calculation and safety warnings
- **Transaction Management**: Toast notifications for pending/confirmed/failed transactions
- **Responsive Design**: Beautiful UI optimized for desktop and mobile

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Web3**: ethers.js v6
- **Charts**: Recharts
- **State Management**: React Hooks
- **Build Tool**: Vite

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- MetaMask browser extension
- Ganache local blockchain running on port 7545

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd lendhub-frontend
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the `lendhub-frontend` directory:

```env
# RPC Configuration
VITE_RPC_URL=http://127.0.0.1:7545
VITE_CHAIN_ID_HEX=0x539

# Contract Addresses (update after deployment)
VITE_POOL=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
VITE_ORACLE=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
VITE_WETH=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_DAI=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
VITE_USDC=0x0000000000000000000000000000000000000000
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 🧪 Testing Playbook

### Prerequisites for Testing

1. **Start Ganache**: Ensure local blockchain is running on port 7545
2. **Deploy Contracts**: Run the deployment script to get fresh contract addresses
3. **Update Config**: Update contract addresses in `.env.local` and `src/config/contracts.ts`
4. **Fund Account**: Ensure test account has ETH for gas fees

### Test Scenarios

#### 1. Wallet Connection & Network Setup
- [ ] Open `http://localhost:3000`
- [ ] Click "Connect Wallet" → MetaMask popup appears
- [ ] Approve connection → Wallet address displays in header
- [ ] Verify network shows "Ganache Local" (Chain ID: 1337)
- [ ] Check ETH balance displays correctly in Pool Overview

#### 2. ETH to WETH Wrapping
- [ ] Click "Wrap ETH" button
- [ ] Enter amount (e.g., 10 ETH)
- [ ] Click "Wrap ETH to WETH"
- [ ] MetaMask popup → Confirm transaction
- [ ] Toast shows "Pending" → "Success"
- [ ] ETH balance decreases, WETH balance increases
- [ ] Modal closes and opens Supply modal

#### 3. Supply (Lend) Flow
- [ ] In Supply modal, verify WETH balance shows correct amount
- [ ] Enter supply amount (e.g., 8 WETH)
- [ ] Click "Supply"
- [ ] MetaMask popup → Confirm approval transaction
- [ ] MetaMask popup → Confirm supply transaction
- [ ] Toast shows "Pending" → "Success"
- [ ] User position shows supplied amount
- [ ] Pool overview updates with new total supply

#### 4. Withdraw Flow
- [ ] Click "Withdraw" button on WETH
- [ ] Verify "You Supply" shows correct amount
- [ ] Verify "Max Withdraw (x_max)" calculation
- [ ] Click "MAX" → Amount fills with x_max value
- [ ] Click "Withdraw"
- [ ] MetaMask popup → Confirm transaction
- [ ] Toast shows "Pending" → "Success"
- [ ] User position updates, WETH balance increases

#### 5. Borrow Flow (DAI)
- [ ] Click "Borrow" button on DAI
- [ ] Verify "Max Borrow" calculation based on collateral
- [ ] Enter borrow amount (e.g., 1000 DAI)
- [ ] Verify "HF After" shows healthy value (≥ 1.0)
- [ ] Click "Borrow"
- [ ] MetaMask popup → Confirm transaction
- [ ] Toast shows "Pending" → "Success"
- [ ] User position shows borrowed amount
- [ ] Health Factor updates

#### 6. Repay Flow
- [ ] Click "Repay" button on DAI
- [ ] Verify "You Owe" shows correct debt amount
- [ ] Click "MAX" → Amount fills with full debt
- [ ] Click "Repay"
- [ ] MetaMask popup → Confirm approval transaction
- [ ] MetaMask popup → Confirm repay transaction
- [ ] Toast shows "Pending" → "Success"
- [ ] Debt reduces to 0, Health Factor improves

#### 7. Health Factor Safety
- [ ] Try to borrow amount that would make HF < 1
- [ ] Verify "Position Would Be At Risk" warning appears
- [ ] Verify Borrow button is disabled
- [ ] Reduce amount until HF ≥ 1
- [ ] Verify warning disappears, button enables

#### 8. Real-time Updates
- [ ] Verify prices update every 5 seconds
- [ ] Verify interest rates display correctly (not NaN)
- [ ] Verify utilization percentages show properly
- [ ] Verify available liquidity updates

#### 9. Error Handling
- [ ] Try to supply more than balance → Button disabled
- [ ] Try to withdraw more than x_max → Button disabled
- [ ] Try to borrow more than max → Button disabled
- [ ] Try to repay more than debt → Button disabled
- [ ] Test with insufficient gas → Error toast appears

#### 10. UI/UX Polish
- [ ] All modals open/close smoothly
- [ ] Toast notifications appear and auto-dismiss
- [ ] Loading states show during transactions
- [ ] Responsive design works on mobile
- [ ] All calculations display correctly

## 🔧 Configuration

### Contract Addresses

Update contract addresses in `src/config/contracts.ts` after deployment:

```typescript
export const CONFIG = {
  LENDING_POOL: '0x...',
  PRICE_ORACLE: '0x...',
  WETH: '0x...',
  // ... other addresses
};
```

### Token Configuration

Add/modify tokens in the `TOKENS` array:

```typescript
TOKENS: [
  {
    address: '0x...',
    symbol: 'WETH',
    name: 'Wrapped Ethereum',
    decimals: 18,
    isBorrowable: false,
    isCollateral: true,
  },
  // ... other tokens
]
```

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── LendModal.tsx   # Supply modal
│   ├── WithdrawModal.tsx # Withdraw modal
│   ├── BorrowModal.tsx # Borrow modal
│   ├── RepayModal.tsx  # Repay modal
│   └── SimpleDashboard.tsx # Main dashboard
├── hooks/              # Custom React hooks
│   ├── useWallet.ts    # Wallet connection
│   ├── usePoolDataSimple.ts # Pool data fetching
│   └── useAccountData.ts # Account data
├── lib/                # Utility libraries
│   ├── math.ts         # DeFi calculations
│   └── tx.ts           # Transaction service
├── config/             # Configuration
│   ├── contracts.ts    # Contract addresses
│   └── abis.ts         # Contract ABIs
└── App.tsx             # Main app component
```

## 🐛 Troubleshooting

### Common Issues

1. **"Cannot connect to network"**
   - Ensure Ganache is running on port 7545
   - Check RPC URL in `.env.local`

2. **"Contract not deployed"**
   - Run deployment script
   - Update contract addresses in config

3. **"Insufficient funds"**
   - Ensure test account has ETH for gas
   - Check token balances

4. **"Transaction failed"**
   - Check console for error details
   - Verify contract addresses are correct
   - Ensure sufficient gas limit

### Debug Mode

Enable debug logging by opening browser console. All transaction steps and calculations are logged with emojis for easy identification.

## 📝 Development Notes

- Uses simulation mode for WETH balance (contracts may not be fully functional)
- All calculations use BigInt for precision
- Toast notifications provide real-time transaction feedback
- Health Factor calculations follow DeFi best practices
- Responsive design optimized for desktop and mobile

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly using the playbook
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details