import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useGovernance } from '@/hooks/useGovernance';
import { useToast } from '@/components/ui/Toast';
import useLendContext from '@/context/useLendContext';
import { ProposalTimeline } from '@/components/governance/ProposalTimeline';
import { ProposalParameters } from '@/components/governance/ProposalParameters';
import { VotingResults } from '@/components/governance/VotingResults';

// Voting Countdown Component
function VotingCountdown({ votingEnd }: { votingEnd: string }) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      const end = new Date(votingEnd).getTime();
      const now = new Date().getTime();
      const difference = end - now;

      if (difference <= 0) {
        setTimeLeft('Voting ended');
        return;
      }

      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft(`${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [votingEnd]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Time remaining:</span>
      <span className="text-sm font-semibold text-blue-600">{timeLeft}</span>
    </div>
  );
}

export default function ProposalDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useToast();
  const { metamaskDetails } = useLendContext();
  const [isVoting, setIsVoting] = useState(false);
  const { proposals, castVote, hasUserVoted, getUserVote, executeProposal, fetchProposals } = useGovernance();

  const proposal = id ? proposals.find(p => p.id === id) : null;
  const [userVoted, setUserVoted] = useState<boolean | null>(null);
  const [userVoteSupport, setUserVoteSupport] = useState<boolean | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isUpdatingState, setIsUpdatingState] = useState(false);

  // Check if user has voted
  useEffect(() => {
    if (id && metamaskDetails.currentAccount) {
      hasUserVoted(id as string, metamaskDetails.currentAccount).then(voted => {
        setUserVoted(voted);
        if (voted) {
          getUserVote(id as string, metamaskDetails.currentAccount).then(support => {
            setUserVoteSupport(support);
          });
        }
      });
    }
  }, [id, metamaskDetails.currentAccount, hasUserVoted, getUserVote]);

  // Auto-update proposal state when voting period ends
  useEffect(() => {
    if (!proposal || !id) return;

    const checkAndUpdateState = async () => {
      // Check if voting period has ended but state is still Active
      if (proposal.votingEnd && proposal.state === 'Active') {
        const votingEndTime = new Date(proposal.votingEnd).getTime();
        const now = new Date().getTime();
        
        if (now >= votingEndTime) {
          // Voting period has ended - refresh proposals to get auto-calculated state
          // State is now calculated client-side in fetchProposals, so no transaction needed
          try {
            setIsUpdatingState(true);
            // Just refresh proposals - state will be auto-calculated
            await fetchProposals();
          } catch (error: any) {
            console.error('Error refreshing proposals:', error);
          } finally {
            setIsUpdatingState(false);
          }
        }
      }
    };

    checkAndUpdateState();
    
    // Check every 5 seconds if voting period has ended
    const interval = setInterval(checkAndUpdateState, 5000);
    
    return () => clearInterval(interval);
  }, [proposal, id, fetchProposals]);

  const handleVote = async (support: boolean) => {
    if (!metamaskDetails.currentAccount) {
      showToast({
        type: 'error',
        title: 'Wallet Not Connected',
        message: 'Please connect your wallet first'
      });
      return;
    }

    if (!id) return;

    setIsVoting(true);
    try {
      const tx = await castVote(id as string, support);
      showToast({
        type: 'success',
        title: 'Vote Submitted',
        message: `Vote ${support ? 'YAE' : 'NAY'} submitted successfully!`,
        hash: tx.hash
      });
      setUserVoted(true);
      setUserVoteSupport(support);
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Vote Failed',
        message: error.message || 'Failed to vote'
      });
    } finally {
      setIsVoting(false);
    }
  };

  const handleExecute = async () => {
    if (!id) return;

    setIsExecuting(true);
    try {
      // Refresh proposals first to get the latest state (auto-calculated client-side)
      await fetchProposals();
      
      // Wait a bit for state to refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Then execute
      const tx = await executeProposal(id as string);
      showToast({
        type: 'success',
        title: 'Proposal Executed',
        message: 'Proposal has been executed successfully!',
        hash: tx.hash
      });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Execution Failed',
        message: error.message || 'Failed to execute proposal'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  if (!proposal) {
    return (
      <AppLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Proposal not found</p>
            <Button onClick={() => router.push('/governance/proposals')} className="mt-4">
              Back to Proposals
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const formatVotes = (votes: bigint) => {
    const num = Number(votes) / 1e18;
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const forPercentage = totalVotes > 0n 
    ? (Number(proposal.votesFor) / Number(totalVotes)) * 100 
    : 0;
  const againstPercentage = totalVotes > 0n 
    ? (Number(proposal.votesAgainst) / Number(totalVotes)) * 100 
    : 0;

  const canVote = proposal.state === 'Active' || proposal.state === 'Created';
  const hasVoted = userVoted === true;
  const canExecute = proposal.state === 'Succeeded' && !proposal.executed;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.push('/governance/proposals')}
          className="mb-4"
        >
          ← Go Back
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Badge className={
                proposal.state === 'Executed' || proposal.state === 'Passed'
                  ? 'bg-green-500/20 text-green-600'
                  : proposal.state === 'Created'
                  ? 'bg-gray-500/20 text-gray-600'
                  : 'bg-blue-500/20 text-blue-600'
              }>
                {proposal.state}
              </Badge>
              <h1 className="text-4xl font-bold text-foreground">{proposal.title}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            {proposal.ipfsHash && (
              <Button variant="outline" size="sm">
                Raw-IPFS
              </Button>
            )}
            <Button variant="outline" size="sm">
              Share on Twitter
            </Button>
            <Button variant="outline" size="sm">
              Share on Lens
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Simple Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Simple Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground">{proposal.summary}</p>
              </CardContent>
            </Card>

            {/* Full Description */}
            {proposal.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-line">{proposal.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Motivation */}
            {proposal.motivation && (
              <Card>
                <CardHeader>
                  <CardTitle>Motivation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-line">{proposal.motivation}</p>
                </CardContent>
              </Card>
            )}

            {/* Specification */}
            {proposal.parameters && proposal.parameters.length > 0 && (
              <ProposalParameters parameters={proposal.parameters} />
            )}

            {/* References */}
            <Card>
              <CardHeader>
                <CardTitle>References</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <a
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-2"
                  >
                    Implementation: LendHubV3
                    <span>↗</span>
                  </a>
                  <a
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-2"
                  >
                    Tests: LendHubV3 Snapshot
                    <span>↗</span>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Voting Info */}
          <div className="space-y-6">
            {/* Your Voting Info */}
            <Card>
              <CardHeader>
                <CardTitle>Your voting info</CardTitle>
              </CardHeader>
              <CardContent>
                {canVote ? (
                  <>
                    {hasVoted ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-yellow-600">
                          <span>⚠️</span>
                          <span className="font-medium">You already voted on this proposal</span>
                        </div>
                        {userVoteSupport !== null && (
                          <p className="text-sm text-muted-foreground">
                            Your vote: <span className="font-semibold">{userVoteSupport ? 'YAE' : 'NAY'}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-red-600">
                          <span>⚠️</span>
                          <span className="font-medium">Voting is on</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          You did not participate in this proposal.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleVote(true)}
                            disabled={isVoting || !metamaskDetails.currentAccount}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            {isVoting ? 'Voting...' : 'Vote YAE'}
                          </Button>
                          <Button
                            onClick={() => handleVote(false)}
                            disabled={isVoting || !metamaskDetails.currentAccount}
                            variant="destructive"
                            className="flex-1"
                          >
                            {isVoting ? 'Voting...' : 'Vote NAY'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : canExecute ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <span>✅</span>
                      <span className="font-medium">Proposal Succeeded</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This proposal has passed and is ready to be executed.
                    </p>
                    <Button
                      onClick={handleExecute}
                      disabled={isExecuting || !metamaskDetails.currentAccount}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {isExecuting ? 'Executing...' : 'Execute Proposal'}
                    </Button>
                  </div>
                ) : proposal.state === 'Active' && proposal.votingEnd && new Date(proposal.votingEnd).getTime() < new Date().getTime() ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-yellow-600">
                      <span>⏰</span>
                      <span className="font-medium">Voting Period Ended</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      The voting period has ended. Click below to update the proposal state.
                    </p>
                    <Button
                      onClick={async () => {
                        if (!id) return;
                        setIsUpdatingState(true);
                        try {
                          // Just refresh proposals - state will be auto-calculated client-side
                          await fetchProposals();
                          showToast({
                            type: 'success',
                            title: 'Refreshed',
                            message: 'Proposal state has been refreshed'
                          });
                        } catch (error: any) {
                          showToast({
                            type: 'error',
                            title: 'Refresh Failed',
                            message: error.message || 'Failed to refresh proposal state'
                          });
                        } finally {
                          setIsUpdatingState(false);
                        }
                      }}
                      disabled={isUpdatingState}
                      className="w-full"
                      variant="outline"
                    >
                      {isUpdatingState ? 'Refreshing...' : 'Refresh State'}
                    </Button>
                  </div>
                ) : proposal.state === 'Executed' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <span>✅</span>
                      <span className="font-medium">Proposal Executed</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This proposal has been executed successfully.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Voting has ended for this proposal.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Voting Results */}
            <VotingResults
              votesFor={proposal.votesFor}
              votesAgainst={proposal.votesAgainst}
            />

            {/* Proposal Details */}
            <Card>
              <CardHeader>
                <CardTitle>Proposal details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">State</span>
                    <Badge className={
                      proposal.state === 'Executed' || proposal.state === 'Passed'
                        ? 'bg-green-500/20 text-green-600'
                        : proposal.state === 'Active' || proposal.state === 'Created'
                        ? 'bg-blue-500/20 text-blue-600'
                        : 'bg-gray-500/20 text-gray-600'
                    }>
                      {proposal.state}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Created</span>
                    <span className="text-sm text-foreground">
                      {new Date(proposal.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {proposal.votingEnd && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Voting Ends</span>
                      <span className="text-sm text-foreground">
                        {new Date(proposal.votingEnd).toLocaleString()}
                      </span>
                    </div>
                    {proposal.state === 'Active' && (
                      <div className="mt-2 p-2 bg-blue-500/10 rounded-md">
                        <VotingCountdown votingEnd={proposal.votingEnd} />
                      </div>
                    )}
                  </div>
                )}

                {proposal.proposer && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Proposer</span>
                      <span className="text-sm text-foreground font-mono">
                        {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
                      </span>
                    </div>
                  </div>
                )}

                {proposal.executed && proposal.executionTime && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Executed</span>
                      <span className="text-sm text-foreground">
                        {new Date(proposal.executionTime).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <ProposalTimeline proposal={proposal} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}












