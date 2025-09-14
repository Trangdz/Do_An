import React from 'react';
import { useAccountBalance } from '../hooks/useAccountBalance';
import { useWallet } from '../hooks/useWallet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { formatCurrency } from '../lib/math';

export function AccountBalance() {
  const { provider, address } = useWallet();
  const { ethBalanceFormatted, isLoading, error } = useAccountBalance(provider, address);

  if (!address) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Balance</CardTitle>
          <CardDescription>Your wallet balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading balance...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive bg-destructive/10">
        <CardHeader>
          <CardTitle>Account Balance</CardTitle>
          <CardDescription>Your wallet balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-destructive">
            <div className="font-medium">Error loading balance</div>
            <div className="text-sm">{error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Convert ETH to USD (simplified - in real app would use price oracle)
  const ethPrice = 150; // WETH price from oracle
  const ethValueUSD = parseFloat(ethBalanceFormatted) * ethPrice;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Balance</CardTitle>
        <CardDescription>Your wallet balance on Ganache</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-bold text-blue-600">Ξ</span>
              </div>
              <div>
                <div className="font-medium">Ethereum (ETH)</div>
                <div className="text-sm text-muted-foreground">Native currency</div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xl font-bold">
                {ethBalanceFormatted} ETH
              </div>
              <div className="text-sm text-muted-foreground">
                ≈ {formatCurrency(ethValueUSD)}
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            💡 This is your Ganache test ETH (100 ETH per account)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
