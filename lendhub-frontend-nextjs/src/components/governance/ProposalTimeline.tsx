import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Proposal } from '@/types/governance';

interface ProposalTimelineProps {
  proposal: Proposal;
}

export function ProposalTimeline({ proposal }: ProposalTimelineProps) {
  const getStateColor = (state: string) => {
    switch (state) {
      case 'Executed':
      case 'Passed':
        return 'text-green-600';
      case 'Active':
        return 'text-blue-600';
      case 'Created':
        return 'text-gray-600';
      case 'Defeated':
      case 'Canceled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const isVotingEnded = proposal.votingEnd 
    ? new Date(proposal.votingEnd).getTime() < new Date().getTime()
    : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Created */}
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-600 mt-2"></div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Created</p>
              <p className="text-sm text-muted-foreground">
                {new Date(proposal.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          
          {/* Voting Period */}
          {(proposal.state === 'Active' || proposal.state === 'Created' || proposal.votingEnd) && (
            <div className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 ${isVotingEnded ? 'bg-gray-600' : 'bg-green-600'}`}></div>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {isVotingEnded ? 'Voting Ended' : 'Voting Period'}
                </p>
                {proposal.votingEnd ? (
                  <p className="text-sm text-muted-foreground">
                    {new Date(proposal.votingEnd).toLocaleString()}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Voting period active</p>
                )}
              </div>
            </div>
          )}

          {/* Succeeded/Defeated */}
          {(proposal.state === 'Succeeded' || proposal.state === 'Defeated') && (
            <div className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 ${proposal.state === 'Succeeded' ? 'bg-green-600' : 'bg-red-600'}`}></div>
              <div className="flex-1">
                <p className={`font-medium ${getStateColor(proposal.state)}`}>
                  {proposal.state}
                </p>
                <p className="text-sm text-muted-foreground">
                  {proposal.state === 'Succeeded' 
                    ? 'Proposal passed and ready for execution'
                    : 'Proposal did not pass'}
                </p>
              </div>
            </div>
          )}
          
          {/* Executed */}
          {proposal.state === 'Executed' && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-600 mt-2"></div>
              <div className="flex-1">
                <p className="font-medium text-green-600">Executed</p>
                {proposal.executionTime ? (
                  <p className="text-sm text-muted-foreground">
                    {new Date(proposal.executionTime).toLocaleString()}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Proposal executed successfully</p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

