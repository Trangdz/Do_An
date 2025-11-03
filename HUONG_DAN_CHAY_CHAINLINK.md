# 🔗 HƯỚNG DẪN CHẠY LẠI CHAINLINK ORACLE

## ✅ ĐÃ CÓ SẴN

Dự án đã có đầy đủ:
- ✅ Contracts: LinkToken.sol, PriceAggregator.sol
- ✅ Scripts: deploy, fund, set_writer, read
- ✅ Docker config: docker-compose.yml
- ✅ Chainlink config: chainlink-data/config.toml
- ✅ Job configs: job-push-price.toml, job-direct-call.toml

---

## 🚀 **CÁCH CHẠY (2 OPTIONS)**

---

## ⚡ **OPTION 1: MOCK ORACLE (NHANH - 5 phút)**

### **Không cần Docker, chỉ cần Ganache!**

```bash
# Step 1: Start Ganache
ganache-cli -p 7545 -i 1337 -m "test test test test test test test test test test test junk"

# Step 2: Deploy contracts
npx hardhat run scripts/deploy_ganache.cjs --network ganache

# Step 3: (Optional) Auto-update prices từ CoinGecko
node scripts/auto_update_prices.cjs

# Step 4: Start frontend
cd lendhub-frontend-nextjs
npm run dev

# Step 5: Test
# http://localhost:3000
```

**✅ Kết quả:**
- Giá real từ CoinGecko
- Update mỗi 30 giây
- Không cần Docker
- Đủ để demo!

---

## 🔗 **OPTION 2: CHAINLINK ORACLE (FULL - 20 phút)**

### **Setup Chainlink Docker + Oracle thật!**

---

### **STEP 1: Deploy Contracts**

```bash
# Compile contracts
npx hardhat compile

# Deploy LinkToken + PriceAggregator
npx hardhat run scripts/deploy_ganache_simple.cjs --network ganache
```

**Kết quả:**
```
✅ LinkToken deployed: 0xe3991215dB9c50878A03FB677c6c0d9A677B3019
✅ PriceAggregator deployed: 0x2C0025315508a70B77aBeaB59206500b679f0902
✅ Saved to: deployments/local-chainlink.json
```

---

### **STEP 2: Setup Docker Chainlink**

```bash
# Check Docker đang chạy
docker ps

# Start Chainlink services
docker-compose up -d

# Check logs
docker-compose logs -f
```

**Services:**
- PostgreSQL: Port 5432
- Chainlink Node: Port 6688

**Access:**
- Chainlink UI: http://localhost:6688

---

### **STEP 3: Login Chainlink UI**

1. Open: http://localhost:6688
2. Username: `phamlendhub@email.com`
3. Password: `MyStrongPassword123!!`

---

### **STEP 4: Fund Chainlink Node**

1. Trong Chainlink UI:
   - Navigate: **Keys → EVM Chain Accounts (Regular)**
   - Copy **node address** (ví dụ: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`)

2. Terminal:
```bash
# Fund node with ETH
NODE_ADDRESS=0xYourNodeAddress npx hardhat run scripts/fund_node.cjs --network ganache
```

---

### **STEP 5: Authorize Node**

```bash
# Give permission để gọi updateAnswer()
NODE_ADDRESS=0xYourNodeAddress npx hardhat run scripts/set_writer.cjs --network ganache
```

---

### **STEP 6: Create Chainlink Job**

1. Chainlink UI: **Jobs → New Job**
2. Copy nội dung từ file: `chainlink-data/job-push-price.toml`
3. **IMPORTANT:** Update address trong job:

```toml
submit   [type="ethtx" to="0x2C0025315508a70B77aBeaB59206500b679f0902" data="$(encode)"]
                                                              ↑
                                            UPDATE TO YOUR AGGREGATOR ADDRESS!
```

4. Click **"Create Job"**

---

### **STEP 7: Test Đọc Giá**

```bash
# Đọc giá từ aggregator
npx hardhat run scripts/read_aggregator.cjs --network ganache
```

**Expected output:**
```
Aggregator: 0x2C0025315508a70B77aBeaB59206500b679f0902
Latest Round Data:
  Round ID: 5
  Answer: 243850000000 (2438.50 USD)
  Started At: 2025-01-15T10:00:00.000Z
  Updated At: 2025-01-15T10:01:00.000Z
```

---

## 📊 **KIẾN TRÚC**

```
┌─────────────────────────────────────────────────────────────┐
│                      SYSTEM FLOW                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Binance API (ETH/USDT)                                     │
│       ↓                                                      │
│  Chainlink Node (fetch mỗi 1 phút)                         │
│       ↓                                                      │
│  Parse JSON → Multiply × 1e8                                │
│       ↓                                                      │
│  Encode updateAnswer(int256)                                │
│       ↓                                                      │
│  Submit ETH transaction                                      │
│       ↓                                                      │
│  PriceAggregator.updateAnswer() → Storage                   │
│       ↓                                                      │
│  latestRoundData() available                                 │
│       ↓                                                      │
│  ChainlinkPriceOracle.getAssetPrice1e18()                   │
│       ↓                                                      │
│  LendingPool uses prices                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ **CHECKLIST**

**Setup:**
- [ ] Ganache running (port 7545)
- [ ] Docker running
- [ ] Chainlink contracts deployed
- [ ] Docker services running

**Configuration:**
- [ ] Chainlink UI login OK
- [ ] Node funded with ETH
- [ ] Node authorized for updateAnswer()
- [ ] Cron job created and running

**Testing:**
- [ ] read_aggregator.cjs returns price
- [ ] Price updates mỗi 1 phút
- [ ] Price matches Binance

---

## 🐛 **TROUBLESHOOTING**

### **Ganache không connect**
```bash
# Check Ganache running
ganache-cli -p 7545 -i 1337 -m "test test test test test test test test test test test junk"
```

### **Docker không start**
```bash
# Clean restart
docker-compose down -v
docker-compose up -d

# Check logs
docker-compose logs -f
```

### **Chainlink node không connect Ganache**
```bash
# Check config
cat chainlink-data/config.toml

# Should have:
# HTTPURL = "http://host.docker.internal:7545"
```

### **Job không update giá**
```bash
# Check job logs trong Chainlink UI
# Check node balance (cần ETH để submit tx)
# Check node authorized (isWriter mapping)
```

---

## 🎯 **COMPARISON**

| Aspect | Mock Oracle | Chainlink Oracle |
|--------|-------------|------------------|
| Setup | 2 phút | 20 phút |
| Docker | ❌ No | ✅ Yes |
| Realistic | ✅ Yes | ✅✅ Very |
| Production | ❌ No | ✅ Yes |
| **Recommended** | ⭐⭐⭐ Development | ⭐⭐⭐⭐⭐ Production |

---

## 🎉 **KẾT QUẢ**

Sau khi hoàn thành:
- ✅ **Real price feeds** từ Binance
- ✅ **Auto-update** mỗi 1 phút
- ✅ **Professional** Oracle system
- ✅ **Production-ready** setup

**Good luck! 🚀**



