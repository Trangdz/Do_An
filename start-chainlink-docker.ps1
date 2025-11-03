# PowerShell script to start Chainlink Docker services
Write-Host "🔗 Starting Chainlink Docker Environment..." -ForegroundColor Cyan

# Check if Docker is running
Write-Host "📋 Checking Docker..." -ForegroundColor Yellow
$dockerRunning = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green

# Stop any existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose down 2>&1 | Out-Null

# Pull latest images (if needed)
Write-Host "📥 Pulling Docker images..." -ForegroundColor Yellow
docker-compose pull 2>&1 | Out-Null

# Start services
Write-Host "🚀 Starting services..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Services started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Access points:" -ForegroundColor Cyan
    Write-Host "   PostgreSQL: localhost:5432"
    Write-Host "   Chainlink Node: http://localhost:6688"
    Write-Host ""
    Write-Host "📊 Check status:" -ForegroundColor Cyan
    Write-Host "   docker-compose ps"
    Write-Host ""
    Write-Host "📋 View logs:" -ForegroundColor Cyan
    Write-Host "   docker-compose logs -f chainlink"
    Write-Host "   docker-compose logs -f postgres"
    Write-Host ""
    Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Check status
    docker-compose ps
} else {
    Write-Host "❌ Failed to start services. Check logs:" -ForegroundColor Red
    Write-Host "   docker-compose logs"
}



