import { useState, useEffect } from 'react';
import useLendContext from '../context/useLendContext';
import { LendModal } from './LendModal';
import { WrapEthModal } from './WrapEthModal';
import { WithdrawModal } from './WithdrawModal';
import { BorrowModal } from './BorrowModal';
import { RepayModal } from './RepayModal';
import { CONFIG } from '../config/contracts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import { 
  formatCurrency, 
  formatPercentage, 
  formatNumber,
  formatBalance,
  formatWETHBalance
} from '../lib/math';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function SimpleDashboard() {
  const {
    // State
    metamaskDetails,
    userAssets,
    supplyAssets,
    assetsToBorrow,
    yourBorrows,
    accountData, 
    // Functions
    connectWallet,
    refresh,
  } = useLendContext();

  // Derived state
  const isConnected = !!metamaskDetails.currentAccount;
  const isCorrectNetwork = metamaskDetails.chainId === 1337; // Ganache
  const provider = metamaskDetails.provider;
  const signer = metamaskDetails.signer;
  
  // Account data
  const collateralValue = parseFloat(accountData.collateralUSD || '0');
  const debtValue = parseFloat(accountData.debtUSD || '0');
  const healthFactor = parseFloat(accountData.healthFactor || '0');
  
  // ETH balance from user assets
  const ethBalance = parseFloat(userAssets.find((a: any) => a.symbol === 'ETH')?.balance || '0');
  const realWethBalance = parseFloat(userAssets.find((a: any) => a.symbol === 'WETH')?.balance || '0');
  
  // Create tokens array for display (combine user assets with supply/borrow data)
  const tokens = userAssets.map((asset: any) => {
    const supply = supplyAssets.find((s: any) => s.address === asset.address);
    const borrow = yourBorrows.find((b: any) => b.address === asset.address);
    const borrowCfg = (assetsToBorrow || []).find((a: any) => a.address === asset.address);
    
    // Debug log for WETH supply
    if (asset.symbol === 'WETH' && supply) {
      console.log("🔍 WETH Supply found:", {
        symbol: supply.symbol,
        principal: supply.supplyPrincipal,
        balanceUSD: supply.balanceUSD
      });
    }
    
    // Debug log for WETH borrow
    if (asset.symbol === 'WETH' && borrow) {
      console.log("🔍 WETH Borrow found:", {
        symbol: borrow.symbol,
        principal: borrow.borrowPrincipal,
        balanceUSD: borrow.balanceUSD
      });
    }
    
    const base = {
      address: asset.address,
      symbol: asset.symbol,
      name: asset.name,
      decimals: asset.decimals,
      isNative: asset.isNative,
      price: parseFloat(asset.priceUSD || '0'),
      userBalance: parseFloat(asset.balance || '0'),
      userBalanceUSD: asset.balanceUSD || 0,
      userSupply: supply ? parseFloat(supply.supplyPrincipal || '0') : 0,
      userSupplyUSD: supply ? supply.balanceUSD || 0 : 0,
      userBorrow: borrow ? parseFloat(borrow.borrowPrincipal || '0') : 0,
      userBorrowUSD: borrow ? borrow.balanceUSD || 0 : 0,
      supplyAPR: 0, // TODO: Get from reserve data
      borrowAPR: 0, // TODO: Get from reserve data
      utilization: 0, // TODO: Calculate
      availableLiquidity: borrowCfg ? parseFloat(borrowCfg.reserveCash || '0') : 0,
      liquidationThreshold: 8000, // Default
    } as any;

    // UI rule: WETH is not borrowable → never show borrowed > 0 for WETH card
    if (asset.symbol === 'WETH') {
      base.userBorrow = 0;
      base.userBorrowUSD = 0;
    }

    return base;
  });

  // Mock rate chart data (TODO: Implement real rate chart)
  const rateChartData: any[] = [];
  const rateChartLoading = false;
  
  // Toast hook
  const { showToast } = useToast();
  
  // Modal state
  const [lendModalOpen, setLendModalOpen] = useState(false);
  const [wrapEthModalOpen, setWrapEthModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [repayModalOpen, setRepayModalOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<any>(null);

  // Load data when connected
  useEffect(() => {
    if (isConnected && provider) {
      refresh();
    }
  }, [isConnected, provider, refresh]);

  // Debug log for supplyAssets
  useEffect(() => {
    console.log("📊 SupplyAssets updated:", supplyAssets);
    if (supplyAssets.length > 0) {
      console.log("✅ Found supplies:", supplyAssets.map(s => ({
        symbol: s.symbol,
        principal: s.supplyPrincipal,
        balanceUSD: s.balanceUSD
      })));
    } else {
      console.log("❌ No supplies found");
    }
  }, [supplyAssets]);

  // Debug log for yourBorrows
  useEffect(() => {
    console.log("📊 YourBorrows updated:", yourBorrows);
    if (yourBorrows.length > 0) {
      console.log("✅ Found borrows:", yourBorrows.map(b => ({
        symbol: b.symbol,
        principal: b.borrowPrincipal,
        balanceUSD: b.balanceUSD
      })));
    } else {
      console.log("❌ No borrows found");
    }
  }, [yourBorrows]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">L</span>
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Welcome to LendHub v2
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Connect your wallet to start earning with DeFi lending
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={connectWallet} className="w-full">
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-red-200 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
              <span className="text-white text-2xl">⚠️</span>
            </div>
            <CardTitle className="text-2xl font-bold text-red-600">
              Wrong Network
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Please switch to Ganache network to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={connectWallet} className="w-full">
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isHealthy = healthFactor >= 1;
  const canLiquidate = healthFactor < 1;
  const totalSupply = tokens.reduce((sum: number, token: any) => sum + (token.totalSupply || 0), 0);
  const totalBorrow = tokens.reduce((sum: number, token: any) => sum + (token.totalBorrow || 0), 0);

  const handleSupplyClick = (token: any) => {
    // Format user balance
    const userBalance = formatCurrency(token.userBalance || 0);
    
    // Show info toast with balance
    showToast({
      type: 'info',
      title: 'Supply Token',
      message: `Opening supply modal for ${token.symbol}. Your balance: ${userBalance}`
    });
    
    setSelectedToken(token);
    setLendModalOpen(true);
  };

  const handleLendSuccess = () => {
    console.log("🎉 Lend success callback triggered!");
    
    // Show success toast
    showToast({
      type: 'success',
      title: 'Supply Successful!',
      message: 'Your tokens have been supplied successfully'
    });
    
    // Refresh data after successful lend
    console.log("🔄 Calling refresh after lend success...");
    refresh();
  };

  const handleWrapEthClick = () => {
    setLendModalOpen(false);
    setWrapEthModalOpen(true);
  };

  const handleWrapEthSuccess = () => {
    // Show success toast
    showToast({
      type: 'success',
      title: 'ETH Wrapped!',
      message: 'ETH has been successfully wrapped to WETH'
    });
    
    setWrapEthModalOpen(false);
    setLendModalOpen(true);
    // Refresh data after successful wrap to update both ETH and WETH balances
    refresh();
    console.log('✅ Wrap successful! Refreshing balances...');
  };

  const handleWithdrawClick = (token: any) => {
    // Format user balance
    const userBalance = formatCurrency(token.userBalance || 0);
    
    // Show info toast with balance
    showToast({
      type: 'info',
      title: 'Withdraw Token',
      message: `Opening withdraw modal for ${token.symbol}. Your balance: ${userBalance}`
    });
    
    setSelectedToken(token);
    setWithdrawModalOpen(true);
  };

  const handleWithdrawSuccess = () => {
    // Show success toast
    showToast({
      type: 'success',
      title: 'Withdraw Successful!',
      message: 'Your tokens have been withdrawn successfully'
    });
    
    setWithdrawModalOpen(false);
    setSelectedToken(null);
    refresh();
  };

  const handleBorrowClick = (token: any) => {
    // Format user balance
    const userBalance = formatCurrency(token.userBalance || 0);
    
    // Show info toast with balance
    showToast({
      type: 'info',
      title: 'Borrow Token',
      message: `Opening borrow modal for ${token.symbol}. Your balance: ${userBalance}`
    });
    
    setSelectedToken(token);
    setBorrowModalOpen(true);
  };

  const handleBorrowSuccess = () => {
    // Show success toast
    showToast({
      type: 'success',
      title: 'Borrow Successful!',
      message: 'You have successfully borrowed tokens'
    });
    
    setBorrowModalOpen(false);
    setSelectedToken(null);
    refresh();
  };

  const handleRepayClick = (token: any) => {
    // Format user balance
    const userBalance = formatCurrency(token.userBalance || 0);
    
    // Show info toast with balance
    showToast({
      type: 'info',
      title: 'Repay Token',
      message: `Opening repay modal for ${token.symbol}. Your balance: ${userBalance}`
    });
    
    setSelectedToken(token);
    setRepayModalOpen(true);
  };

  const handleRepaySuccess = () => {
    // Show success toast
    showToast({
      type: 'success',
      title: 'Repay Successful!',
      message: 'Your debt has been repaid successfully'
    });
    
    setRepayModalOpen(false);
    setSelectedToken(null);
    refresh();
  };

  // Error handling function
  const handleError = (error: any, action: string) => {
    console.error(`Error in ${action}:`, error);
    showToast({
      type: 'error',
      title: `${action} Failed`,
      message: error.message || 'An unexpected error occurred'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  LendHub v2
                </h1>
                <p className="text-sm text-gray-600">Decentralized Lending Protocol</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <div className="text-sm text-gray-600">Connected to</div>
                <div className="font-medium text-green-600">Ganache Network</div>
              </div>
              <Button onClick={connectWallet}>
                {metamaskDetails.currentAccount ? 
                  `${metamaskDetails.currentAccount.slice(0, 6)}...${metamaskDetails.currentAccount.slice(-4)}` : 
                  'Connect Wallet'
                }
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center py-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Your DeFi Dashboard
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Manage your lending positions, monitor health factors, and explore market opportunities
            </p>
          </div>

          {/* Account Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Collateral Value */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                    <span className="text-white text-sm">💰</span>
                  </div>
                  <CardTitle className="text-sm font-medium text-green-700">
                    Collateral Value
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {!accountData.collateralUSD ? (
                    <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    formatCurrency(collateralValue)
                  )}
                </div>
                <p className="text-sm text-green-600/70">
                  Threshold-weighted USD
                </p>
              </CardContent>
            </Card>

            {/* Debt Value */}
            <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
                    <span className="text-white text-sm">💸</span>
                  </div>
                  <CardTitle className="text-sm font-medium text-red-700">
                    Debt Value
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600 mb-1">
                  {!accountData.debtUSD ? (
                    <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    formatCurrency(debtValue)
                  )}
                </div>
                <p className="text-sm text-red-600/70">
                  Total borrowed USD
                </p>
              </CardContent>
            </Card>

            {/* Health Factor */}
            <Card className={`shadow-lg hover:shadow-xl transition-all duration-300 ${
              isHealthy 
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
                : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isHealthy ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    <span className="text-white text-sm">
                      {isHealthy ? '✅' : '⚠️'}
                    </span>
                  </div>
                  <CardTitle className={`text-sm font-medium ${
                    isHealthy ? 'text-green-700' : 'text-red-700'
                  }`}>
                    Health Factor
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold mb-1 ${
                  isHealthy ? 'text-green-600' : 'text-red-600'
                }`}>
                  {!accountData.healthFactor ? (
                    <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : healthFactor === Number.MAX_SAFE_INTEGER ? (
                    '∞'
                  ) : (
                    formatNumber(healthFactor, 2)
                  )}
                </div>
                <p className={`text-sm ${
                  isHealthy ? 'text-green-600/70' : 'text-red-600/70'
                }`}>
                  {isHealthy ? 'Healthy Position' : 'At Risk'}
                  {canLiquidate && ' (Liquidatable)'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Pool Overview */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900">Pool Overview</CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    Total liquidity and borrowing across all assets
                  </CardDescription>
                </div>
                <div className="flex space-x-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-purple-600">{ethBalance.toFixed(4)} ETH</div>
                    <div className="text-gray-500">Your ETH Balance</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-green-600">{formatCurrency(totalSupply)}</div>
                    <div className="text-gray-500">Total Supply</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-blue-600">{formatCurrency(totalBorrow)}</div>
                    <div className="text-gray-500">Total Borrow</div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Interest Rate Chart */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">Live Interest Rates</CardTitle>
              <CardDescription className="text-gray-600">
                Real-time supply and borrow rates across all assets (updates every 5s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rateChartLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading interest rate data...</p>
                  </div>
                </div>
              ) : rateChartData.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-4xl mb-4">📊</div>
                    <p>No interest rate data available</p>
                  </div>
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rateChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        interval="preserveStartEnd"
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        domain={[0, 'dataMax * 1.1']}
                        tickFormatter={(value) => `${value.toFixed(2)}%`}
                      />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${Number(value).toFixed(4)}%`, 
                          name.toString().replace('_', ' ')
                        ]}
                        labelFormatter={(label) => `Time: ${label}`}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                      />
                      {CONFIG.TOKENS.map((token: any, index: number) => [
                        <Line
                          key={`${token.symbol}_Supply`}
                          type="monotone"
                          dataKey={`${token.symbol}_Supply`}
                          stroke={`hsl(${index * 120}, 70%, 50%)`}
                          strokeWidth={3}
                          dot={false}
                          connectNulls={false}
                          name={`${token.symbol} Supply Rate`}
                        />,
                        <Line
                          key={`${token.symbol}_Borrow`}
                          type="monotone"
                          dataKey={`${token.symbol}_Borrow`}
                          stroke={`hsl(${index * 120}, 70%, 50%)`}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          connectNulls={false}
                          name={`${token.symbol} Borrow Rate`}
                        />
                      ]).flat()}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Market Assets */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">Market Assets</CardTitle>
              <CardDescription className="text-gray-600">
                Available assets for lending and borrowing with real-time rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userAssets.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading market data...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {tokens.map((token: any, index: number) => (
                    <div
                      key={token.address}
                      
                      className="group p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 bg-white/50 backdrop-blur-sm"
                    >
                      {/* Token Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                            index === 0 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                            index === 1 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                            'bg-gradient-to-r from-purple-500 to-pink-500'
                          }`}>
                            {token.symbol.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-lg text-gray-900">{token.symbol}</div>
                            <div className="text-sm text-gray-500 font-mono">
                              {token.address.slice(0, 6)}...{token.address.slice(-4)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            ${token.price.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">Current Price</div>
                        </div>
                      </div>

                      {/* User Position */}
                      {(token.userBalance > 0 || token.userSupply > 0 || token.userBorrow > 0) && (
                        <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
                          <div className="text-sm font-semibold text-indigo-800 mb-2">Your Position</div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <div className="text-lg font-bold text-blue-600">
                                {(() => {
                                  const bal = token.userBalance || 0;
                                  if (token.symbol === 'WETH') {
                                    const adjusted = bal > 1000000 ? bal - 1000000 : bal;
                                    return `${formatBalance(adjusted, 4)} ${token.symbol}`;
                                  }
                                  return `${formatBalance(bal, 4)} ${token.symbol}`;
                                })()}
                              </div>
                              <div className="text-xs text-blue-600/70">
                                Wallet (${formatCurrency(token.userBalanceUSD || 0)})
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-600">
                                {formatNumber(token.userSupply || 0, 4)} {token.symbol}
                              </div>
                              <div className="text-xs text-green-600/70">
                                Supplied (${formatCurrency(token.userSupplyUSD || 0)})
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-red-600">
                                {formatNumber(token.userBorrow || 0, 4)} {token.symbol}
                              </div>
                              <div className="text-xs text-red-600/70">
                                Borrowed (${formatCurrency(token.userBorrowUSD || 0)})
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="text-center p-3 rounded-lg bg-blue-50">
                          <div className="text-lg font-bold text-blue-600">
                            {formatPercentage(token.supplyAPR)}
                          </div>
                          <div className="text-xs text-blue-600/70">Supply APR</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-green-50">
                          <div className="text-lg font-bold text-green-600">
                            {formatPercentage(token.borrowAPR)}
                          </div>
                          <div className="text-xs text-green-600/70">Borrow APR</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-purple-50">
                          <div className="text-lg font-bold text-purple-600">
                            {formatPercentage(token.utilization * 100)}
                          </div>
                          <div className="text-xs text-purple-600/70">Utilization</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-gray-50">
                          <div className="text-lg font-bold text-gray-600">
                            {formatNumber(token.availableLiquidity, 0)}
                          </div>
                          <div className="text-xs text-gray-600/70">Available</div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          {token.symbol === 'ETH' ? (
                            <Button 
                              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg"
                              onClick={() => handleWrapEthClick()}
                            >
                              🔄 Wrap ETH
                            </Button>
                          ) : (
                            <Button 
                              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
                              onClick={() => handleSupplyClick(token)}
                            >
                              💰 Supply {token.symbol}
                            </Button>
                          )}
                          {token.symbol === 'ETH' ? (
                            <Button disabled className="w-full bg-gray-300 text-gray-500">
                              💸 Not Borrowable
                            </Button>
                          ) : token.symbol !== 'ETH' ? (
                            <Button 
                              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg"
                              onClick={() => handleBorrowClick(token)}
                            >
                              💸 Borrow {token.symbol}
                            </Button>
                          ) : (
                            <Button disabled className="w-full bg-gray-300 text-gray-500">
                              💸 Not Borrowable
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {token.symbol === 'ETH' ? (
                            <Button disabled variant="outline" className="w-full border-gray-200 text-gray-400">
                              📤 N/A
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                              onClick={() => handleWithdrawClick(token)}
                              disabled={token.userSupply <= 0}
                            >
                              📤 Withdraw
                            </Button>
                          )}
                          {token.symbol === 'ETH' ? (
                            <Button disabled variant="outline" className="w-full border-gray-200 text-gray-400">
                              💳 N/A
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              className="w-full border-green-200 text-green-600 hover:bg-green-50"
                              onClick={() => handleRepayClick(token)}
                              disabled={token.userBorrow <= 0}
                            >
                              💳 Repay
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">
              Built with ❤️ using React, TypeScript, and Tailwind CSS
            </p>
            <p className="text-xs mt-2">
              Connected to Ganache • Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </main>

      {/* Lend Modal */}
      {selectedToken && (
        <LendModal
          open={lendModalOpen}
          onClose={() => {
            setLendModalOpen(false);
            setSelectedToken(null);
          }}
          token={{
            address: selectedToken.address,
            symbol: selectedToken.symbol,
            decimals: selectedToken.decimals ?? 18,
            userBalance: selectedToken.userBalance
          }}
          poolAddress={CONFIG.LENDING_POOL}
          signer={signer}
          provider={provider}
          onSuccess={handleLendSuccess}
          onWrapEth={handleWrapEthClick}
          simulatedBalance={parseFloat(formatCurrency(selectedToken.userBalance || 0))}
        />
      )}

      {/* Wrap ETH Modal */}
      <WrapEthModal
        open={wrapEthModalOpen}
        onClose={() => setWrapEthModalOpen(false)}
        signer={signer}
        onSuccess={handleWrapEthSuccess}
        onBalanceUpdate={refresh}
      />

      {/* Withdraw Modal */}
      {selectedToken && (
        <WithdrawModal
          open={withdrawModalOpen}
          onClose={() => {
            setWithdrawModalOpen(false);
            setSelectedToken(null);
          }}
          token={{
            address: selectedToken.address,
            symbol: selectedToken.symbol,
            decimals: 18
          }}
          poolAddress={CONFIG.LENDING_POOL}
          signer={signer}
          provider={provider}
          userSupply={selectedToken.userSupply || '0'}
          poolLiquidity={selectedToken.availableLiquidity || '0'}
          price={selectedToken.price || 0}
          liquidationThreshold={selectedToken.liquidationThreshold || 8000}
          collateralUSD={collateralValue || 0}
          debtUSD={debtValue || 0}
          onSuccess={handleWithdrawSuccess}
        />
      )}

      {/* Borrow Modal */}
      {selectedToken && (
        <BorrowModal
          open={borrowModalOpen}
          onClose={() => {
            setBorrowModalOpen(false);
            setSelectedToken(null);
          }}
          token={{
            address: selectedToken.address,
            symbol: selectedToken.symbol,
            decimals: 18
          }}
          poolAddress={CONFIG.LENDING_POOL}
          signer={signer}
          provider={provider}
          price={selectedToken.price || 0}
          poolLiquidity={selectedToken.availableLiquidity || '0'}
          collateralUSD={collateralValue || 0}
          debtUSD={debtValue || 0}
          onSuccess={handleBorrowSuccess}
        />
      )}

      {/* Repay Modal */}
      {selectedToken && (
        <RepayModal
          open={repayModalOpen}
          onClose={() => {
            setRepayModalOpen(false);
            setSelectedToken(null);
          }}
          token={{  
            address: selectedToken.address,
            symbol: selectedToken.symbol,
            decimals: 18
          }}
          poolAddress={CONFIG.LENDING_POOL}
          signer={signer}
          provider={provider}
          userDebt={selectedToken.userBorrow || '0'}
          price={selectedToken.price || 0}
          onSuccess={handleRepaySuccess}
        />
      )}
    </div>
  );
}
