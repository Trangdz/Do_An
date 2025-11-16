import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface VotingResultsProps {
  votesFor: bigint;
  votesAgainst: bigint;
}

export function VotingResults({ votesFor, votesAgainst }: VotingResultsProps) {
  const formatVotes = (votes: bigint) => {
    const num = Number(votes) / 1e18;
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const totalVotes = votesFor + votesAgainst;
  const forPercentage = totalVotes > 0n 
    ? (Number(votesFor) / Number(totalVotes)) * 100 
    : 0;
  const againstPercentage = totalVotes > 0n 
    ? (Number(votesAgainst) / Number(totalVotes)) * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voting Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-600">For</span>
            <span className="text-sm font-medium">{formatVotes(votesFor)} LENDX</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: `${forPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{forPercentage.toFixed(2)}%</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-600">Against</span>
            <span className="text-sm font-medium">{formatVotes(votesAgainst)} LENDX</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-red-600 h-2 rounded-full transition-all"
              style={{ width: `${againstPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{againstPercentage.toFixed(2)}%</p>
        </div>

        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Votes</span>
            <span className="text-sm font-medium">{formatVotes(totalVotes)} LENDX</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

