# 🔗 Hướng Dẫn Setup 2 Chainlink Nodes + Price Aggregators

## Mô hình hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                      BLOCKCHAIN (Hardhat)                        │
│                    ws://localhost:8545                           │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
      ┌────────▼────────┐            ┌────────▼────────┐
      │ Chainlink Node 1│            │ Chainlink Node 2│
      │ Port: 6688      │            │ Port: 6689      │
      │ DB: postgres1   │            │ DB: postgres2   │
      └────────┬────────┘            └────────┬────────┘
               │                              │
               └──────────┬───────────────────┘
                          │
                   ┌──────▼──────┐
                   │ Aggregators │
                   │ (ETH, USDC, │
                   │ DAI, LINK)  │
                   └─────────────┘
```

## BƯỚC 1: Khởi động Hardhat Node

```powershell
npx hardhat node
```

**Để chạy nền:**
- Terminal 1: `npx hardhat node`
- Để terminal đó mở, mở terminal mới cho các lệnh sau.

---

## BƯỚC 2: Khởi động 2 Chainlink Nodes

```powershell
docker compose -f docker-compose-dual-nodes.yml up -d
```

**Kiểm tra:**
```powershell
docker ps
```

**Kết quả:**
```
chainlink_node1     Up     0.0.0.0:6688->6688/tcp
chainlink_node2     Up     0.0.0.0:6689->6688/tcp
chainlink_postgres1 Up     0.0.0.0:5433->5432/tcp
chainlink_postgres2 Up     0.0.0.0:5434->5432/tcp
```

**Truy cập UI:**
- Node 1: http://localhost:6688
  - Login: `node1@lendhub.com` / `Node1SecureUIPass!23`
- Node 2: http://localhost:6689
  - Login: `node2@lendhub.com` / `Node2SecureUIPass!56`

---

## BƯỚC 3: Deploy Smart Contracts + Aggregators

```powershell
npx hardhat run scripts/deploy_ganache_simple.cjs --network localhost
```

**Output quan trọng:**
- WETH, USDC, DAI, LINK addresses
- LendingPool, PriceOracle addresses
- **5 Aggregators** (ETH, WETH, USDC, DAI, LINK)
- File lưu: `deployments/aggregators.json`

---

## BƯỚC 4: Lấy Địa Chỉ Sending của 2 Nodes

### Node 1:
```powershell
docker logs chainlink_node1 --tail 100 | Select-String "OUT OF FUNDS"
```
**Hoặc:** Vào UI http://localhost:6688 → Keys → EVM Chain Accounts → copy địa chỉ có nhiều tx nhất.

**Giả sử:** `NODE1_ADDRESS=0xabc...`

### Node 2:
```powershell
docker logs chainlink_node2 --tail 100 | Select-String "OUT OF FUNDS"
```
**Hoặc:** http://localhost:6689 → Keys

**Giả sử:** `NODE2_ADDRESS=0xdef...`

---

## BƯỚC 5: Cấp Quyền Cho Cả 2 Nodes

Tạo script `scripts/authorize_both_nodes.cjs`:

```javascript
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const node1 = process.env.NODE1_ADDRESS;
  const node2 = process.env.NODE2_ADDRESS;
  
  if (!node1 || !node2) {
    throw new Error("Set NODE1_ADDRESS and NODE2_ADDRESS");
  }

  const meta = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8"));
  
  console.log("Node 1:", node1);
  console.log("Node 2:", node2);
  console.log("\nAuthorizing both nodes...\n");

  for (const [symbol, address] of Object.entries(meta.aggregators)) {
    console.log(`${symbol}: ${address}`);
    const agg = await ethers.getContractAt("PriceAggregator", address);
    
    // Authorize cả 2 nodes
    const tx1 = await agg.setWriter(node1, true);
    await tx1.wait();
    console.log(`  ✅ Node 1 authorized`);
    
    const tx2 = await agg.setWriter(node2, true);
    await tx2.wait();
    console.log(`  ✅ Node 2 authorized\n`);
  }

  console.log("✅ Both nodes authorized for all aggregators!");
}

main().catch((e) => { console.error(e); process.exit(1); });
```

**Chạy:**
```powershell
$env:NODE1_ADDRESS="0xNODE1_SENDING"
$env:NODE2_ADDRESS="0xNODE2_SENDING"
npx hardhat run scripts/authorize_both_nodes.cjs --network localhost
```

---

## BƯỚC 6: Fund ETH cho Cả 2 Nodes

```powershell
# Node 1
$env:NODE_ADDRESS="0xNODE1_SENDING"
$env:AMOUNT_ETH="10.0"
npx hardhat run scripts/fund_node.cjs --network localhost

# Node 2
$env:NODE_ADDRESS="0xNODE2_SENDING"
$env:AMOUNT_ETH="10.0"
npx hardhat run scripts/fund_node.cjs --network localhost
```

---

## BƯỚC 7: Tạo Jobs Cho Cả 2 Nodes

### Tạo jobs cho Node 1 (API chính - Binance)

Tạo `scripts/create_jobs_node1.cjs`:

```javascript
const fs = require("fs");
const axios = require("axios");

const JOBS = [
  { symbol: "ETH", url: "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT", path: "price" },
  { symbol: "USDC", url: "https://api.binance.com/api/v3/ticker/price?symbol=USDCUSDT", path: "price" },
  { symbol: "DAI", url: "https://api.binance.com/api/v3/ticker/price?symbol=DAIUSDT", path: "price" },
  { symbol: "LINK", url: "https://api.binance.com/api/v3/ticker/price?symbol=LINKUSDT", path: "price" },
  { symbol: "WETH", url: "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT", path: "price" },
];

async function main() {
  const apiUrl = "http://localhost:6688";
  const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8")).aggregators;

  const loginRes = await axios.post(`${apiUrl}/sessions`, { 
    email: "node1@lendhub.com", 
    password: "Node1SecureUIPass!23" 
  });
  const cookie = loginRes.headers["set-cookie"];
  
  console.log("Creating jobs for Node 1 (Binance source)...\n");

  for (const job of JOBS) {
    const toml = `type = "cron"
schemaVersion = 1
name = "${job.symbol}/USD Node1"
schedule = "@every 1m"
observationSource = """
fetch    [type="http" method="GET" url="${job.url}" allowUnrestrictedNetworkAccess=true]
parse    [type="jsonparse" path="${job.path}" data="$(fetch)"]
multiply [type="multiply" input="$(parse)" times=100000000]
encode   [type="ethabiencode" abi="(int256 answer)" data="<[ $(multiply) ]>"]
submit   [type="ethtx" to="${aggregators[job.symbol] || aggregators['ETH']}" data="$(encode)"]
fetch -> parse -> multiply -> encode -> submit
"""`;

    try {
      const res = await axios.post(`${apiUrl}/v2/jobs`, { toml }, { headers: { Cookie: cookie } });
      console.log(`✅ ${job.symbol}/USD: Job ID ${res.data.data.id}`);
    } catch (e) {
      console.error(`❌ ${job.symbol}:`, e.response?.data || e.message);
    }
  }
  console.log("\n✅ Node 1 jobs created!");
}

main().catch((e) => { console.error(e); process.exit(1); });
```

### Tạo jobs cho Node 2 (API phụ - Coinbase/backup)

Tạo `scripts/create_jobs_node2.cjs`:

```javascript
const fs = require("fs");
const axios = require("axios");

const JOBS = [
  { symbol: "ETH", url: "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD", path: "USD" },
  { symbol: "USDC", url: "https://min-api.cryptocompare.com/data/price?fsym=USDC&tsyms=USD", path: "USD" },
  { symbol: "DAI", url: "https://min-api.cryptocompare.com/data/price?fsym=DAI&tsyms=USD", path: "USD" },
  { symbol: "LINK", url: "https://min-api.cryptocompare.com/data/price?fsym=LINK&tsyms=USD", path: "USD" },
  { symbol: "WETH", url: "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD", path: "USD" },
];

async function main() {
  const apiUrl = "http://localhost:6689";  // Node 2 port
  const aggregators = JSON.parse(fs.readFileSync("deployments/aggregators.json", "utf8")).aggregators;

  const loginRes = await axios.post(`${apiUrl}/sessions`, { 
    email: "node2@lendhub.com", 
    password: "Node2SecureUIPass!56" 
  });
  const cookie = loginRes.headers["set-cookie"];
  
  console.log("Creating jobs for Node 2 (CryptoCompare source)...\n");

  for (const job of JOBS) {
    const toml = `type = "cron"
schemaVersion = 1
name = "${job.symbol}/USD Node2"
schedule = "@every 1m"
observationSource = """
fetch    [type="http" method="GET" url="${job.url}" allowUnrestrictedNetworkAccess=true]
parse    [type="jsonparse" path="${job.path}" data="$(fetch)"]
multiply [type="multiply" input="$(parse)" times=100000000]
encode   [type="ethabiencode" abi="(int256 answer)" data="<[ $(multiply) ]>"]
submit   [type="ethtx" to="${aggregators[job.symbol] || aggregators['ETH']}" data="$(encode)"]
fetch -> parse -> multiply -> encode -> submit
"""`;

    try {
      const res = await axios.post(`${apiUrl}/v2/jobs`, { toml }, { headers: { Cookie: cookie } });
      console.log(`✅ ${job.symbol}/USD: Job ID ${res.data.data.id}`);
    } catch (e) {
      console.error(`❌ ${job.symbol}:`, e.response?.data || e.message);
    }
  }
  console.log("\n✅ Node 2 jobs created!");
}

main().catch((e) => { console.error(e); process.exit(1); });
```

**Chạy:**
```powershell
node scripts/create_jobs_node1.cjs
node scripts/create_jobs_node2.cjs
```

---

## BƯỚC 8: Kiểm Tra Hệ Thống

### Xem job runs
- Node 1: http://localhost:6688 → Jobs → xem Runs
- Node 2: http://localhost:6689 → Jobs → xem Runs

### Đọc giá từ aggregator
```powershell
npx hardhat run scripts/read_aggregator.cjs --network localhost
```

**Kết quả:** Aggregator nhận giá từ CẢ 2 nodes (nếu cả 2 đều push).

---

## LỢI ÍCH CỦA 2 NODES

1. **Phi tập trung:** Nếu 1 node down, node kia vẫn push giá.
2. **Đa nguồn:** Node 1 dùng Binance, Node 2 dùng CryptoCompare → tránh single point of failure.
3. **Giống thực tế:** Chainlink mainnet có hàng chục nodes cùng feed vào 1 aggregator.
4. **Có thể nâng cấp:** Thêm logic median/average từ nhiều nodes (cần contract aggregator phức tạp hơn).

---

## QUẢN LÝ

### Xem logs
```powershell
docker compose -f docker-compose-dual-nodes.yml logs -f chainlink-node1
docker compose -f docker-compose-dual-nodes.yml logs -f chainlink-node2
```

### Restart
```powershell
docker compose -f docker-compose-dual-nodes.yml restart chainlink-node1
docker compose -f docker-compose-dual-nodes.yml restart chainlink-node2
```

### Stop
```powershell
docker compose -f docker-compose-dual-nodes.yml down
```

---

## NÂNG CẤP: Aggregator Với Median Từ Nhiều Nodes

Để thực sự lấy median từ nhiều nguồn (như Chainlink thật), cần:
1. Contract `FluxAggregator` hoặc `OffchainAggregator` (phức tạp).
2. Hoặc đơn giản: mỗi node push vào aggregator riêng, frontend đọc cả 2 rồi tính median.

---

## TROUBLESHOOTING

### Node không kết nối được Hardhat
- Kiểm tra `config.toml`: `WSURL = "ws://host.docker.internal:8545"`
- Hardhat phải chạy trước Docker.

### Job không chạy
- Kiểm tra UI → Jobs → Runs (có runs không?)
- Xem log: `docker logs chainlink_node1 --tail 50`

### ethtx fail "insufficient funds"
- Fund cả 2 nodes:
  ```
  NODE_ADDRESS=0xNODE1 npx hardhat run scripts/fund_node.cjs --network localhost
  NODE_ADDRESS=0xNODE2 npx hardhat run scripts/fund_node.cjs --network localhost
  ```

---

## TÓM TẮT LỆNH

```powershell
# 1. Start blockchain
npx hardhat node

# 2. Start 2 Chainlink nodes
docker compose -f docker-compose-dual-nodes.yml up -d

# 3. Deploy contracts + aggregators
npx hardhat run scripts/deploy_ganache_simple.cjs --network localhost

# 4. Authorize cả 2 nodes
$env:NODE1_ADDRESS="0x..."
$env:NODE2_ADDRESS="0x..."
node scripts/authorize_both_nodes.cjs

# 5. Fund cả 2 nodes
$env:NODE_ADDRESS="0xNODE1"; npx hardhat run scripts/fund_node.cjs --network localhost
$env:NODE_ADDRESS="0xNODE2"; npx hardhat run scripts/fund_node.cjs --network localhost

# 6. Tạo jobs
node scripts/create_jobs_node1.cjs
node scripts/create_jobs_node2.cjs

# 7. Đợi 1-2 phút, kiểm tra
npx hardhat run scripts/read_aggregator.cjs --network localhost

# 8. Start frontend
cd lendhub-frontend-nextjs
npm run dev
# Mở: http://localhost:3000/markets
```

---

## KẾT QUẢ MONG ĐỢI

- ✅ 2 Chainlink nodes chạy độc lập
- ✅ Mỗi node dùng nguồn API khác nhau (Binance vs CryptoCompare)
- ✅ Cả 2 nodes cùng push giá vào aggregators
- ✅ Frontend Markets page hiển thị giá real-time từ Chainlink
- ✅ Mô phỏng mạng oracle phi tập trung (DON)

🎉 Chúc mừng! Bạn đã build hệ thống Chainlink Oracle phi tập trung!






