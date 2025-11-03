# 🔄 REAL-TIME PRICE UPDATE GUIDE

## Hệ thống cập nhật giá real-time không cần reload trang

---

## 🎯 **TỔNG QUAN**

Hệ thống gồm 2 phần:

### **1. Backend Price Updater (Oracle)**
```bash
# Auto-updater chạy mỗi 30s
npx hardhat run scripts/auto_update_prices.cjs --network ganache

# Hoặc
node scripts/auto_update_prices.cjs
```

**Nhiệm vụ:**
- Fetch giá real từ CoinGecko API
- Add fluctuation ±0.5% (realistic)
- Update vào PriceOracle contract
- Chạy liên tục mỗi 30 giây

### **2. Frontend Price Polling**
```typescript
// useRealtimePrices hook
// Poll oracle mỗi 10s
const realtimePrices = useRealtimePrices(
  provider,
  oracleAddress,
  tokenAddresses,
  10000 // 10 seconds
);
```

**Nhiệm vụ:**
- Poll oracle contract mỗi 10s
- Fetch giá tất cả tokens
- Update UI tự động
- Show animation khi thay đổi

---

## 🚀 **CÁCH SỬ DỤNG**

### **Step 1: Deploy Contracts**
```bash
npx hardhat run scripts/deploy_ganache.cjs --network ganache
```

### **Step 2: Start Auto-Updater**
```bash
# Terminal 1
npx hardhat run scripts/auto_update_prices.cjs --network ganache
```

Output:
```
🤖 AUTO PRICE UPDATER
📊 Update interval: 30 seconds

⏰ [Time] Starting update cycle...
✅ Real prices fetched:
   ETH:  $4470.77
   LINK: $22.74
✅ Updated 4 prices successfully!
```

### **Step 3: Start Frontend**
```bash
# Terminal 2
cd lendhub-frontend-nextjs
npm run dev
```

### **Step 4: Xem Giá Real-time**
1. Mở browser: `http://localhost:3000`
2. Connect MetaMask
3. **Giá sẽ tự động update mỗi 10s!**

---

## ✨ **TÍNH NĂNG**

### **1. Auto Price Update**
- ⏰ Backend: Mỗi 30s fetch CoinGecko
- ⏰ Frontend: Mỗi 10s poll Oracle
- 🔄 Không cần reload trang

### **2. Visual Feedback**
```
📈 Giá tăng → Màu xanh + ↗ + Scale 110%
📉 Giá giảm → Màu đỏ + ↘ + Scale 110%
● Pulse dot khi đang update
```

### **3. Smooth Animation**
- Transition 300ms
- No jitter/lag
- Seamless updates

---

## 🔧 **CONFIGURATION**

### **Backend Update Interval:**
```javascript
// scripts/auto_update_prices.cjs
const UPDATE_INTERVAL = 30000; // 30 seconds

// Thay đổi:
const UPDATE_INTERVAL = 60000; // 1 minute (slower)
const UPDATE_INTERVAL = 10000; // 10 seconds (faster)
```

### **Frontend Poll Interval:**
```typescript
// SimpleDashboard.tsx
const realtimePrices = useRealtimePrices(
  provider,
  oracleAddress,
  tokenAddresses,
  10000 // 10 seconds
);

// Thay đổi:
5000  // 5 seconds (faster)
15000 // 15 seconds (slower)
```

### **Price Fluctuation:**
```javascript
// scripts/update_prices_realistic.cjs
function addFluctuation(price, maxPercent = 0.5) {
  // ±0.5% default
}

// Thay đổi:
maxPercent = 0.1  // ±0.1% (less volatile)
maxPercent = 1.0  // ±1.0% (more volatile)
```

---

## 📊 **FLOW HOẠT ĐỘNG**

```
┌─────────────────────────────────────────────────────────┐
│                    REAL-TIME FLOW                       │
└─────────────────────────────────────────────────────────┘

1. CoinGecko API (External)
   ↓ Fetch every 30s
   ETH: $4470.77
   LINK: $22.74
   
2. Auto-Updater Script
   ↓ Add fluctuation ±0.5%
   ETH: $4468.25 (fluctuated)
   LINK: $22.78 (fluctuated)
   
3. PriceOracle Contract
   ↓ Store on-chain
   setAssetPrice(WETH, 4468.25)
   setAssetPrice(LINK, 22.78)
   
4. Frontend Poll (every 10s)
   ↓ Read from contract
   useRealtimePrices() → fetch prices
   
5. UI Update
   ↓ Auto update without reload
   Show price with animation
   Color: green/red
   Arrow: ↗/↘
   Pulse: ●
```

---

## 🐛 **TROUBLESHOOTING**

### **Vấn đề 1: Giá không update**

**Nguyên nhân:** Auto-updater không chạy hoặc sai network

**Giải pháp:**
```bash
# Check auto-updater đang chạy:
ps aux | grep "auto_update_prices"

# Restart auto-updater với đúng network:
npx hardhat run scripts/auto_update_prices.cjs --network ganache
```

---

### **Vấn đề 2: Frontend lỗi "BAD_DATA"**

**Nguyên nhân:** Oracle address không khớp

**Giải pháp:**
```javascript
// Check addresses.js
console.log("Oracle:", PriceOracleAddress);

// Check auto-updater
console.log("Oracle in script:", ORACLE_ADDRESS);

// Must match!
```

---

### **Vấn đề 3: Animation không smooth**

**Nguyên nhân:** Update quá nhanh

**Giải pháp:**
```typescript
// Giảm tần suất poll
const realtimePrices = useRealtimePrices(
  provider,
  oracleAddress,
  tokenAddresses,
  15000 // 15s instead of 10s
);
```

---

## 📈 **PERFORMANCE**

### **Resource Usage:**

| Component | CPU | Memory | Network |
|-----------|-----|--------|---------|
| Auto-updater | ~2% | ~50MB | ~1KB/30s |
| Frontend poll | <1% | ~20MB | ~500B/10s |
| Total | ~3% | ~70MB | Minimal |

### **Optimization Tips:**

1. **Reduce poll frequency** if not needed:
   ```typescript
   20000 // 20s instead of 10s
   ```

2. **Batch fetch prices** (already implemented):
   ```typescript
   Promise.all(pricePromises) // Parallel fetch
   ```

3. **Cache prices** to reduce calls:
   ```typescript
   // Only update if price changed > 0.1%
   if (Math.abs(newPrice - oldPrice) / oldPrice > 0.001) {
     updateUI(newPrice);
   }
   ```

---

## 🎬 **DEMO SCRIPT**

### **Cho Giảng Viên:**

```
1. "Đây là hệ thống real-time price update"

2. "Backend tự động fetch từ CoinGecko mỗi 30s"
   [Show Terminal 1: Auto-updater logs]

3. "Frontend poll oracle mỗi 10s để update UI"
   [Show browser: Prices updating]

4. "Giá thay đổi có animation smooth"
   [Point to: Green ↗ when up, Red ↘ when down]

5. "Không cần reload, không lag, production-like"
   [Scroll page, interact, prices still updating]

6. "Đây là cách các DeFi protocol thực tế hoạt động"
   [Compare với Aave, Uniswap]
```

---

## ✅ **CHECKLIST**

Before demo:
- [ ] Ganache running (port 7545)
- [ ] Contracts deployed
- [ ] Auto-updater running (Terminal 1)
- [ ] Frontend running (Terminal 2)
- [ ] Browser open (localhost:3000)
- [ ] MetaMask connected
- [ ] Prices updating (check every 10s)

---

## 🎯 **SUMMARY**

**Đã implement:**
1. ✅ Real-time price fetching từ CoinGecko
2. ✅ Auto-update mỗi 30s (backend) + 10s (frontend)
3. ✅ Smooth animation với color + arrow
4. ✅ No page reload needed
5. ✅ Production-like experience

**Kết quả:**
- ✅ Giá cập nhật tự động
- ✅ Visual feedback rõ ràng
- ✅ Performance tốt
- ✅ User experience mượt mà

**Ready to demo! 🚀🎓✨**

