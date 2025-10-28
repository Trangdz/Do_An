import React, { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { formatCurrency, formatNumber, calculateMaxWithdraw } from '../lib/math';
import { withdraw, parseTokenAmount } from '../lib/tx';
import { useToast } from './ui/Toast';

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
  token: {
    address: string;
    symbol: string;
    decimals: number;
  };
  poolAddress: string;
  signer: ethers.Signer | null;
  provider: ethers.Provider | null;
  userSupply: string;
  poolLiquidity: string;
  price: number;
  liquidationThreshold: number;
  collateralUSD: number;
  debtUSD: number;
  onSuccess?: () => void;
}

export function WithdrawModal({
  open,
  onClose,
  token,
  poolAddress,
  signer,
  provider,
  userSupply,
  poolLiquidity,
  price,
  liquidationThreshold,
  collateralUSD,
  debtUSD,
  onSuccess
}: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCollateral, setIsCollateral] = useState(false);
  const [ltvBps, setLtvBps] = useState(7500); // Default 75%
  const [actualCollateralUSD, setActualCollateralUSD] = useState(0);
  const [actualDebtUSD, setActualDebtUSD] = useState(0);
  const { showToast } = useToast();

  // Fetch actual account data from smart contract
  useEffect(() => {
    const fetchAccountData = async () => {
      if (!provider || !signer || !poolAddress) return;
      
      try {
        const abi = [
          'function userReserves(address user, address asset) view returns (tuple(uint128 principal, uint128 index) supply, tuple(uint128 principal, uint128 index) borrow, bool useAsCollateral)',
          'function reserves(address asset) view returns (tuple(uint128 reserveCash, uint128 totalDebtPrincipal, uint40 lastUpdate, uint16 ltvBps, uint16 liquidationThresholdBps, uint16 liquidationBonusBps, uint16 closeFactorBps, bool isBorrowable, uint16 optimalUBps, uint8 decimals, uint128 liquidityIndex, uint128 variableBorrowIndex, uint128 reserveFactorBps))',
          'function getAccountData(address user) view returns (uint256 collateralValue1e18, uint256 debtValue1e18, uint256 healthFactor1e18)'
        ];
        const pool = new ethers.Contract(poolAddress, abi, provider);
        const userAddress = await signer.getAddress();
        
        // Get account data from smart contract
        const [collValue, debtValue, hf] = await pool.getAccountData(userAddress);
        const actualColl = parseFloat(ethers.formatEther(collValue));
        const actualDebt = parseFloat(ethers.formatEther(debtValue));
        
        setActualCollateralUSD(actualColl);
        setActualDebtUSD(actualDebt);
        
        console.log('📊 Fetched account data from contract:', {
          collateralUSD: actualColl,
          debtUSD: actualDebt,
          healthFactor: parseFloat(ethers.formatEther(hf))
        });
        
        // Get collateral status
        const userReserve = await pool.userReserves(userAddress, token.address);
        setIsCollateral(userReserve.useAsCollateral);
        
        // Get LTV from reserve data
        const reserveData = await pool.reserves(token.address);
        setLtvBps(Number(reserveData.ltvBps));
        
        console.log('📊 Asset data:', {
          isCollateral: userReserve.useAsCollateral,
          ltvBps: Number(reserveData.ltvBps)
        });
      } catch (error) {
        console.error('Error fetching account data:', error);
        // Fallback to props if contract call fails
        setActualCollateralUSD(collateralUSD);
        setActualDebtUSD(debtUSD);
        setIsCollateral(false);
      }
    };
    
    if (open) {
      fetchAccountData();
    }
  }, [open, provider, signer, poolAddress, token.address]);

  // Calculate x_max based on whether asset is collateral
  // Use useMemo to recalculate when dependencies change
  const xMax = useMemo(() => {
    const userSupplyNum = parseFloat(userSupply || '0');
    const poolLiquidityNum = parseFloat(poolLiquidity || '0');
    
    console.log('🔍 Calculate xMax with:', {
      userSupply: userSupply,
      userSupplyNum,
      poolLiquidity: poolLiquidity,
      poolLiquidityNum,
      isCollateral,
      price,
      ltvBps,
      collateralUSD: actualCollateralUSD,
      debtUSD: actualDebtUSD
    });
    
    // If user has no supply, cannot withdraw
    if (userSupplyNum <= 0) {
      console.log('❌ No supply - cannot withdraw');
      return 0;
    }
    
    // IMPORTANT: Check if this asset is used as collateral
    console.log('📊 Collateral check:', {
      isCollateral,
      collateralUSD: actualCollateralUSD,
      debtUSD: actualDebtUSD
    });
    
    // If NOT used as collateral, can withdraw all
    if (!isCollateral) {
      const result = Math.min(userSupplyNum, poolLiquidityNum);
      console.log('✅ Not collateral - can withdraw all:', result);
      return result;
    }
    
    // If used as collateral, we need to check Health Factor
    console.log('📊 Asset is collateral, checking conditions...');
    
    if (price === 0) {
      console.log('❌ Price is 0 - cannot calculate');
      return 0;
    }
    
    if (ltvBps === 0) {
      console.log('❌ LTV is 0 - cannot calculate');
      return 0;
    }
    
    console.log('📊 Calling calculateMaxWithdraw with:', {
      totalCollateralUSD: actualCollateralUSD,
      totalDebtUSD: actualDebtUSD,
      userSupply: userSupplyNum,
      assetPrice: price,
      ltvBps
    });
    
    // Use smart contract logic (matching _maxWithdrawAllowed)
    const maxWithdrawTokens = calculateMaxWithdraw(
      actualCollateralUSD,        // Total collateral USD from contract
      actualDebtUSD,              // Total debt USD from contract
      userSupplyNum,              // User supply of this asset
      price,                      // Asset price
      ltvBps                      // LTV (matching smart contract)
    );
    
    console.log('📊 Max withdraw tokens calculated:', maxWithdrawTokens);
    
    // Clamp by pool liquidity
    const result = Math.min(maxWithdrawTokens, poolLiquidityNum);
    console.log('✅ Final xMax (collateral):', result);
    
    return result;
  }, [userSupply, poolLiquidity, isCollateral, price, ltvBps, actualCollateralUSD, actualDebtUSD]);
  const isHealthy = actualCollateralUSD >= actualDebtUSD;
  const hasDebt = actualDebtUSD > 0;
  
  // Only show warning if: is collateral AND has debt AND unhealthy
  const showWarning = isCollateral && hasDebt && !isHealthy;
  const canWithdraw = !isCollateral ? xMax > 0 : (isHealthy && xMax > 0);

  const handleAmountChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleMaxClick = () => {
    if (canWithdraw) {
      setAmount(xMax.toFixed(6));
    }
  };

  const handleWithdraw = async () => {
    if (!signer || !amount || parseFloat(amount) <= 0) return;

    const withdrawAmount = parseFloat(amount);
    
    // Validate amount before sending transaction
    if (withdrawAmount > xMax) {
      showToast({
        type: 'error',
        title: 'Invalid Amount',
        message: `Cannot withdraw more than ${xMax.toFixed(4)} ${token.symbol}. Max withdraw is ${xMax.toFixed(4)} ${token.symbol}`
      });
      return;
    }
    
    if (withdrawAmount <= 0) {
      showToast({
        type: 'error',
        title: 'Invalid Amount',
        message: 'Withdraw amount must be greater than 0'
      });
      return;
    }

    setIsLoading(true);

    try {
      const amountBN = parseTokenAmount(amount, token.decimals);
      
      console.log('💸 Withdraw transaction:', {
        amount,
        amountBN: amountBN.toString(),
        xMax,
        isCollateral,
        actualCollateralUSD,
        actualDebtUSD
      });
      
      // Use transaction service
      const result = await withdraw(signer, token.address, amountBN);
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'Withdraw Successful!',
        message: `Successfully withdrew ${amount} ${token.symbol}`,
        hash: result.hash
      });
      
      // Reset form and close
      setAmount('');
      onSuccess?.();
      onClose();

    } catch (error: any) {
      console.error('❌ Error withdrawing:', error);
      
      // Parse error message
      let errorMessage = 'Failed to withdraw tokens';
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.data?.message) {
        errorMessage = error.data.message;
      }
      
      // Check for specific revert reasons
      if (errorMessage.includes('HealthFactorTooLow') || errorMessage.includes('Health factor')) {
        errorMessage = 'Cannot withdraw: Health Factor would be too low. Try withdrawing a smaller amount.';
      } else if (errorMessage.includes('Insufficient liquidity')) {
        errorMessage = 'Pool does not have enough liquidity. Try withdrawing less.';
      } else if (errorMessage.includes('Internal JSON-RPC error')) {
        errorMessage = 'Transaction failed: Health Factor too low or insufficient liquidity. Try a smaller amount.';
      }
      
      // Show error toast
      showToast({
        type: 'error',
        title: 'Withdraw Failed',
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = !signer || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > xMax || !canWithdraw;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white shadow-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900">
            Withdraw {token.symbol}
          </CardTitle>
          <CardDescription className="text-gray-600">
            Withdraw your supplied {token.symbol} tokens
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Position Info */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">You Supply</span>
              <span className="text-sm font-mono text-gray-900">
                {formatNumber(parseFloat(userSupply), 4)} {token.symbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Pool Liquidity</span>
              <span className="text-sm font-mono text-gray-900">
                {formatNumber(parseFloat(poolLiquidity), 0)} {token.symbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Max Withdraw (x_max)</span>
              <span className={`text-sm font-mono ${canWithdraw ? 'text-green-600' : 'text-red-600'}`}>
                {formatNumber(xMax, 4)} {token.symbol}
              </span>
            </div>
          </div>

          {/* Health Factor Warning - Only show for collateral assets with debt */}
          {showWarning && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-red-500">⚠️</span>
                <div>
                  <p className="text-sm font-medium text-red-800">Position at Risk</p>
                  <p className="text-xs text-red-600 mt-1">
                    Your debt exceeds collateral. Cannot withdraw safely.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Info for non-collateral assets */}
          {!isCollateral && xMax > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-blue-500">ℹ️</span>
                <div>
                  <p className="text-sm font-medium text-blue-800">Safe to Withdraw</p>
                  <p className="text-xs text-blue-600 mt-1">
                    This asset is not used as collateral. You can withdraw your full supply.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
              Amount to Withdraw
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="text"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className="pr-20 text-lg"
                disabled={isLoading || !canWithdraw}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3"
                onClick={handleMaxClick}
                disabled={isLoading || !canWithdraw}
              >
                MAX
              </Button>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-500">
                ≈ {formatCurrency(parseFloat(amount) * price)} USD
              </span>
            </div>
          </div>

          {/* Calculation Details */}
          {canWithdraw && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Withdraw Calculation</h4>
              <div className="space-y-1 text-xs text-blue-700">
                <div className="flex justify-between">
                  <span>Collateral USD:</span>
                  <span>{formatCurrency(actualCollateralUSD)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Debt USD:</span>
                  <span>{formatCurrency(actualDebtUSD)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Net Collateral:</span>
                  <span>{formatCurrency(actualCollateralUSD - actualDebtUSD)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Liquidation Threshold:</span>
                  <span>{(liquidationThreshold / 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Max Withdraw:</span>
                  <span>{formatNumber(xMax, 4)} {token.symbol}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={isDisabled}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Withdrawing...</span>
                </div>
              ) : (
                'Withdraw'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}