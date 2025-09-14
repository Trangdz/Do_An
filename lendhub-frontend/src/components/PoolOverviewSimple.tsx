import React from 'react';
import { usePoolDataSimple } from '../hooks/usePoolDataSimple';
import { useWallet } from '../hooks/useWallet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { formatCurrency, formatPercentage } from '../lib/math';

export function PoolOverviewSimple() {
  const { provider, signer, address } = useWallet();
  const { tokens, isLoading, error, lastUpdated } = usePoolDataSimple(provider, signer, address);

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
            {tokens.map((token) => (
              <div
                key={token.address}
                className="p-4 rounded-lg border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold">
                        {token.symbol.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">{token.symbol}</div>
                      <div className="text-sm text-muted-foreground">
                        {token.address}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatCurrency(token.price)}
                      </div>
                      <div className="text-xs text-muted-foreground">Price</div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatPercentage(token.supplyAPR)}
                      </div>
                      <div className="text-xs text-muted-foreground">Supply APR</div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatPercentage(token.borrowAPR)}
                      </div>
                      <div className="text-xs text-muted-foreground">Borrow APR</div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatPercentage(token.utilization * 100)}
                      </div>
                      <div className="text-xs text-muted-foreground">Utilization</div>
                    </div>
                  </div>
                </div>
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
