import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { MarketData, TransactionStatus } from '../types';
import { formatNumber, formatTokenAmount, canLiquidate } from '../utils/math';

interface LiquidationPanelProps {
  marketData: MarketData[];
  userAccount?: {
    collateralValue: number;
    debtValue: number;
    healthFactor: number;
  };
  onLiquidate: (debtAsset: string, collateralAsset: string, debtAmount: string) => Promise<void>;
  transactionStatus: TransactionStatus;
}

export function LiquidationPanel({
  marketData,
  userAccount,
  onLiquidate,
  transactionStatus
}: LiquidationPanelProps) {
  const [debtAsset, setDebtAsset] = useState('');
  const [collateralAsset, setCollateralAsset] = useState('');
  const [debtAmount, setDebtAmount] = useState('');

  const isTransactionPending = transactionStatus === 'pending';
  const canLiquidateUser = userAccount && canLiquidate(userAccount.healthFactor);

  const borrowableAssets = marketData.filter(market => market.token.isBorrowable);
  const collateralAssets = marketData.filter(market => !market.token.isBorrowable);

  const handleMaxDebt = () => {
    if (userAccount) {
      setDebtAmount(userAccount.debtValue.toString());
    }
  };

  const handleLiquidate = async () => {
    if (debtAsset && collateralAsset && debtAmount) {
      await onLiquidate(debtAsset, collateralAsset, debtAmount);
    }
  };

  if (!canLiquidateUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Liquidation Panel</CardTitle>
          <CardDescription>
            This user's position is healthy and cannot be liquidated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Health Factor: {userAccount ? formatNumber(userAccount.healthFactor, 2) : 'N/A'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Liquidation Panel</CardTitle>
        <CardDescription>
          This user's position can be liquidated (HF &lt; 1)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-destructive font-medium">
          ⚠️ Health Factor: {formatNumber(userAccount!.healthFactor, 2)} - Position can be liquidated
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Debt Asset</label>
            <select
              className="w-full mt-1 p-2 border border-input rounded-md bg-background"
              value={debtAsset}
              onChange={(e) => setDebtAsset(e.target.value)}
              disabled={isTransactionPending}
            >
              <option value="">Select debt asset</option>
              {borrowableAssets.map((market) => (
                <option key={market.token.address} value={market.token.address}>
                  {market.token.symbol}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Collateral Asset</label>
            <select
              className="w-full mt-1 p-2 border border-input rounded-md bg-background"
              value={collateralAsset}
              onChange={(e) => setCollateralAsset(e.target.value)}
              disabled={isTransactionPending}
            >
              <option value="">Select collateral asset</option>
              {collateralAssets.map((market) => (
                <option key={market.token.address} value={market.token.address}>
                  {market.token.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Debt Amount</label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMaxDebt}
              disabled={isTransactionPending}
            >
              Max
            </Button>
          </div>
          <Input
            type="number"
            placeholder="0.00"
            value={debtAmount}
            onChange={(e) => setDebtAmount(e.target.value)}
            disabled={isTransactionPending}
          />
        </div>

        <div className="text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>User's Total Debt:</span>
            <span>{formatNumber(userAccount!.debtValue, 2)} USD</span>
          </div>
          <div className="flex justify-between">
            <span>User's Collateral:</span>
            <span>{formatNumber(userAccount!.collateralValue, 2)} USD</span>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={handleLiquidate}
          disabled={!debtAsset || !collateralAsset || !debtAmount || isTransactionPending}
          variant="destructive"
        >
          {isTransactionPending ? 'Liquidating...' : 'Liquidate Position'}
        </Button>
      </CardContent>
    </Card>
  );
}
