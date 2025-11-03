# 🚀 Quick Start Chainlink Oracle

## ✅ Prerequisites

- ✅ Ganache đang chạy (port 7545, chainId 1337)
- ✅ Contracts đã deploy (LinkToken, PriceAggregator)
- ✅ Docker Desktop đang chạy

## 🚀 Các Bước Chạy

### 1. Start Docker Chainlink

```powershell
docker-compose up -d
```

Kiểm tra status:
```powershell
docker-compose ps
```

Chainlink UI: http://localhost:6688
- Email: `phamlendhub@email.com`
- Password: `SuperSecretUIpass!@#`

### 2. Chạy Full Setup (Tự Động)

```powershell
node scripts/run_full_chainlink_setup.cjs
```

Script này sẽ tự động:
1. ✅ Kiểm tra Docker Chainlink
2. ✅ Lấy địa chỉ Chainlink node
3. ✅ Fund ETH và LINK cho node
4. ✅ Authorize node trên PriceAggregator
5. ✅ Tạo Chainlink job
6. ✅ Test đọc giá

### Hoặc Chạy Từng Bước (Manual)

#### Step 1: Lấy Node Address
```powershell
node scripts/get_chainlink_node_address.cjs
```

Output sẽ hiển thị:
```
📍 Primary Node Address: 0x...
💡 Use this address for funding:
   $env:NODE_ADDRESS="0x..."
```

#### Step 2: Fund và Authorize Node
```powershell
$env:NODE_ADDRESS="<NODE_ADDRESS>"
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

## 📊 Kiểm Tra

### Check Docker Services
```powershell
docker-compose ps
```

### Check Chainlink UI
- Open: http://localhost:6688
- Login với credentials từ `chainlink-data/.api`
- Vào **Jobs** → Xem job đã tạo
- Vào **Keys** → **Chain Keys** → Xem node address

### Check Job Running
- Chainlink UI → Jobs → Xem job status
- Mỗi phút job sẽ fetch giá từ Binance và update lên blockchain

### Check Price
```powershell
node scripts/read_aggregator.cjs
```

## 🔧 Troubleshooting

### Docker không start
```powershell
# Check logs
docker-compose logs chainlink
docker-compose logs postgres

# Restart
docker-compose restart
```

### Không lấy được node address
- Đợi vài giây sau khi start Chainlink
- Hoặc lấy từ Chainlink UI: Keys → Chain Keys

### Fund failed
- Check Ganache đang chạy
- Check deployer có đủ ETH/LINK
- Check network config trong `hardhat.config.cjs`

### Job không chạy
- Check job đã được tạo trong Chainlink UI
- Check node có đủ ETH để gửi tx
- Check node có được authorize (script đã tự động làm)

## 📝 Files Quan Trọng

- `deployments/local-chainlink.json` - Contract addresses
- `chainlink-data/.password` - Chainlink password
- `chainlink-data/.api` - Chainlink API credentials
- `chainlink-data/job-push-price.toml` - Chainlink job config
- `docker-compose.yml` - Docker services config

## ✅ Checklist

- [ ] Docker Chainlink running (http://localhost:6688)
- [ ] Node address đã lấy được
- [ ] Node đã được fund ETH + LINK
- [ ] Node đã được authorize trên PriceAggregator
- [ ] Chainlink job đã được tạo
- [ ] Job đã run và update giá thành công
- [ ] Có thể đọc giá từ PriceAggregator

## 🎯 Next Steps

1. Monitor job trong Chainlink UI
2. Verify giá được update mỗi phút
3. Integrate với LendingPool contract
