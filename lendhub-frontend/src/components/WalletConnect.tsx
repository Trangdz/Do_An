import React from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { Button } from './ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';

export function WalletConnect() {
  const { isConnected, account, chainId, connect, disconnect } = useWeb3();

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Connect Wallet</CardTitle>
          <CardDescription>
            Connect your MetaMask wallet to use LendHub v2
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleConnect} className="w-full">
            Connect MetaMask
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Wallet Connected</CardTitle>
        <CardDescription>
          Connected to Ganache network
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Account:</span>
          <span className="text-sm text-muted-foreground">
            {formatAddress(account!)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Network:</span>
          <span className="text-sm text-muted-foreground">
            {chainId === 1337 ? 'Ganache' : `Chain ${chainId}`}
          </span>
        </div>
        <Button 
          onClick={handleDisconnect} 
          variant="outline" 
          className="w-full"
        >
          Disconnect
        </Button>
      </CardContent>
    </Card>
  );
}
