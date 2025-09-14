import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Progress } from './ui/Progress';
import { Button } from './ui/Button';
import { MarketData, Token } from '../types';
import { 
  formatNumber, 
  formatPercentage, 
  formatCurrency, 
  formatTokenAmount,
  getUtilizationColor,
  getHealthFactorColor 
} from '../utils/math';

interface MarketOverviewProps {
  marketData: MarketData[];
  userAccount?: {
    collateralValue: number;
    debtValue: number;
    healthFactor: number;
  };
}

export function MarketOverview({ marketData, userAccount }: MarketOverviewProps) {
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);

  const totalSupply = marketData.reduce((sum, market) => sum + market.totalSupply, 0);
  const totalBorrow = marketData.reduce((sum, market) => sum + market.totalBorrow, 0);
  const totalLiquidity = marketData.reduce((sum, market) => sum + market.availableLiquidity, 0);

  return (
    <div className="space-y-6">
      {/* Market Summary */}
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
      {userAccount && (
        <Card>
          <CardHeader>
            <CardTitle>Your Account</CardTitle>
            <CardDescription>
              Overview of your lending position
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Collateral Value
                </div>
                <div className="text-xl font-bold">
                  {formatCurrency(userAccount.collateralValue)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Debt Value
                </div>
                <div className="text-xl font-bold">
                  {formatCurrency(userAccount.debtValue)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Health Factor
                </div>
                <div className={`text-xl font-bold ${getHealthFactorColor(userAccount.healthFactor)}`}>
                  {userAccount.healthFactor === Number.MAX_SAFE_INTEGER 
                    ? '∞' 
                    : formatNumber(userAccount.healthFactor, 2)
                  }
                </div>
              </div>
            </div>
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
            {marketData.map((market) => (
              <div
                key={market.token.address}
                className={`p-4 rounded-lg border ${
                  selectedToken?.address === market.token.address
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedToken(market.token)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold">
                        {market.token.symbol.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">{market.token.symbol}</div>
                      <div className="text-sm text-muted-foreground">
                        {market.token.name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatCurrency(market.price)}
                      </div>
                      <div className="text-xs text-muted-foreground">Price</div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatPercentage(market.supplyAPR)}
                      </div>
                      <div className="text-xs text-muted-foreground">Supply APR</div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatPercentage(market.borrowAPR)}
                      </div>
                      <div className="text-xs text-muted-foreground">Borrow APR</div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getUtilizationColor(market.utilization)}`}>
                        {formatPercentage(market.utilization * 100)}
                      </div>
                      <div className="text-xs text-muted-foreground">Utilization</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Utilization</span>
                    <span>{formatPercentage(market.utilization * 100)}</span>
                  </div>
                  <Progress value={market.utilization * 100} max={100} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
