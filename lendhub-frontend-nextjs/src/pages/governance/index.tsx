import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useGovernance } from '@/hooks/useGovernance';
import { useProposalRights } from '@/hooks/useLENDXToken';
import { useToast } from '@/components/ui/Toast';

export default function GovernanceDashboardPage() {
  const router = useRouter();
  const { proposals: allProposals, loading: proposalsLoading, fetchProposals } = useGovernance();
  const activeProposals = allProposals.filter(p => p.state === 'Active' || p.state === 'Created');
  const recentProposals = allProposals.slice(0, 5);

  // Refresh proposals periodically
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProposals();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [fetchProposals]);
  const { hasProposalRights, balance, minRequired, loading: rightsLoading } = useProposalRights();
  const { showToast } = useToast();

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Aave Governance</h1>
            <p className="text-muted-foreground text-lg">
              LendHub is a fully decentralized, community governed protocol by the LENDX token-holders. 
              LENDX token-holders collectively discuss, propose, and vote on upgrades to the protocol. 
              LENDX token-holders can either vote themselves on new proposals or delegate to an address of choice.
            </p>
          </div>
          {hasProposalRights && (
            <Button
              onClick={() => router.push('/governance/create')}
              className="ml-4"
            >
              + Create Proposal
            </Button>
          )}
        </div>
        
        {/* Proposal Rights Info */}
        {!rightsLoading && !hasProposalRights && (
          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Proposal Rights Required</h3>
                  <p className="text-sm text-muted-foreground">
                    You need at least {minRequired.toLocaleString()} LENDX tokens to create proposals.
                    Your current balance: {balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} LENDX
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Earn LENDX by supplying, borrowing, and using the protocol!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <a
            href="https://snapshot.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <span className="text-2xl">📸</span>
            <span className="font-medium">Snapshots</span>
          </a>
          <a
            href="https://forum.aave.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <span className="text-2xl">💬</span>
            <span className="font-medium">Forum</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <span className="text-2xl">❓</span>
            <span className="font-medium">FAQ</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <span className="text-2xl">📚</span>
            <span className="font-medium">Documentation</span>
          </a>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Proposals</CardTitle>
              <CardDescription>Currently open for voting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">{activeProposals.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Proposals</CardTitle>
              <CardDescription>All time proposals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">{allProposals.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Executed</CardTitle>
              <CardDescription>Successfully executed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">
                {allProposals.filter(p => p.state === 'Executed').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Proposals */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Proposals</CardTitle>
            <CardDescription>Latest governance proposals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentProposals.map((proposal) => (
                <a
                  key={proposal.id}
                  href={`/governance/proposals/${proposal.id}`}
                  className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          proposal.state === 'Executed' || proposal.state === 'Passed'
                            ? 'bg-green-500/20 text-green-600'
                            : proposal.state === 'Created'
                            ? 'bg-gray-500/20 text-gray-600'
                            : 'bg-blue-500/20 text-blue-600'
                        }`}>
                          {proposal.state}
                        </span>
                        <h3 className="font-semibold text-foreground">{proposal.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{proposal.summary}</p>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-sm text-muted-foreground">
                        {new Date(proposal.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
            <div className="mt-6 text-center">
              <a
                href="/governance/proposals"
                className="text-primary hover:underline font-medium"
              >
                View All Proposals →
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}






















