# Danh sách các file không cần thiết trong dự án

## 1. Thư mục Source Code Chainlink (Không cần thiết - đã có Docker image)
```
chainlink/
```
**Lý do:** Toàn bộ source code của Chainlink (3755+ files), không cần thiết vì đã sử dụng Docker image `smartcontract/chainlink:2.2.0`

---

## 2. File Documentation dư thừa (80+ file .md)
### Documentation Chainlink (không cần):
- `CHAINLINK_2_NODES_SETUP.md`
- `CHAINLINK_COMPLETE_GUIDE.md`
- `CHAINLINK_DOCKER_GUIDE.md`
- `CHAINLINK_QUICK_START.md`
- `CHAINLINK_SYSTEM_SUMMARY.md`

### Documentation khác (có thể xóa):
- `AAVE_FORMULA_IMPLEMENTED.md`
- `AAVE_INTEREST_RATE_PARAMS.md`
- `AAVE_USDC_ACTUAL_PARAMS.md`
- `ALLOWANCE_LOGIC_EXPLANATION.md`
- `APR_CALCULATION_EXPLAINED.md`
- `APR_DISPLAY_GUIDE.md`
- `APR_EXPLANATION.md`
- `APR_STUDY_COMPLETE.md`
- `BAO_CAO_2.4_CO_CHE_TINH_LAI_SUAT.md`
- `BAO_CAO_3.1_CONG_NGHE_CONG_CU.md`
- `BAO_CAO_3.3.3_3.3.4_CHAINLINK_VA_TRIEN_KHAI.md`
- `BAO_CAO_GAS.md`
- `BUSINESS_FLOW_DIAGRAM.md`
- `CHECK_INTEREST_BROWSER.md`
- `CHECK_VISIBLE.md`
- `COLLATERAL_*.md` (nhiều file)
- `COMPOUND_*.md` (nhiều file)
- `DEBUG_*.md` (nhiều file)
- `FIX_*.md` (nhiều file)
- `REALTIME_*.md` (nhiều file)
- `SUMMARY_*.md` (nhiều file)
- `VALIDATE_*.md` (nhiều file)
- `WHY_*.md` (nhiều file)
- `WITHDRAW_*.md` (nhiều file)
- `GANACHE_SETUP.md`
- `GITHUB_SETUP.md`
- `HARDCODE_VS_SET_ANALYSIS.md`
- `SEGMENTED_INTEREST.md`
- `TESTNET_DEPLOYMENT_GUIDE.md`
- `lendhub-frontend-nextjs/APR_INTEGRATION_GUIDE.md`
- `lendhub-frontend-nextjs/REPAY_REFACTOR.md`
- `lendhub-frontend-nextjs/test-transaction-history.md`
- `lendhub-frontend-nextjs/TRANSACTION_HISTORY_GUIDE.md`

**Lý do:** Quá nhiều file documentation trùng lặp, chỉ cần giữ lại README.md chính

---

## 3. File Script Test/Debug không cần thiết (200+ files)
### Scripts trong thư mục `scripts/`:
- `analyze_*.cjs` (nhiều file)
- `check_*.cjs` (nhiều file)
- `debug_*.cjs` (nhiều file)
- `decode_*.cjs` (nhiều file)
- `test_*.cjs` (nhiều file)
- `demo_*.cjs` (nhiều file)
- `fix_*.cjs` (nhiều file)
- `simple_*.cjs` (nhiều file)
- `a.cjs`
- `create_job_debug.cjs`
- `create_utilization.cjs`
- `compare_contracts.cjs`
- `export_deployer_key.cjs`
- `generate_private_key_from_mnemonic.cjs`
- `get_*.cjs` (nhiều file)
- `print_*.cjs`
- `redeploy-no-auto-collateral.js`
- `reset_*.cjs`
- `show_*.cjs`
- `simulate_real_prices.cjs`
- `trigger_webhook.cjs`
- `websocket_proxy.js`

### Scripts ở root:
- `add_eth_to_weth.js`
- `check_balance.cjs`
- `check_balance.js`
- `check_selector.js`
- `check_user_collateral_and_borrow.cjs`
- `check-balance-simple.cjs`
- `check-snapshots.cjs`
- `create-weth-contract.cjs`
- `deploy-weth-simple.cjs`
- `find-weth.cjs`
- `test-interest-persistence.cjs`
- `test-write-new-data.js`
- `ws_test.js`
- `RUN_CHAINLINK_FULL.cjs`

**Lý do:** Các script test/debug chỉ dùng trong quá trình phát triển, không cần cho production

---

## 4. File Batch/PowerShell Scripts (10 files)
- `CHECK_GANACHE_STATUS.bat`
- `FIX_COMPLETE.bat`
- `WAIT_AND_TEST_CHAINLINK.bat`
- `UPGRADE_TO_CHAINLINK_2.2.bat`
- `setup-mongodb.bat`
- `run-chainlink-setup.bat`
- `fix-password.ps1`
- `run-chainlink-setup.ps1`
- `scripts/find_ganache_window.ps1`
- `lendhub-frontend-nextjs/restart-server.bat`

**Lý do:** Scripts helper tạm thời, có thể tạo lại khi cần

---

## 5. File Chainlink Job TOML dư thừa (15+ files)
Trong `chainlink-data/`:
- `job-dai-simple.toml`
- `job-dai.toml`
- `job-direct-call.toml`
- `job-price-consumer-copy.toml`
- `job-price-consumer-final.toml`
- `job-price-consumer-verified.toml`
- `job-price-consumer.toml`
- `job-push-price.toml`
- `job-simple.toml`
- `job-test.toml`
- `job-webhook.toml`
- `job-working.toml`
- `test-job.toml`
- `OBSERVATION_SOURCE_VERIFIED.txt`

**Lý do:** Chỉ cần giữ lại các job file đang sử dụng (job-eth.toml, job-weth.toml, job-usdc.toml, job-link.toml)

---

## 6. File Log (2 files)
- `chainlink-data/chainlink_debug.log`
- `ganache_cli_data/000003.log`

**Lý do:** File log có thể tạo lại, không cần commit vào repo

---

## 7. File Config/Duplicate không cần
- `config.toml` (ở root - duplicate với chainlink-data/config.toml)
- `secrets.toml` (ở root - duplicate với chainlink-data/secrets.toml)
- `chainlink-node1.env`
- `chainlink-node2.env`
- `chainlink.env` (nếu không dùng)
- `docker-compose-dual-nodes.yml` (nếu chỉ dùng single node)
- `deployment-info.json` (có thể tạo lại)

**Lý do:** File config duplicate hoặc không dùng đến

---

## 8. Thư mục Multi-Node Setup (nếu không dùng)
- `node1/`
- `node2/`

**Lý do:** Nếu chỉ dùng single Chainlink node, không cần thư mục này

---

## 9. File Contract Test/Backup
- `contracts/Counter.sol` (file test)
- `contracts/Counter.t.sol.bak` (file backup)
- `contracts/PriceConsumer.sol` (nếu không dùng)

**Lý do:** File test/backup không cần cho production

---

## 10. File Frontend Test/Temp
- `lendhub-frontend-nextjs/test-all-features.js`
- `lendhub-frontend-nextjs/test-direct-api.js`
- `lendhub-frontend-nextjs/test-features.js`
- `lendhub-frontend-nextjs/USAGE_EXAMPLE.tsx`
- `lendhub-frontend-nextjs/APR_QUICK_EXAMPLE.tsx`
- `lendhub-frontend-nextjs/LendingPool.abi.temp.json`

**Lý do:** File test/temp không cần cho production

---

## 11. File Ganache Data (có thể xóa)
- `ganache_cli_data/` (toàn bộ thư mục)

**Lý do:** Data tạm thời của Ganache, có thể tạo lại

---

## 12. File Indexer (nếu không dùng)
- `indexer/` (toàn bộ thư mục nếu không sử dụng MongoDB indexer)

**Lý do:** Nếu không dùng MongoDB indexer, có thể xóa

---

## Tổng kết

### Ưu tiên xóa cao:
1. ✅ `chainlink/` - Thư mục lớn nhất (3755+ files)
2. ✅ `scripts/` - Nhiều file test/debug (200+ files)
3. ✅ Các file `.md` documentation dư thừa (80+ files)
4. ✅ `chainlink-data/*.toml` - Job files dư thừa (15+ files)

### Ưu tiên xóa trung bình:
5. ✅ File `.bat`, `.ps1`, `.sh` helper scripts (10 files)
6. ✅ File log (2 files)
7. ✅ File config duplicate (5+ files)
8. ✅ File test/temp ở root và frontend (10+ files)

### Ưu tiên xóa thấp (kiểm tra trước khi xóa):
9. ⚠️ `node1/`, `node2/` - Nếu không dùng multi-node
10. ⚠️ `indexer/` - Nếu không dùng MongoDB indexer
11. ⚠️ `ganache_cli_data/` - Nếu không cần giữ data

---

## Lệnh xóa nhanh (PowerShell)

```powershell
# Xóa thư mục chainlink (lớn nhất)
Remove-Item -Recurse -Force chainlink\

# Xóa các file .md documentation (giữ lại README.md)
Get-ChildItem -Filter "*.md" -Recurse | Where-Object { $_.Name -ne "README.md" } | Remove-Item

# Xóa file log
Remove-Item chainlink-data\chainlink_debug.log
Remove-Item ganache_cli_data\*.log

# Xóa file .bat, .ps1 helper
Remove-Item *.bat, *.ps1

# Xóa file config duplicate ở root
Remove-Item config.toml, secrets.toml -ErrorAction SilentlyContinue
```

**Lưu ý:** Nên backup trước khi xóa, hoặc commit vào git để có thể khôi phục nếu cần.










