import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { MarketData, TransactionStatus } from '../types';
import { formatNumber, formatTokenAmount, calculateMaxWithdraw } from '../utils/math';

interface LendingActionsProps {
  marketData: MarketData;
  userReserveData?: {
    supplyBalance: number;
    borrowBalance: number;
    isCollateral: boolean;
  };
  userAccount?: {
    collateralValue: number;
    debtValue: number;
    healthFactor: number;
  };
  onSupply: (amount: string) => Promise<void>;
  onWithdraw: (amount: string) => Promise<void>;
  onBorrow: (amount: string) => Promise<void>;
  onRepay: (amount: string) => Promise<void>;
  transactionStatus: TransactionStatus;
}

export function LendingActions({
  marketData,
  userReserveData,
  userAccount,
  onSupply,
  onWithdraw,
  onBorrow,
  onRepay,
  transactionStatus
}: LendingActionsProps) {
  const [supplyAmount, setSupplyAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [repayAmount, setRepayAmount] = useState('');

  const isTransactionPending = transactionStatus === 'pending';

  const maxWithdraw = userReserveData ? 
    calculateMaxWithdraw(
      BigInt(Math.floor(userAccount?.collateralValue || 0) * 1e18),
      BigInt(Math.floor(userAccount?.debtValue || 0) * 1e18),
      marketData.price,
      marketData.reserveData.liquidationThreshold
    ) : 0;

  const handleMaxSupply = () => {
    // In a real app, this would get the user's token balance
    setSupplyAmount('1000');
  };

  const handleMaxWithdraw = () => {
    setWithdrawAmount(maxWithdraw.toString());
  };

  const handleMaxBorrow = () => {
    // Calculate max borrow based on collateral and LTV
    if (userAccount) {
      const maxBorrowValue = userAccount.collateralValue * (marketData.reserveData.ltv / 10000);
      const maxBorrowAmount = maxBorrowValue / marketData.price;
      setBorrowAmount(maxBorrowAmount.toString());
    }
  };

  const handleMaxRepay = () => {
    if (userReserveData) {
      setRepayAmount(userReserveData.borrowBalance.toString());
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Supply */}
      <Card>
        <CardHeader>
          <CardTitle>Supply {marketData.token.symbol}</CardTitle>
          <CardDescription>
            Earn interest by supplying {marketData.token.symbol} to the protocol
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Amount</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMaxSupply}
                disabled={isTransactionPending}
              >
                Max
              </Button>
            </div>
            <Input
              type="number"
              placeholder="0.00"
              value={supplyAmount}
              onChange={(e) => setSupplyAmount(e.target.value)}
              disabled={isTransactionPending}
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Supply APR:</span>
              <span>{formatNumber(marketData.supplyAPR, 2)}%</span>
            </div>
          </div>
          
          <Button
            className="w-full"
            onClick={() => onSupply(supplyAmount)}
            disabled={!supplyAmount || isTransactionPending}
          >
            {isTransactionPending ? 'Supplying...' : 'Supply'}
          </Button>
        </CardContent>
      </Card>

      {/* Withdraw */}
      <Card>
        <CardHeader>
          <CardTitle>Withdraw {marketData.token.symbol}</CardTitle>
          <CardDescription>
            Withdraw your supplied {marketData.token.symbol}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Amount</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMaxWithdraw}
                disabled={isTransactionPending || !userReserveData}
              >
                Max
              </Button>
            </div>
            <Input
              type="number"
              placeholder="0.00"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              disabled={isTransactionPending}
            />
          </div>
          
          {userReserveData && (
            <div className="text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Your Supply:</span>
                <span>{formatTokenAmount(userReserveData.supplyBalance, marketData.token.symbol)}</span>
              </div>
              <div className="flex justify-between">
                <span>Max Withdraw:</span>
                <span>{formatTokenAmount(maxWithdraw, marketData.token.symbol)}</span>
              </div>
            </div>
          )}
          
          <Button
            className="w-full"
            onClick={() => onWithdraw(withdrawAmount)}
            disabled={!withdrawAmount || isTransactionPending || !userReserveData}
          >
            {isTransactionPending ? 'Withdrawing...' : 'Withdraw'}
          </Button>
        </CardContent>
      </Card>

      {/* Borrow */}
      {marketData.token.isBorrowable && (
        <Card>
          <CardHeader>
            <CardTitle>Borrow {marketData.token.symbol}</CardTitle>
            <CardDescription>
              Borrow {marketData.token.symbol} against your collateral
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Amount</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMaxBorrow}
                  disabled={isTransactionPending || !userAccount}
                >
                  Max
                </Button>
              </div>
              <Input
                type="number"
                placeholder="0.00"
                value={borrowAmount}
                onChange={(e) => setBorrowAmount(e.target.value)}
                disabled={isTransactionPending}
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Borrow APR:</span>
                <span>{formatNumber(marketData.borrowAPR, 2)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Available Liquidity:</span>
                <span>{formatTokenAmount(marketData.availableLiquidity, marketData.token.symbol)}</span>
              </div>
            </div>
            
            <Button
              className="w-full"
              onClick={() => onBorrow(borrowAmount)}
              disabled={!borrowAmount || isTransactionPending || !userAccount}
            >
              {isTransactionPending ? 'Borrowing...' : 'Borrow'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Repay */}
      {marketData.token.isBorrowable && userReserveData && userReserveData.borrowBalance > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Repay {marketData.token.symbol}</CardTitle>
            <CardDescription>
              Repay your borrowed {marketData.token.symbol}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Amount</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMaxRepay}
                  disabled={isTransactionPending}
                >
                  Max
                </Button>
              </div>
              <Input
                type="number"
                placeholder="0.00"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                disabled={isTransactionPending}
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Your Debt:</span>
                <span>{formatTokenAmount(userReserveData.borrowBalance, marketData.token.symbol)}</span>
              </div>
            </div>
            
            <Button
              className="w-full"
              onClick={() => onRepay(repayAmount)}
              disabled={!repayAmount || isTransactionPending}
            >
              {isTransactionPending ? 'Repaying...' : 'Repay'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
