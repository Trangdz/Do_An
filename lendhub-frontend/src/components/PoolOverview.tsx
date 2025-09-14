import React from 'react';
import { usePoolData, useAccountSummary } from '../hooks/usePoolData';
import { useWallet } from '../hooks/useWallet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Progress } from './ui/Progress';
import { Button } from './ui/Button';
import { 
  formatNumber, 
  formatPercentage, 
  formatCurrency, 
  formatTokenAmount,
  getUtilizationColor,
  getHealthFactorColor,
  isHealthFactorSafe
} from '../lib/math';

export function PoolOverview() {
  const { provider, signer, address } = useWallet();
  const { tokens, isLoading, error, lastUpdated } = usePoolData(provider, signer, address);
  const { 
    collateralValue, 
    debtValue, 
    healthFactor, 
    totalSupplied, 
    totalBorrowed,
    isHealthy,
    canLiquidate 
  } = useAccountSummary(provider, signer, address);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading pool data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive bg-destructive/10">
        <CardContent className="pt-6">
          <div className="text-destructive">
            <div className="font-medium">Error loading data</div>
            <div className="text-sm">{error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalSupply = tokens.reduce((sum, token) => sum + token.totalSupply, 0);
  const totalBorrow = tokens.reduce((sum, token) => sum + token.totalBorrow, 0);
  const totalLiquidity = tokens.reduce((sum, token) => sum + token.availableLiquidity, 0);

  return (
    <div className="space-y-6">
      {/* Pool Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Supply</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalSupply)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Borrow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalBorrow)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Liquidity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalLiquidity)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Account Summary */}
      {address && (
        <Card>
          <CardHeader>
            <CardTitle>Your Account</CardTitle>
            <CardDescription>
              Overview of your lending position
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Collateral Value
                </div>
                <div className="text-xl font-bold">
                  {formatCurrency(collateralValue)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Debt Value
                </div>
                <div className="text-xl font-bold">
                  {formatCurrency(debtValue)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Health Factor
                </div>
                <div className={`text-xl font-bold ${getHealthFactorColor(healthFactor)}`}>
                  {healthFactor === Number.MAX_SAFE_INTEGER 
                    ? '∞' 
                    : formatNumber(healthFactor, 2)
                  }
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Status
                </div>
                <div className={`text-xl font-bold ${
                  isHealthy ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isHealthy ? 'Healthy' : 'At Risk'}
                </div>
              </div>
            </div>

            {canLiquidate && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                ⚠️ Your position can be liquidated (Health Factor &lt; 1)
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Market Assets */}
      <Card>
        <CardHeader>
          <CardTitle>Market Assets</CardTitle>
          <CardDescription>
            Available assets for lending and borrowing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tokens.map((tokenData) => (
              <div
                key={tokenData.token.address}
                className="p-4 rounded-lg border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold">
                        {tokenData.token.symbol.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">{tokenData.token.symbol}</div>
                      <div className="text-sm text-muted-foreground">
                        {tokenData.token.name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatCurrency(tokenData.price)}
                      </div>
                      <div className="text-xs text-muted-foreground">Price</div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatPercentage(tokenData.supplyAPR)}
                      </div>
                      <div className="text-xs text-muted-foreground">Supply APR</div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatPercentage(tokenData.borrowAPR)}
                      </div>
                      <div className="text-xs text-muted-foreground">Borrow APR</div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getUtilizationColor(tokenData.utilization)}`}>
                        {formatPercentage(tokenData.utilization * 100)}
                      </div>
                      <div className="text-xs text-muted-foreground">Utilization</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Utilization</span>
                    <span>{formatPercentage(tokenData.utilization * 100)}</span>
                  </div>
                  <Progress value={tokenData.utilization * 100} max={100} />
                </div>

                {/* User Position */}
                {address && (tokenData.currentSupplyBalance > 0 || tokenData.currentBorrowBalance > 0) && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Your Supply:</div>
                        <div className="font-medium">
                          {formatTokenAmount(tokenData.currentSupplyBalance, tokenData.token.symbol)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Your Borrow:</div>
                        <div className="font-medium">
                          {formatTokenAmount(tokenData.currentBorrowBalance, tokenData.token.symbol)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-xs text-muted-foreground text-center">
        Last updated: {new Date(lastUpdated).toLocaleTimeString()}
      </div>
    </div>
  );
}
