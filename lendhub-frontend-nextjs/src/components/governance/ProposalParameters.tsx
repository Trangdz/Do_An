import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProposalParameter } from '@/types/governance';

interface ProposalParametersProps {
  parameters: ProposalParameter[];
}

export function ProposalParameters({ parameters }: ProposalParametersProps) {
  if (!parameters || parameters.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Specification</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {parameters.map((param, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm font-medium text-muted-foreground">{param.name}</span>
              <span className="text-sm font-semibold text-foreground">{param.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

