$passwordFile = "chainlink-data\.password"
$apiFile = "chainlink-data\.api"

# Fix password file
if (Test-Path $passwordFile) {
    $content = Get-Content $passwordFile -Raw
    $content = $content.Trim()
    [System.IO.File]::WriteAllText((Resolve-Path $passwordFile).Path, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Fixed password file"
}

# Fix API file
if (Test-Path $apiFile) {
    $content = Get-Content $apiFile -Raw
    $lines = $content -split "`r?`n" | Where-Object { $_.Trim() -ne "" }
    [System.IO.File]::WriteAllText((Resolve-Path $apiFile).Path, ($lines -join "`n"), [System.Text.Encoding]::UTF8)
    Write-Host "Fixed API file"
}

Write-Host "Done!"



























