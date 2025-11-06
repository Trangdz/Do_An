# PowerShell script to run full Chainlink setup
Write-Host "🚀 Running Full Chainlink Setup..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Docker Chainlink
Write-Host "📋 Step 1: Checking Docker Chainlink..." -ForegroundColor Yellow
try {
    $dockerPs = docker-compose ps 2>&1 | Out-String
    if ($dockerPs -match "chainlink-node.*Up") {
        Write-Host "   ✅ Chainlink node is running" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Chainlink node might not be running" -ForegroundColor Yellow
        Write-Host "   Starting Docker services..." -ForegroundColor Yellow
        docker-compose up -d 2>&1 | Out-Null
        Start-Sleep -Seconds 5
        Write-Host "   ✅ Docker services started" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Error checking Docker: $_" -ForegroundColor Red
    Write-Host "   Please start Docker manually: docker-compose up -d" -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Get Node Address
Write-Host "📋 Step 2: Getting Chainlink Node Address..." -ForegroundColor Yellow
try {
    $nodeOutput = node scripts/get_chainlink_node_address.cjs 2>&1 | Out-String
    Write-Host $nodeOutput
    
    if ($nodeOutput -match "Primary Node Address:\s*(0x[a-fA-F0-9]{40})") {
        $nodeAddress = $matches[1]
        $env:NODE_ADDRESS = $nodeAddress
        Write-Host "   ✅ Node Address: $nodeAddress" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Could not extract node address automatically" -ForegroundColor Yellow
        Write-Host "   Please get address manually and set NODE_ADDRESS env var" -ForegroundColor Yellow
        $nodeAddress = $null
    }
} catch {
    Write-Host "   ❌ Error getting node address: $_" -ForegroundColor Red
    $nodeAddress = $null
}
Write-Host ""

# Step 3: Fund and Authorize Node
if ($nodeAddress) {
    Write-Host "📋 Step 3: Funding and Authorizing Node..." -ForegroundColor Yellow
    try {
        node scripts/fund_and_setup_node.cjs
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Node funded and authorized" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Failed to fund/authorize node" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Error: $_" -ForegroundColor Red
    }
} else {
    Write-Host "📋 Step 3: Skipped (no node address)" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Create Chainlink Job
Write-Host "📋 Step 4: Creating Chainlink Job..." -ForegroundColor Yellow
try {
    node scripts/create_chainlink_job.cjs
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Job created" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Failed to create job" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Error: $_" -ForegroundColor Red
}
Write-Host ""

# Step 5: Test Reading Price
Write-Host "📋 Step 5: Testing Price Reading..." -ForegroundColor Yellow
try {
    node scripts/read_aggregator.cjs
} catch {
    Write-Host "   ⚠️  Could not read price yet (job might need time to run)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Monitor job in Chainlink UI: http://localhost:6688" -ForegroundColor White
Write-Host "   2. Wait for first job run (cron: */1 * * * *)" -ForegroundColor White
Write-Host "   3. Test reading price: node scripts/read_aggregator.cjs" -ForegroundColor White
Write-Host ""




