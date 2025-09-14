import React from 'react';
import { useWallet } from '../hooks/useWallet';
import { Button } from './ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { CONFIG } from '../config/contracts';

export function WalletButton() {
  const {
    isConnected,
    isConnecting,
    address,
    chainId,
    error,
    connect,
    disconnect,
    formatAddress,
    getNetworkName,
    isCorrectNetwork,
  } = useWallet();

  if (!isConnected) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Connect Wallet</CardTitle>
          <CardDescription>
            Connect your MetaMask wallet to use LendHub v2
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={connect} 
            className="w-full"
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
          </Button>
          
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
          
          <div className="text-xs text-muted-foreground text-center">
            <p>Required Network: Ganache (Chain ID: {CONFIG.CHAIN_ID})</p>
            <p>RPC URL: {CONFIG.RPC_URL}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Wallet Connected</CardTitle>
        <CardDescription>
          {isCorrectNetwork ? 'Connected to Ganache network' : 'Wrong network detected'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Account:</span>
            <span className="text-sm text-muted-foreground font-mono">
              {address && formatAddress(address)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Network:</span>
            <span className={`text-sm font-mono ${
              isCorrectNetwork ? 'text-green-600' : 'text-red-600'
            }`}>
              {getNetworkName(chainId)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Chain ID:</span>
            <span className="text-sm text-muted-foreground font-mono">
              {chainId}
            </span>
          </div>
        </div>

        {!isCorrectNetwork && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            ⚠️ Please switch to Ganache network (Chain ID: {CONFIG.CHAIN_ID})
          </div>
        )}

        <div className="flex space-x-2">
          <Button 
            onClick={disconnect} 
            variant="outline" 
            className="flex-1"
          >
            Disconnect
          </Button>
          
          {!isCorrectNetwork && (
            <Button 
              onClick={connect} 
              variant="default" 
              className="flex-1"
            >
              Switch Network
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for header
export function WalletButtonCompact() {
  const {
    isConnected,
    isConnecting,
    address,
    chainId,
    connect,
    disconnect,
    formatAddress,
    getNetworkName,
    isCorrectNetwork,
  } = useWallet();

  if (!isConnected) {
    return (
      <Button 
        onClick={connect} 
        disabled={isConnecting}
        size="sm"
      >
        {isConnecting ? 'Connecting...' : 'Connect'}
      </Button>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="text-sm">
        <div className="font-mono">{address && formatAddress(address)}</div>
        <div className={`text-xs ${
          isCorrectNetwork ? 'text-green-600' : 'text-red-600'
        }`}>
          {getNetworkName(chainId)}
        </div>
      </div>
      <Button 
        onClick={disconnect} 
        variant="outline" 
        size="sm"
      >
        Disconnect
      </Button>
    </div>
  );
}
