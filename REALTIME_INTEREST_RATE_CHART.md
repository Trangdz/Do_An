# 📈 Real-time Interest Rate Chart System

## 🎯 **OVERVIEW**

Hệ thống biểu đồ real-time để theo dõi lãi suất (APR) của tất cả các tài sản theo thời gian thực!

---

## ✨ **FEATURES**

### 1. **Real-time Polling (5 giây/lần)**
- Tự động fetch APR mỗi 5 giây
- Hiển thị ngay lập tức không cần reload

### 2. **Historical Data Storage**
- Lưu trữ lịch sử trong `localStorage`
- Giữ lại tối đa 50 data points cho mỗi tài sản
- Persist qua các lần reload trang

### 3. **Multi-Asset Tracking**
- Theo dõi đồng thời: WETH, DAI, USDC, LINK
- Mỗi asset có 2 lines:
  - **Supply APR** (solid line)
  - **Borrow APR** (dashed line)

### 4. **Beautiful Visualization**
- Sử dụng Recharts library
- Color-coded cho từng asset
- Interactive tooltips
- Responsive design

### 5. **Live Indicators**
- Pulsing dot để show real-time status
- Loading spinner khi đang update
- Auto-refresh countdown

---

## 🏗️ **ARCHITECTURE**

```
┌─────────────────────────────────────────────────────────┐
│                   SimpleDashboard                       │
│                                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │  useInterestRateHistory Hook                   │   │
│  │  - Polls every 5 seconds                       │   │
│  │  - Stores in localStorage                      │   │
│  │  - Returns: history, isLoading, error          │   │
│  └────────────────────────────────────────────────┘   │
│               ↓                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │  InterestRateChart Component                   │   │
│  │  - Transforms history data                     │   │
│  │  - Renders Recharts LineChart                  │   │
│  │  - Shows live indicators                       │   │
│  └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │   LendingPool Contract       │
        │   - reserves() function      │
        │   - Returns APR data         │
        └──────────────────────────────┘
```

---

## 📊 **DATA STRUCTURE**

### **RateDataPoint**
```typescript
{
  timestamp: 1696363200000,     // Unix timestamp
  time: "01:00:00",            // HH:MM:SS format
  supplyAPR: 2.5,              // % per year
  borrowAPR: 5.0,              // % per year
  utilization: 50.0            // %
}
```

### **AssetRateHistory**
```typescript
{
  "0xWETH_ADDRESS": {
    symbol: "WETH",
    history: [
      { timestamp: ..., time: "01:00:00", supplyAPR: 2.5, borrowAPR: 5.0, utilization: 50.0 },
      { timestamp: ..., time: "01:00:05", supplyAPR: 2.6, borrowAPR: 5.1, utilization: 51.0 },
      // ... up to 50 points
    ]
  },
  "0xDAI_ADDRESS": {
    symbol: "DAI",
    history: [ ... ]
  },
  // ...
}
```

### **Chart Data Transformation**
```typescript
// Input: AssetRateHistory
{
  "0xWETH": { symbol: "WETH", history: [...] },
  "0xDAI": { symbol: "DAI", history: [...] }
}

// Output: Chart Data
[
  {
    timestamp: 1696363200000,
    time: "01:00:00",
    WETH_Supply: 2.5,
    WETH_Borrow: 5.0,
    DAI_Supply: 1.2,
    DAI_Borrow: 3.5
  },
  // ...
]
```

---

## 🎨 **VISUAL DESIGN**

### **Color Palette**
```javascript
WETH: { supply: '#10b981' (green), borrow: '#ef4444' (red) }
DAI:  { supply: '#3b82f6' (blue),  borrow: '#f97316' (orange) }
USDC: { supply: '#8b5cf6' (purple), borrow: '#ec4899' (pink) }
LINK: { supply: '#f59e0b' (amber), borrow: '#14b8a6' (teal) }
```

### **Line Styles**
- **Supply APR**: Solid line, thicker (2.5px)
- **Borrow APR**: Dashed line (5px dash, 5px gap)

### **Animations**
- ✅ Pulsing green dot for "Live Updates"
- ⏳ Spinning loader when fetching data
- 📈 Smooth line transitions (300ms)

---

## 🚀 **USAGE**

### **Basic Integration**
```tsx
import { useInterestRateHistory } from '../hooks/useInterestRateHistory';
import { InterestRateChart } from './InterestRateChart';

function MyComponent() {
  const assets = [
    { address: '0xWETH...', symbol: 'WETH' },
    { address: '0xDAI...', symbol: 'DAI' }
  ];

  const { history, isLoading, error, clearHistory } = useInterestRateHistory(
    provider,
    poolAddress,
    assets,
    5000 // Update every 5 seconds
  );

  return (
    <InterestRateChart
      history={history}
      isLoading={isLoading}
      error={error}
      onClearHistory={clearHistory}
    />
  );
}
```

---

## 🔍 **HOW IT WORKS**

### **Step 1: Initial Load**
```
1. Component mounts
2. Load history from localStorage (if available)
3. Start polling every 5 seconds
```

### **Step 2: Data Fetch (every 5 seconds)**
```
1. Get current timestamp & time
2. For each asset:
   a. Call getReserveAPRData(provider, poolAddress, assetAddress)
   b. Extract: supplyAPR, borrowAPR, utilization
   c. Create RateDataPoint
3. Append to history array
4. Keep only last 50 points
5. Save to localStorage
```

### **Step 3: Render Chart**
```
1. Transform AssetRateHistory → Chart Data
2. Render Recharts LineChart
3. Show legend with color codes
4. Display live indicators
```

---

## 💾 **LOCAL STORAGE**

### **Key**: `lendhub_rate_history`

### **Value**: JSON string of `AssetRateHistory`

### **Example**:
```json
{
  "0x5FbDB2315678afecb367f032d93F642f64180aa3": {
    "symbol": "WETH",
    "history": [
      {
        "timestamp": 1696363200000,
        "time": "01:00:00",
        "supplyAPR": 2.5,
        "borrowAPR": 5.0,
        "utilization": 50.0
      }
    ]
  }
}
```

### **Clear History**:
```typescript
clearHistory(); // Clears both state and localStorage
```

---

## 🎯 **DEMO WORKFLOW**

### **Scenario: Theo dõi thay đổi APR khi user borrow**

**Before Borrow:**
```
Time: 01:00:00
WETH Supply APR: 0.50%
WETH Borrow APR: 1.00%
Utilization: 10%
```

**User borrows 100 DAI:**
```
⏱ 5 seconds later...
Time: 01:00:05
WETH Supply APR: 0.50%  (unchanged)
DAI Supply APR: 0.80% → 1.20% ⬆️
DAI Borrow APR: 2.00% → 3.50% ⬆️
DAI Utilization: 20% → 35% ⬆️
```

**Chart Updates Automatically:**
- DAI line slopes upward
- User sees immediate visual feedback
- No page reload needed!

---

## 📈 **EXPECTED BEHAVIOR**

### **Normal Conditions**
```
✅ Chart shows smooth lines
✅ Data updates every 5 seconds
✅ Pulsing dot indicates live status
✅ Tooltips show precise values
```

### **No Borrow Activity**
```
⚠️ Lines stay flat (0% APR)
⚠️ Utilization = 0%
ℹ️ This is normal when pool is idle
```

### **Active Borrowing**
```
📊 Supply APR increases with utilization
📊 Borrow APR increases faster (2-slope model)
📊 Lines show dynamic movement
```

### **Edge Cases**
```
🔄 If reserve not initialized → Show 0% (no error)
⚠️ If provider disconnected → Show error message
🗑️ If history > 50 points → Auto-trim oldest data
```

---

## 🛠️ **TROUBLESHOOTING**

### **"No interest rate data available"**
**Причина**: No data points yet
**Solution**: Wait 5 seconds for first data fetch

### **Chart not updating**
**Причина**: Provider issue or network error
**Solution**: 
1. Check Ganache is running
2. Check MetaMask connection
3. Open console for errors

### **All lines at 0%**
**Причина**: No borrowing activity
**Solution**: 
1. Supply some assets
2. Borrow some assets
3. Wait 5 seconds for update

### **Data not persisting**
**Причина**: localStorage disabled or full
**Solution**: 
1. Check browser localStorage settings
2. Clear old data with "Clear History" button

---

## 🎨 **CUSTOMIZATION**

### **Change Update Interval**
```typescript
useInterestRateHistory(
  provider,
  poolAddress,
  assets,
  10000 // Change to 10 seconds
);
```

### **Change Max Data Points**
```typescript
// In useInterestRateHistory.ts
const MAX_DATA_POINTS = 100; // Keep 100 points instead of 50
```

### **Change Colors**
```typescript
// In InterestRateChart.tsx
const ASSET_COLORS = [
  { supply: '#YOUR_COLOR', borrow: '#YOUR_COLOR' },
  // ...
];
```

---

## 📝 **CODE LOCATIONS**

### **Hook**
```
lendhub-frontend-nextjs/src/hooks/useInterestRateHistory.ts
```

### **Component**
```
lendhub-frontend-nextjs/src/components/InterestRateChart.tsx
```

### **Integration**
```
lendhub-frontend-nextjs/src/components/SimpleDashboard.tsx
Lines 63-73: Hook initialization
Lines 558-576: Chart rendering
```

---

## ✅ **COMPLETE FEATURE LIST**

- [x] Real-time APR polling (5s interval)
- [x] Multi-asset tracking (WETH, DAI, USDC, LINK)
- [x] Historical data storage (localStorage)
- [x] Auto-trim (max 50 points)
- [x] Beautiful visualization (Recharts)
- [x] Color-coded assets
- [x] Supply APR (solid line)
- [x] Borrow APR (dashed line)
- [x] Interactive tooltips
- [x] Live status indicators
- [x] Loading states
- [x] Error handling
- [x] Responsive design
- [x] Clear history function
- [x] Data persistence
- [x] Smooth animations

---

## 🚀 **NEXT STEPS**

### **To See It In Action:**

1. **Ensure Ganache is running**
2. **Restart frontend** (to clear cache):
   ```bash
   cd lendhub-frontend-nextjs
   rm -rf .next
   npm run dev
   ```
3. **Connect MetaMask**
4. **Wait 5 seconds** for first data point
5. **Perform some actions**:
   - Supply assets
   - Borrow assets
   - Watch the chart update! 📈

---

## 🎉 **EXPECTED RESULT**

You'll see a beautiful, animated chart showing:
- ✅ Real-time Supply APR lines
- ✅ Real-time Borrow APR lines
- ✅ Color-coded by asset
- ✅ Pulsing live indicator
- ✅ Auto-updates every 5 seconds
- ✅ Interactive tooltips on hover

**The chart will dynamically respond to your lending/borrowing actions!**

---

**Built with ❤️ for realistic DeFi demo! 🚀**

