import React from 'react';
import { useRouter } from 'next/router';
import useLendContext from '@/context/useLendContext';
import { Button } from '@/components/ui/Button';

interface GovernanceLayoutProps {
  children: React.ReactNode;
}

export function GovernanceLayout({ children }: GovernanceLayoutProps) {
  const router = useRouter();
  const { metamaskDetails } = useLendContext();
  const currentPath = router.pathname;

  const menuItems = [
    { path: '/governance', label: 'Dashboard', icon: '📊' },
    { path: '/markets', label: 'Markets', icon: '💱' },
    { path: '/governance/proposals', label: 'Governance', icon: '🗳️' },
    { path: '/governance/staking', label: 'Staking', icon: '💰' },
  ];

  const isActive = (path: string) => {
    if (path === '/governance') {
      return currentPath === '/governance';
    }
    return currentPath.startsWith(path);
  };

  // Get voting power (mock - replace with real data)
  const votingPower = 0n; // Will be fetched from contract
  const tokenBalance = 0n; // LENDX or AAVE balance

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                <span className="text-primary-foreground font-bold text-lg">L</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">LendHub Governance</h1>
                <p className="text-sm text-muted-foreground">Decentralized Autonomous Organization</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {metamaskDetails.currentAccount && (
                <div className="hidden md:flex items-center space-x-3 px-4 py-2 bg-muted rounded-lg">
                  <div className="text-sm">
                    <div className="text-muted-foreground">Voting Power</div>
                    <div className="font-semibold text-foreground">
                      {votingPower > 0n ? `${(Number(votingPower) / 1e18).toLocaleString()} LENDX` : '0 LENDX'}
                    </div>
                  </div>
                </div>
              )}
              <Button onClick={() => metamaskDetails.currentAccount || metamaskDetails.connectWallet?.()}>
                {metamaskDetails.currentAccount 
                  ? `${metamaskDetails.currentAccount.slice(0, 6)}...${metamaskDetails.currentAccount.slice(-4)}`
                  : 'Connect Wallet'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-card border-r border-border p-6">
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </nav>

          {/* Additional Links */}
          <div className="mt-8 pt-8 border-t border-border">
            <div className="text-sm text-muted-foreground mb-3">Resources</div>
            <div className="space-y-2">
              <a
                href="https://snapshot.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <span>📸</span>
                <span>Snapshots</span>
              </a>
              <a
                href="https://forum.aave.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <span>💬</span>
                <span>Forum</span>
              </a>
              <a
                href="#"
                className="flex items-center space-x-2 px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <span>❓</span>
                <span>FAQ</span>
              </a>
              <a
                href="#"
                className="flex items-center space-x-2 px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <span>📚</span>
                <span>Documentation</span>
              </a>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}


import useLendContext from '@/context/useLendContext';
import { Button } from '@/components/ui/Button';

interface GovernanceLayoutProps {
  children: React.ReactNode;
}

export function GovernanceLayout({ children }: GovernanceLayoutProps) {
  const router = useRouter();
  const { metamaskDetails } = useLendContext();
  const currentPath = router.pathname;

  const menuItems = [
    { path: '/governance', label: 'Dashboard', icon: '📊' },
    { path: '/markets', label: 'Markets', icon: '💱' },
    { path: '/governance/proposals', label: 'Governance', icon: '🗳️' },
    { path: '/governance/staking', label: 'Staking', icon: '💰' },
  ];

  const isActive = (path: string) => {
    if (path === '/governance') {
      return currentPath === '/governance';
    }
    return currentPath.startsWith(path);
  };

  // Get voting power (mock - replace with real data)
  const votingPower = 0n; // Will be fetched from contract
  const tokenBalance = 0n; // LENDX or AAVE balance

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                <span className="text-primary-foreground font-bold text-lg">L</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">LendHub Governance</h1>
                <p className="text-sm text-muted-foreground">Decentralized Autonomous Organization</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {metamaskDetails.currentAccount && (
                <div className="hidden md:flex items-center space-x-3 px-4 py-2 bg-muted rounded-lg">
                  <div className="text-sm">
                    <div className="text-muted-foreground">Voting Power</div>
                    <div className="font-semibold text-foreground">
                      {votingPower > 0n ? `${(Number(votingPower) / 1e18).toLocaleString()} LENDX` : '0 LENDX'}
                    </div>
                  </div>
                </div>
              )}
              <Button onClick={() => metamaskDetails.currentAccount || metamaskDetails.connectWallet?.()}>
                {metamaskDetails.currentAccount 
                  ? `${metamaskDetails.currentAccount.slice(0, 6)}...${metamaskDetails.currentAccount.slice(-4)}`
                  : 'Connect Wallet'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-card border-r border-border p-6">
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </nav>

          {/* Additional Links */}
          <div className="mt-8 pt-8 border-t border-border">
            <div className="text-sm text-muted-foreground mb-3">Resources</div>
            <div className="space-y-2">
              <a
                href="https://snapshot.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <span>📸</span>
                <span>Snapshots</span>
              </a>
              <a
                href="https://forum.aave.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <span>💬</span>
                <span>Forum</span>
              </a>
              <a
                href="#"
                className="flex items-center space-x-2 px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <span>❓</span>
                <span>FAQ</span>
              </a>
              <a
                href="#"
                className="flex items-center space-x-2 px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <span>📚</span>
                <span>Documentation</span>
              </a>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}









































