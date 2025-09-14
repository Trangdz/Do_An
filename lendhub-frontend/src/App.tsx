import React, { useState, useEffect } from 'react';
import { useWeb3 } from './hooks/useWeb3';
import { WalletConnect } from './components/WalletConnect';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/Card';
import { Button } from './components/ui/Button';

function App() {
  const { isConnected, account, chainId, connect, disconnect } = useWeb3();
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>LendHub v2</CardTitle>
            <CardDescription>
              Decentralized Lending Protocol
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleConnect} 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : 'Connect MetaMask'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">LendHub v2</h1>
              <p className="text-sm text-muted-foreground">
                Decentralized Lending Protocol
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                {account && (
                  <span>Connected: {account.slice(0, 6)}...{account.slice(-4)}</span>
                )}
              </div>
              <Button
                variant="outline"
                onClick={disconnect}
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Welcome Message */}
          <Card>
            <CardHeader>
              <CardTitle>Welcome to LendHub v2!</CardTitle>
              <CardDescription>
                Your wallet is connected and ready to use
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">✅</div>
                    <div className="text-sm font-medium">Wallet Connected</div>
                    <div className="text-xs text-muted-foreground">
                      {account?.slice(0, 6)}...{account?.slice(-4)}
                    </div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">🌐</div>
                    <div className="text-sm font-medium">Network</div>
                    <div className="text-xs text-muted-foreground">
                      {chainId === 1337 ? 'Ganache' : `Chain ${chainId}`}
                    </div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">🚀</div>
                    <div className="text-sm font-medium">Ready</div>
                    <div className="text-xs text-muted-foreground">
                      Start lending & borrowing
                    </div>
                  </div>
                </div>
                
                <div className="text-center text-muted-foreground">
                  <p>dApp is running successfully!</p>
                  <p className="text-sm">Full features will be available soon.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contract Addresses */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Addresses</CardTitle>
              <CardDescription>
                Deployed contract addresses on Ganache
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Lending Pool:</span>
                  <span className="ml-2 text-muted-foreground font-mono">
                    0x1235aFDCab4a91496Bd74B3C527E50f961484d74
                  </span>
                </div>
                <div>
                  <span className="font-medium">Price Oracle:</span>
                  <span className="ml-2 text-muted-foreground font-mono">
                    0xE315EF5DA360EC7Cfd0c59fEdf9F21a1E2c75A6b
                  </span>
                </div>
                <div>
                  <span className="font-medium">WETH:</span>
                  <span className="ml-2 text-muted-foreground font-mono">
                    0xb5d81ad8Cacf1F3462e4C264Fd1850E4448464DA
                  </span>
                </div>
                <div>
                  <span className="font-medium">DAI:</span>
                  <span className="ml-2 text-muted-foreground font-mono">
                    0xD7C7F0F9DA99f7630FFE1336333db8818caa3fc2
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default App;