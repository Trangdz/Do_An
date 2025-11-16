import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useGovernance } from '@/hooks/useGovernance';
import { ProposalState } from '@/types/governance';
import { useProposalRights } from '@/hooks/useLENDXToken';
import { useToast } from '@/components/ui/Toast';

export default function GovernanceProposalsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<ProposalState | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { hasProposalRights, balance, minRequired, loading: rightsLoading } = useProposalRights();
  const { showToast } = useToast();
  const { proposals: allProposals, loading: proposalsLoading, fetchProposals } = useGovernance();

  // Refresh proposals periodically
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProposals();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [fetchProposals]);

  const filteredProposals = useMemo(() => {
    let proposals = filter === 'All' ? allProposals : allProposals.filter(p => p.state === filter);
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      proposals = proposals.filter(
        p => p.title.toLowerCase().includes(query) || 
             p.description.toLowerCase().includes(query)
      );
    }
    
    return proposals;
  }, [filter, searchQuery, allProposals]);

  const getStateColor = (state: ProposalState) => {
    switch (state) {
      case 'Executed':
      case 'Passed':
        return 'bg-green-500/20 text-green-600';
      case 'Created':
        return 'bg-gray-500/20 text-gray-600';
      case 'Active':
        return 'bg-blue-500/20 text-blue-600';
      case 'Defeated':
      case 'Canceled':
        return 'bg-red-500/20 text-red-600';
      default:
        return 'bg-yellow-500/20 text-yellow-600';
    }
  };

  const formatVotes = (votes: bigint) => {
    const num = Number(votes) / 1e18;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const getVotePercentage = (forVotes: bigint, againstVotes: bigint) => {
    const total = forVotes + againstVotes;
    if (total === 0n) return { for: 0, against: 0 };
    const forPct = (Number(forVotes) / Number(total)) * 100;
    const againstPct = (Number(againstVotes) / Number(total)) * 100;
    return { for: forPct, against: againstPct };
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Proposals</h1>
            <p className="text-muted-foreground">View and vote on governance proposals</p>
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

        {/* Filter and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                🔍
              </span>
              <Input
                type="text"
                placeholder="Search proposals"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as ProposalState | 'All')}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="All">All proposals</option>
              <option value="Created">Created</option>
              <option value="Active">Active</option>
              <option value="Passed">Passed</option>
              <option value="Executed">Executed</option>
              <option value="Defeated">Defeated</option>
              <option value="Canceled">Canceled</option>
            </select>
          </div>
        </div>

        {/* Proposals List */}
        <div className="space-y-4">
          {filteredProposals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No proposals found</p>
              </CardContent>
            </Card>
          ) : (
            filteredProposals.map((proposal) => {
              const votePercentages = getVotePercentage(proposal.votesFor, proposal.votesAgainst);
              
              return (
                <a
                  key={proposal.id}
                  href={`/governance/proposals/${proposal.id}`}
                  className="block"
                >
                  <Card className="hover:bg-accent transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Badge className={getStateColor(proposal.state)}>
                            {proposal.state}
                          </Badge>
                          <h3 className="text-xl font-semibold text-foreground">
                            {proposal.title}
                          </h3>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(proposal.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Voting Results */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-green-600">YAE</span>
                            <span className="text-foreground">
                              {formatVotes(proposal.votesFor)} ({votePercentages.for.toFixed(2)}%)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-red-600">NAY</span>
                            <span className="text-foreground">
                              {formatVotes(proposal.votesAgainst)} ({votePercentages.against.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                        
                        {/* Progress Bars */}
                        <div className="flex h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="bg-green-500 h-full transition-all"
                            style={{ width: `${votePercentages.for}%` }}
                          />
                          <div
                            className="bg-red-500 h-full transition-all"
                            style={{ width: `${votePercentages.against}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}


























