# LendHub v2 Frontend

A modern React-based frontend for the LendHub v2 decentralized lending protocol, built with TypeScript, Tailwind CSS, and ethers.js v6.

## Features

- 🏦 **Lending & Borrowing**: Supply assets to earn interest, borrow against collateral
- 📊 **Real-time Analytics**: Live charts for interest rates and asset prices
- ⚡ **Liquidation**: Liquidate unhealthy positions when Health Factor < 1
- 🔗 **Web3 Integration**: MetaMask wallet connection with Ganache support
- 📱 **Responsive Design**: Modern UI with Tailwind CSS and shadcn/ui components
- 🎯 **Type Safety**: Full TypeScript support with proper type definitions

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **ethers.js v6** for blockchain interactions
- **Recharts** for data visualization
- **Radix UI** for accessible components

## Prerequisites

- Node.js 18+ 
- MetaMask browser extension
- Ganache running on http://127.0.0.1:7545
- LendHub v2 contracts deployed on Ganache

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open http://localhost:3000 in your browser

## Configuration

The app is configured to work with the following contract addresses (update in `src/types/index.ts`):

- **Lending Pool**: `0x1235aFDCab4a91496Bd74B3C527E50f961484d74`
- **Price Oracle**: `0xE315EF5DA360EC7Cfd0c59fEdf9F21a1E2c75A6b`
- **WETH**: `0xb5d81ad8Cacf1F3462e4C264Fd1850E4448464DA`
- **DAI**: `0xD7C7F0F9DA99f7630FFE1336333db8818caa3fc2`

## Usage

1. **Connect Wallet**: Click "Connect MetaMask" and ensure you're connected to Ganache network
2. **Select Asset**: Choose WETH or DAI to perform operations
3. **Supply**: Deposit assets to earn interest
4. **Borrow**: Borrow against your collateral (DAI only)
5. **Withdraw**: Withdraw your supplied assets
6. **Repay**: Repay borrowed assets
7. **Liquidate**: Liquidate unhealthy positions (HF < 1)

## Key Features

### Mathematical Calculations

The app implements all required DeFi formulas:

- **Utilization**: `U = totalDebt / (reserveCash + totalDebt)`
- **Supply Rate**: `supplyRate ≈ borrowRate * U * (1 - reserveFactor)`
- **Health Factor**: `HF = Σ(supply_i * price_i * liqThreshold_i) / Σ(debt_j * price_j)`
- **Max Withdraw**: `x_max = ((CollateralUSD - DebtUSD) * 10000) / (Price(asset) * liqThresholdBps_asset)`

### Real-time Updates

- Event listeners for all contract events
- Automatic data refresh after transactions
- Live interest rate updates
- Real-time Health Factor monitoring

### Safety Features

- Health Factor warnings and color coding
- Max borrow/withdraw calculations
- Transaction status indicators
- Error handling and user feedback

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── WalletConnect.tsx
│   ├── MarketOverview.tsx
│   ├── LendingActions.tsx
│   ├── Charts.tsx
│   └── LiquidationPanel.tsx
├── hooks/              # Custom React hooks
│   ├── useWeb3.ts
│   └── useLendingPool.ts
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
│   ├── math.ts         # Mathematical calculations
│   ├── contracts.ts    # Contract interactions
│   └── cn.ts          # Class name utilities
└── App.tsx            # Main application component
```

## Development

### Adding New Features

1. Create components in `src/components/`
2. Add types in `src/types/index.ts`
3. Implement utilities in `src/utils/`
4. Use hooks for state management

### Styling

- Use Tailwind CSS classes
- Follow shadcn/ui patterns
- Maintain consistent spacing and colors
- Ensure responsive design

### Blockchain Integration

- Use `ContractManager` for all contract interactions
- Implement proper error handling
- Add loading states for transactions
- Listen to contract events for real-time updates

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## License

MIT License - see LICENSE file for details.