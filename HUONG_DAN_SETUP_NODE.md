# 🔗 Hướng Dẫn Setup Chainlink Node

## ✅ Đã Có Sẵn

1. ✅ **Deployments**: `deployments/local-chainlink.json`
   - LinkToken: `0xe3991215dB9c50878A03FB677c6c0d9A677B3019`
   - PriceAggregator: `0x2C0025315508a70B77aBeaB59206500b679f0902`

2. ✅ **Script**: `scripts/fund_and_setup_node.cjs` - Tự động fund và authorize node

3. ✅ **Chainlink Job**: `chainlink-data/job-push-price.toml` - Job để update giá ETH/USD

## 🚀 Các Bước Thực Hiện

### Bước 1: Đảm Bảo Ganache và Docker Chainlink Đang Chạy

```powershell
# Kiểm tra Ganache
curl http://localhost:7545

# Kiểm tra Docker Chainlink
docker-compose ps
```

### Bước 2: Lấy Địa Chỉ Chainlink Node

Chainlink node sẽ có một wallet address khi start. Có 2 cách:

#### Cách 1: Từ Chainlink UI
1. Mở http://localhost:6688
2. Login với credentials từ `chainlink-data/.api`
3. Vào **Keys** → **Chain Keys** → Copy address

#### Cách 2: Từ Docker Logs
```powershell
docker-compose logs chainlink | Select-String "account" -Context 2
```

#### Cách 3: Từ Chainlink API (sau khi start)
```powershell
# Get API key từ chainlink-data/.api
$apiKey = Get-Content chainlink-data/.api | Select-Object -First 1
$password = Get-Content chainlink-data/.password

# Get chain keys
curl -X GET "http://localhost:6688/v2/keys/evm" `
  -H "X-Chainlink-EA-AccessKey: $apiKey" `
  -H "X-Chainlink-EA-Secret: $password"
```

### Bước 3: Fund ETH và LINK cho Node

Chạy script tự động:

```powershell
# Set địa chỉ node (thay <NODE_ADDRESS> bằng địa chỉ thực tế)
$env:NODE_ADDRESS="<NODE_ADDRESS>"
$env:ETH_AMOUNT="1.0"
$env:LINK_AMOUNT="100.0"

# Chạy script
node scripts/fund_and_setup_node.cjs
```

Script sẽ tự động:
1. ✅ Fund ETH cho node
2. ✅ Fund LINK cho node  
3. ✅ Authorize node trên PriceAggregator contract

### Bước 4: Tạo Chainlink Job

#### Cách 1: Qua Chainlink UI

1. Mở http://localhost:6688
2. Vào **Jobs** → **New Job**
3. Copy nội dung từ `chainlink-data/job-push-price.toml`
4. Paste vào job editor
5. Click **Create Job**

#### Cách 2: Qua Chainlink API

Tạo script `scripts/create_chainlink_job.cjs` (sẽ tạo sau nếu cần).

### Bước 5: Test Job

Sau khi job được tạo và chạy:

1. Kiểm tra job chạy thành công trong Chainlink UI
2. Đọc giá từ PriceAggregator:

```powershell
node scripts/read_aggregator.cjs
```

## 📝 Chi Tiết Script

### `scripts/fund_and_setup_node.cjs`

Script này thực hiện:
1. **Fund ETH**: Gửi ETH từ deployer đến Chainlink node
2. **Fund LINK**: Gửi LINK token đến Chainlink node
3. **Authorize Node**: Gọi `setWriter(nodeAddr, true)` trên PriceAggregator

**Environment Variables:**
- `NODE_ADDRESS`: Địa chỉ Chainlink node (required)
- `ETH_AMOUNT`: Số lượng ETH (default: 1.0)
- `LINK_AMOUNT`: Số lượng LINK (default: 100.0)

## 🔧 Troubleshooting

### Lỗi: NODE_ADDRESS not set
→ Lấy địa chỉ node từ Chainlink UI hoặc docker logs

### Lỗi: Insufficient funds
→ Kiểm tra deployer có đủ ETH/LINK:
```powershell
node -e "require('hardhat').ethers.provider.getBalance('0x0B21Dd338B67b0048378d2459BEfd44AE07C76F9').then(b => console.log('Balance:', require('hardhat').ethers.formatEther(b), 'ETH'))"
```

### Lỗi: Node not authorized
→ Check lại tx authorization trong script output

### Lỗi: Ganache not running
→ Start Ganache trước khi chạy script

## ✅ Checklist

- [ ] Ganache đang chạy (port 7545)
- [ ] Docker Chainlink đang chạy (http://localhost:6688)
- [ ] Đã lấy địa chỉ Chainlink node
- [ ] Đã fund ETH cho node
- [ ] Đã fund LINK cho node
- [ ] Node đã được authorize trên PriceAggregator
- [ ] Đã tạo Chainlink job
- [ ] Job đã chạy và update giá thành công
- [ ] Đã test đọc giá từ PriceAggregator

## 🎯 Next Steps

Sau khi setup xong:
1. Test đọc giá: `node scripts/read_aggregator.cjs`
2. Monitor job trong Chainlink UI
3. Verify giá được update mỗi phút (theo cron schedule)



