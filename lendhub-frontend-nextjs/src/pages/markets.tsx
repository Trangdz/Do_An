import { AppLayout } from '@/components/layout/AppLayout';
import useLendContext from '@/context/useLendContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

export default function MarketsPage() {
  const { userAssets } = useLendContext();

  return (
    <AppLayout>
      <Card className="bg-card/80">
        <CardHeader>
          <CardTitle className="text-foreground">Markets</CardTitle>
          <CardDescription className="text-muted-foreground">Overview of all supported assets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userAssets.map((a: any) => (
              <div key={a.address} className="rounded-lg border border-border p-4 bg-card">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{a.symbol}</div>
                  <div className="text-sm text-muted-foreground">Price: ${a.priceUSD || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}