# 🚀 Chainlink Oracle 2-Node Setup - Quick Start

## Tổng Quan

Hệ thống này mô phỏng mạng Chainlink phi tập trung với 2 Oracle nodes, mỗi node lấy giá từ nguồn API khác nhau và cùng cập nhật vào Price Aggregators.

---

## 📋 Checklist Nhanh

```powershell
# Terminal 1: Hardhat Node
npx hardhat node

# Terminal 2: Deploy + Setup
docker compose -f docker-compose-dual-nodes.yml up -d
npx hardhat run scripts/deploy_ganache_simple.cjs --network localhost

# Lấy địa chỉ sending nodes (từ UI hoặc log)
$env:NODE1_ADDRESS="0x..."  # từ http://localhost:6688 → Keys
$env:NODE2_ADDRESS="0x..."  # từ http://localhost:6689 → Keys

# Authorize + Fund
node scripts/authorize_both_nodes.cjs
$env:NODE_ADDRESS=$env:NODE1_ADDRESS; $env:AMOUNT_ETH="10"; npx hardhat run scripts/fund_node.cjs --network localhost
$env:NODE_ADDRESS=$env:NODE2_ADDRESS; $env:AMOUNT_ETH="10"; npx hardhat run scripts/fund_node.cjs --network localhost

# Tạo jobs
node scripts/create_jobs_node1.cjs
node scripts/create_jobs_node2.cjs

# Kiểm tra (đợi 1-2 phút)
npx hardhat run scripts/read_aggregator.cjs --network localhost

# Start frontend
cd lendhub-frontend-nextjs
npm run dev
# http://localhost:3000/markets
```

---

## 📊 Kết Quả

### Chainlink Nodes:
- **Node 1**: http://localhost:6688 (Binance API)
- **Node 2**: http://localhost:6689 (CryptoCompare API)

### Price Aggregators:
- ETH/USD, WETH/USD, USDC/USD, DAI/USD, LINK/USD
- Mỗi aggregator nhận giá từ CẢ 2 nodes
- Tuân chuẩn `AggregatorV3Interface`

### Frontend Markets:
- http://localhost:3000/markets
- Hiển thị giá real-time từ Chainlink
- APR/APY động
- Chỉ báo "live" (chấm xanh nháy) khi Oracle đang hoạt động

---

## 🔧 Troubleshooting

### "insufficient funds"
```
docker logs chainlink_node1 | Select-String "OUT OF FUNDS"
# Fund địa chỉ trong log
```

### Job không chạy
```
# Xem UI → Jobs → Runs
# Xem log node
docker logs chainlink_node1 --tail 50
```

### Frontend không hiển thị giá
- Kiểm tra `deployments/aggregators.json` đã copy sang `lendhub-frontend-nextjs/deployments/`
- Kiểm tra jobs đã chạy (UI → Transactions)
- Xem console browser (F12)

---

## 📖 Chi Tiết

Xem file `CHAINLINK_2_NODES_SETUP.md` để hiểu sâu về:
- Tại sao cần 2 nodes
- Cách thức hoạt động của từng thành phần
- Cấu hình nâng cao
- Troubleshooting chi tiết








