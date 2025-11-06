@echo off
echo ========================================
echo Running Full Chainlink Setup
echo ========================================
echo.

echo Step 1: Checking Docker Chainlink...
docker-compose ps >nul 2>&1
if %errorlevel% equ 0 (
    echo   Docker Compose is available
) else (
    echo   Warning: Docker Compose might not be available
)
echo.

echo Step 2-5: Running Node.js setup script...
node scripts/run_full_chainlink_setup.cjs

echo.
echo ========================================
echo Setup Complete!
echo ========================================
pause



