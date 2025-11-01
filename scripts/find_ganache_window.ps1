# Script tìm và hiển thị thông tin về Ganache process

Write-Host "`n╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           🔍 TÌM CỬA SỔ GANACHE VÀ LẤY PRIVATE KEY                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Find PowerShell processes
Write-Host "📋 Tìm kiếm PowerShell processes..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object {$_.ProcessName -eq "powershell"}

if ($processes.Count -eq 0) {
    Write-Host "❌ Không tìm thấy PowerShell process nào đang chạy." -ForegroundColor Red
    Write-Host "`n💡 Có thể Ganache đã bị tắt. Hãy khởi động lại:`n" -ForegroundColor Yellow
    Write-Host "npx ganache --port 7545 --chain.chainId 1337 --wallet.mnemonic 'test test test test test test test test test test test junk' --wallet.totalAccounts 10`n" -ForegroundColor Green
    exit
}

Write-Host "`n✅ Tìm thấy $($processes.Count) PowerShell process(es):" -ForegroundColor Green
$processes | Format-Table -Property Id, StartTime, @{Name="Duration";Expression={(Get-Date) - $_.StartTime}} -AutoSize

Write-Host "`n📝 HƯỚNG DẪN TÌM CỬA SỔ GANACHE:" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "1. Nhấn Alt + Tab để xem tất cả windows đang mở" -ForegroundColor White
Write-Host "2. Tìm cửa sổ PowerShell có chữ 'ganache' hoặc 'Available Accounts'" -ForegroundColor White
Write-Host "3. Scroll lên PHÍA TRÊN của cửa sổ đó" -ForegroundColor White
Write-Host "4. Tìm section 'Private Keys'" -ForegroundColor White
Write-Host "`nOutput sẽ giống như:" -ForegroundColor Yellow
Write-Host @"

ganache v7.9.1
Starting RPC server

Available Accounts
==================
(0) 0xC42B5Ed782ebE05C3621b601be03b89E86ed5558 (100 ETH)
(1) 0xabaf3554008411a0b3cceb7453eaac401631c5dc (100 ETH)
...

Private Keys
==================
(0) 0xABCDEF123456789... <-- COPY CÁI NÀY!
(1) 0x...

"@ -ForegroundColor Green

Write-Host "`n🎯 SAU KHI TÌM THẤY PRIVATE KEY:" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "1. Copy private key của Account (0)" -ForegroundColor White
Write-Host "2. Mở MetaMask" -ForegroundColor White
Write-Host "3. Click vào icon account (góc trên bên phải)" -ForegroundColor White
Write-Host "4. Chọn 'Import Account'" -ForegroundColor White
Write-Host "5. Chọn 'Private Key'" -ForegroundColor White
Write-Host "6. Paste private key" -ForegroundColor White
Write-Host "7. Click 'Import'" -ForegroundColor White
Write-Host "8. Đảm bảo đang ở network 'Ganache Local' (port 7545)" -ForegroundColor White
Write-Host "`n✨ SAU KHI IMPORT XONG, BẠN SẼ THẤY ~99.99 ETH VÀ TẤT CẢ TOKENS! ✨`n" -ForegroundColor Green

Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Gray

# Try to list window titles (requires additional permission)
Write-Host "💡 TIP: Nếu không tìm thấy, thử search taskbar cho 'PowerShell'`n" -ForegroundColor Yellow



