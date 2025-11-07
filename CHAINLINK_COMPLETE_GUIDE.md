# 🔗 Hướng Dẫn Setup Chainlink Oracle Hoàn Chỉnh

## 📋 Tổng Quan

Hướng dẫn này sẽ setup toàn bộ Chainlink Oracle cho LendHub v2:
1. ✅ Deploy contracts (LinkToken, PriceAggregator)
2. ✅ Setup Docker Chainlink (PostgreSQL + Chainlink Node)
3. ✅ Fund Chainlink node (ETH + LINK)
4. ✅ Authorize node trên PriceAggregator
5. ✅ Tạo Chainlink job để update giá
6. ✅ Test đọc giá từ PriceAggregator

## 🚀 Quick Start

### Bước 1: Deploy Contracts

```powershell
# Đảm bảo Ganache đang chạy
# Deploy LinkToken và PriceAggregator
node scripts/deploy_ganache_simple.cjs
```

Hoặc nếu đã deploy rồi, kiểm tra `deployments/local-chainlink.json`.

### Bước 2: Start Docker Chainlink

```powershell
# Start Docker services
docker-compose up -d

# Kiểm tra status
docker-compose ps

# Xem logs
docker-compose logs -f chainlink
```

**Chainlink UI**: http://localhost:6688
- Email: `phamlendhub@email.com`
- Password: `SuperSecretUIpass!@#`

### Bước 3: Chạy Full Setup Script

```powershell
# Script tự động thực hiện tất cả các bước
node scripts/run_full_chainlink_setup.cjs
```

Script này sẽ:
1. ✅ Kiểm tra Docker Chainlink
2. ✅ Lấy địa chỉ Chainlink node
3. ✅ Fund ETH và LINK cho node
4. ✅ Authorize node trên PriceAggregator
5. ✅ Tạo Chainlink job
6. ✅ Test đọc giá

### Hoặc Chạy Từng Bước

#### Step 1: Lấy Node Address
```powershell
node scripts/get_chainlink_node_address.cjs
```

Output sẽ hiển thị địa chỉ node và hướng dẫn set environment variable.

#### Step 2: Fund và Authorize Node
```powershell
# Set node address
$env:NODE_ADDRESS="<NODE_ADDRESS>"

# Fund ETH và LINK, authorize node
node scripts/fund_and_setup_node.cjs
```

#### Step 3: Tạo Chainlink Job
```powershell
node scripts/create_chainlink_job.cjs
```

#### Step 4: Test Đọc Giá
```powershell
node scripts/read_aggregator.cjs
```

## 📝 Chi Tiết Các Script

### `scripts/get_chainlink_node_address.cjs`
- **Mục đích**: Lấy địa chỉ Chainlink node từ Chainlink API
- **Input**: Chainlink API credentials từ `chainlink-data/.api`
- **Output**: Địa chỉ node wallet

### `scripts/fund_and_setup_node.cjs`
- **Mục đích**: Fund ETH/LINK và authorize node
- **Input**: 
  - `NODE_ADDRESS`: Địa chỉ Chainlink node (required)
  - `ETH_AMOUNT`: Số ETH (default: 1.0)
  - `LINK_AMOUNT`: Số LINK (default: 100.0)
- **Thực hiện**:
  1. Fund ETH từ deployer đến node
  2. Fund LINK từ deployer đến node
  3. Authorize node trên PriceAggregator (gọi `setWriter()`)

### `scripts/create_chainlink_job.cjs`
- **Mục đích**: Tạo Chainlink job để update giá
- **Input**: 
  - `JOB_FILE`: File TOML job (default: `chainlink-data/job-push-price.toml`)
  - Chainlink API credentials từ `chainlink-data/.api`
- **Thực hiện**: 
  1. Đọc job TOML
  2. Replace PriceAggregator address
  3. Tạo job qua Chainlink API

### `scripts/read_aggregator.cjs`
- **Mục đích**: Đọc giá mới nhất từ PriceAggregator
- **Output**: Round ID, Answer (giá), timestamps

### `scripts/run_full_chainlink_setup.cjs`
- **Mục đích**: Chạy tất cả các bước tự động
- **Thực hiện**: Gọi các script trên theo thứ tự

## 🔧 Configuration Files

### `docker-compose.yml`
- PostgreSQL: port 5432, database `chainlink_db`
- Chainlink Node: port 6688
- Network: `chainlink-local`

### `chainlink-data/config.toml`
- ChainID: 1337 (Ganache)
- Node URL: `http://host.docker.internal:7545`

### `chainlink-data/secrets.toml`
- Database URL: PostgreSQL connection string

### `chainlink-data/job-push-price.toml`
- Cron: `*/1 * * * *` (mỗi phút)
- Fetch: Binance API (`ETHUSDT`)
- Multiply: `100000000` (8 decimals)
- Submit: `updateAnswer()` trên PriceAggregator

### `chainlink-data/.password` & `chainlink-data/.api`
- Chainlink API credentials

## 📊 Kiểm Tra Status

### Check Docker Services
```powershell
docker-compose ps
```

### Check Chainlink UI
- Open: http://localhost:6688
- Check Jobs: Vào **Jobs** tab
- Check Keys: Vào **Keys** → **Chain Keys**

### Check Node Balance
```powershell
# Check ETH balance (thay <NODE_ADDRESS>)
node -e "const {ethers} = require('hardhat'); ethers.provider.getBalance('<NODE_ADDRESS>').then(b => console.log('ETH:', ethers.formatEther(b)))"

# Check LINK balance
# (Cần deploy LinkToken và load ABI)
```

### Check PriceAggregator
```powershell
# Đọc giá
node scripts/read_aggregator.cjs

# Check writer status (nếu có script)
```

## 🔍 Troubleshooting

### Docker Chainlink không start
1. Check Docker Desktop đang chạy
2. Check ports không bị conflict (5432, 6688)
3. Check logs: `docker-compose logs chainlink`

### Không lấy được node address
1. Đợi vài giây sau khi start Chainlink (cần thời gian init)
2. Check Chainlink UI: http://localhost:6688 → Keys
3. Check logs: `docker-compose logs chainlink | Select-String "account"`

### Fund failed
1. Check deployer có đủ ETH/LINK
2. Check Ganache đang chạy
3. Check network config trong `hardhat.config.cjs`

### Job không chạy
1. Check job đã được tạo trong Chainlink UI
2. Check job status (pending, running, error)
3. Check logs: Chainlink UI → Jobs → View logs
4. Check node có đủ ETH để gửi tx
5. Check node có được authorize trên PriceAggregator

### Không đọc được giá
1. Đợi job chạy lần đầu (theo cron schedule)
2. Check job đã run thành công
3. Check tx trong Ganache (có tx gọi `updateAnswer()`)
4. Check PriceAggregator address đúng

## ✅ Checklist

- [ ] Ganache đang chạy (port 7545, chainId 1337)
- [ ] Contracts đã deploy (LinkToken, PriceAggregator)
- [ ] Docker Chainlink đang chạy (http://localhost:6688)
- [ ] Đã lấy địa chỉ Chainlink node
- [ ] Node đã được fund ETH (>= 0.5 ETH)
- [ ] Node đã được fund LINK (>= 10 LINK)
- [ ] Node đã được authorize trên PriceAggregator
- [ ] Chainlink job đã được tạo
- [ ] Job đã run và update giá thành công
- [ ] Có thể đọc giá từ PriceAggregator

## 🎯 Next Steps Sau Khi Setup Xong

1. **Monitor Job**: Check Chainlink UI mỗi phút có job run
2. **Verify Prices**: Đọc giá từ PriceAggregator và so sánh với Binance
3. **Integrate với LendingPool**: Deploy LendingPool và config ChainlinkPriceOracle
4. **Add More Assets**: Tạo jobs cho các asset khác (DAI, USDC, etc.)

## 📚 Tài Liệu Tham Khảo

- `HUONG_DAN_DOCKER_CHAINLINK.md`: Hướng dẫn setup Docker
- `HUONG_DAN_SETUP_NODE.md`: Hướng dẫn fund và authorize node
- `CHAINLINK_DOCKER_GUIDE.md`: Chi tiết về Chainlink Docker setup
- `chainlink-data/job-push-price.toml`: Chainlink job configuration





