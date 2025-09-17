# LendHub v2 Next.js Deployment Guide

## 🚀 Quick Deploy to Vercel

### 1. Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name: lendhub-v2-nextjs
# - Directory: ./
# - Override settings? N
```

### 2. Environment Variables

Set these in Vercel dashboard:

```
NEXT_PUBLIC_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_POOL=0x...
NEXT_PUBLIC_ORACLE=0x...
NEXT_PUBLIC_WETH=0x...
NEXT_PUBLIC_DAI=0x...
NEXT_PUBLIC_USDC=0x...
```

### 3. Deploy to Netlify

```bash
# Build
npm run build

# Deploy
npx netlify deploy --prod --dir=out
```

### 4. Deploy to GitHub Pages

```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts:
"deploy": "gh-pages -d out"

# Deploy
npm run deploy
```

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📱 Features

- ✅ Next.js 15.5.3
- ✅ React 18.3.1
- ✅ TypeScript support
- ✅ Tailwind CSS styling
- ✅ Ethers.js v6 integration
- ✅ LendContext state management
- ✅ Responsive design
- ✅ MetaMask integration
- ✅ DeFi lending/borrowing UI

## 🌐 Live Demo

Once deployed, your app will be available at:
- Vercel: `https://lendhub-v2-nextjs.vercel.app`
- Netlify: `https://lendhub-v2-nextjs.netlify.app`
- GitHub Pages: `https://username.github.io/lendhub-v2-nextjs`

## 🔗 Contract Addresses

Update these in `src/config/contracts.ts` for production:

```typescript
export const CONFIG = {
  LENDING_POOL: '0x...', // Mainnet LendingPool
  PRICE_ORACLE: '0x...', // Mainnet PriceOracle
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Mainnet WETH
  DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // Mainnet DAI
  USDC: '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C', // Mainnet USDC
};
```

## 🛠️ Troubleshooting

### Build Errors
- Check TypeScript errors: `npm run build`
- Fix linting issues: `npm run lint`

### Runtime Errors
- Check browser console for errors
- Verify contract addresses are correct
- Ensure MetaMask is connected to correct network

### Deployment Issues
- Verify environment variables are set
- Check build logs in deployment platform
- Ensure all dependencies are installed


