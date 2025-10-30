import React from 'react';
import useLendContext from '@/context/useLendContext';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function AppHeader() {
  const { metamaskDetails, connectWallet } = useLendContext();

  return (
    <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground font-bold text-lg">L</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">LendHub v2</h1>
              <p className="text-sm text-muted-foreground">Decentralized Lending Protocol</p>
            </div>
          </div>
          <nav className="flex items-center space-x-2">
            <a href="/markets" className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors">Markets</a>
            <a href="/dashboard" className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors">Dashboard</a>
            <a href="/deposit" className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors">Deposit</a>
            <a href="/borrow" className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors">Borrow</a>
            <a href="/history" className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors">History</a>
            <a href="/liquidations" className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors">Liquidation</a>
          </nav>
          <div className="flex items-center space-x-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm text-muted-foreground">Connected to</div>
              <div className="font-medium text-green-600">Ganache Network</div>
            </div>
            <ThemeToggle />
            <Button onClick={connectWallet}>
              {metamaskDetails.currentAccount ? `${metamaskDetails.currentAccount.slice(0, 6)}...${metamaskDetails.currentAccount.slice(-4)}` : 'Connect Wallet'}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}


