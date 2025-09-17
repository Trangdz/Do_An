# LendHub v2 Frontend (Next.js)

A modern DeFi lending platform built with Next.js, React, TypeScript, and Ethers.js v6.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MetaMask browser extension
- Ganache local blockchain (for development)

### Installation

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd lendhub-frontend-nextjs
   npm install
   ```

2. **Start Ganache:**
   ```bash
   # In another terminal
   npx ganache-cli --port 8545
   ```

3. **Deploy contracts:**
   ```bash
   # In the main project directory
   npx hardhat run scripts/09_e2e_simple.cjs --network ganache
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Open browser:**
   [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
src/
├── pages/                 # Next.js pages
│   ├── _app.tsx          # App wrapper with providers
│   ├── _document.tsx     # HTML document structure
│   └── index.tsx         # Home page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── SimpleDashboard.tsx
│   ├── LendModal.tsx
│   ├── BorrowModal.tsx
│   ├── WithdrawModal.tsx
│   ├── RepayModal.tsx
│   └── WrapEthModal.tsx
├── context/              # State management
│   ├── lendContext.js    # React Context
│   ├── LendState.js      # Main state logic
│   └── useLendContext.js # Custom hook
├── config/               # Configuration
│   ├── contracts.ts      # Contract addresses & config
│   └── abis.ts          # Contract ABIs
├── lib/                  # Utilities
│   ├── math.ts          # DeFi math functions
│   └── tx.ts            # Transaction helpers
├── abis/                 # Contract ABIs (JSON)
├── addresses.js          # Contract addresses
├── token-list-goerli.js  # Token configurations
└── styles/
    └── globals.css       # Global styles
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint

# Testing
npm run test:build      # Test build process
npm run test:dev        # Test dev server
npm run test:all        # Run comprehensive tests

# Deployment
npm run deploy:vercel   # Deploy to Vercel
npm run deploy:netlify  # Deploy to Netlify
```

## 🔧 Configuration

### Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_CHAIN_ID=1337
NEXT_PUBLIC_POOL=0x...
NEXT_PUBLIC_ORACLE=0x...
NEXT_PUBLIC_WETH=0x...
NEXT_PUBLIC_DAI=0x...
NEXT_PUBLIC_USDC=0x...
```

### Contract Addresses

Update `src/config/contracts.ts` with your deployed contract addresses:

```typescript
export const CONFIG = {
  LENDING_POOL: '0x...',    // Your LendingPool address
  PRICE_ORACLE: '0x...',    // Your PriceOracle address
  WETH: '0x...',            // Your WETH address
  DAI: '0x...',             // Your DAI address
  USDC: '0x...',            // Your USDC address
};
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Set environment variables in Vercel dashboard**

### Netlify

1. **Build:**
   ```bash
   npm run build
   ```

2. **Deploy:**
   ```bash
   npx netlify deploy --prod --dir=out
   ```

### GitHub Pages

1. **Install gh-pages:**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Add to package.json:**
   ```json
   "scripts": {
     "deploy": "gh-pages -d out"
   }
   ```

3. **Deploy:**
   ```bash
   npm run deploy
   ```

## 🎯 Features

### ✅ Implemented
- **Wallet Connection**: MetaMask integration
- **Token Management**: ETH, WETH, DAI, USDC support
- **Lending**: Supply assets to earn interest
- **Borrowing**: Borrow against collateral
- **Withdrawing**: Withdraw supplied assets
- **Repaying**: Repay borrowed assets
- **ETH Wrapping**: Convert ETH to WETH
- **Real-time Data**: Live balances and prices
- **Responsive Design**: Mobile-friendly UI
- **Transaction Management**: Toast notifications
- **Error Handling**: Comprehensive error management

### 🔄 State Management
- **LendContext**: Centralized state management
- **Real-time Updates**: Automatic data refresh
- **Transaction Tracking**: Pending/success/error states
- **Balance Persistence**: Data persists across refreshes

### 🎨 UI Components
- **Modern Design**: Clean, professional interface
- **Interactive Modals**: Lend, Borrow, Withdraw, Repay
- **Charts**: Price and interest rate visualization
- **Responsive**: Works on all device sizes
- **Loading States**: Skeleton loaders and spinners

## 🔗 Key Technologies

- **Next.js 15.5.3**: React framework with SSR/SSG
- **React 18.3.1**: Frontend library
- **TypeScript**: Type safety and better DX
- **Tailwind CSS**: Utility-first CSS framework
- **Ethers.js v6**: Ethereum interaction library
- **Recharts**: Data visualization
- **Radix UI**: Accessible component primitives

## 🧪 Testing

### Run Tests
```bash
# Test build process
npm run test:build

# Test dev server
npm run test:dev

# Run comprehensive tests
npm run test:all
```

### Test Coverage
- ✅ Build process
- ✅ Development server
- ✅ Contract interactions
- ✅ Wallet connection
- ✅ Transaction handling
- ✅ UI components
- ✅ State management

## 🐛 Troubleshooting

### Common Issues

1. **Build Errors**
   - Check TypeScript errors: `npm run build`
   - Fix linting issues: `npm run lint`

2. **Runtime Errors**
   - Check browser console for errors
   - Verify contract addresses are correct
   - Ensure MetaMask is connected

3. **Connection Issues**
   - Verify Ganache is running on port 8545
   - Check network configuration
   - Ensure contracts are deployed

4. **Transaction Failures**
   - Check account has sufficient ETH
   - Verify contract addresses
   - Check gas limits

## 📚 Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Ethers.js v6 Docs](https://docs.ethers.org/v6/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [DeFi Math Guide](https://docs.aave.com/risk/liquidity-risk/borrow-interest-rate)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please:
1. Check the troubleshooting section
2. Review the documentation
3. Open an issue on GitHub
4. Contact the development team

---

**Built with ❤️ for the DeFi community**