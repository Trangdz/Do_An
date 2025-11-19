# Test Scripts

## test-deposit-interest.js

Test script để kiểm tra tính toán lãi suất deposit.

### Chạy test:

```bash
npm run test:deposit-interest
```

Hoặc:

```bash
node scripts/test-deposit-interest.js
```

### Các test case:

1. **Test 1**: Deposit 1000 DAI với APR 5% - kiểm tra lãi sau 1 ngày
2. **Test 2**: Deposit 1000 DAI với APR 10% - kiểm tra lãi sau 1 ngày
3. **Test 3**: Deposit 999 DAI (sau fee) với APR 5% - kiểm tra lãi sau 1 ngày
4. **Real-time Update Simulation**: Mô phỏng cập nhật real-time trong 10 giây
5. **Principal Display Test**: Kiểm tra hiển thị principal (999 vs 1000)

### Kết quả mong đợi:

- ✅ Principal hiển thị đúng (số tiền thực tế trong pool, có thể ít hơn số deposit do fee)
- ✅ Interest earned tăng dần theo thời gian
- ✅ Balance = Principal + Interest
- ✅ Tính toán chính xác với công thức Aave

### Lưu ý:

- Nếu deposit 1000 DAI nhưng chỉ thấy 999, đó là do fee khi deposit (đây là hành vi đúng)
- `originalPrincipalWadRef` lưu số tiền thực tế trong pool (sau fee), không phải số tiền deposit ban đầu
- Interest được tính dựa trên số tiền thực tế trong pool

