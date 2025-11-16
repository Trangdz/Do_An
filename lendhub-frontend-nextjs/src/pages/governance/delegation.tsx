import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import useLendContext from '@/context/useLendContext';

export default function DelegationPage() {
  const { metamaskDetails } = useLendContext();
  const { showToast } = useToast();
  const [delegateAddress, setDelegateAddress] = useState('');
  const [isDelegating, setIsDelegating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  // Mock data - replace with real contract calls
  const userInfo = {
    address: metamaskDetails.currentAccount || '0x0000...0000',
    votingPower: 0n,
    propositionPower: 0n,
    tokenBalance: 0n, // LENDX balance
    delegatedTo: null as string | null,
  };

  const handleDelegate = async () => {
    if (!metamaskDetails.currentAccount) {
      showToast('Please connect your wallet first', 'error');
      return;
    }

    if (!delegateAddress || !/^0x[a-fA-F0-9]{40}$/.test(delegateAddress)) {
      showToast('Please enter a valid Ethereum address', 'error');
      return;
    }

    setIsDelegating(true);
    try {
      // TODO: Implement actual delegation logic
      // const governor = new ethers.Contract(GOVERNOR_ADDRESS, GOVERNOR_ABI, signer);
      // const tx = await governor.delegate(delegateAddress);
      // await tx.wait();
      
      // Mock for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      showToast('Delegation successful!', 'success');
      setDelegateAddress('');
    } catch (error: any) {
      showToast(`Failed to delegate: ${error.message}`, 'error');
    } finally {
      setIsDelegating(false);
    }
  };

  const handleRevoke = async () => {
    if (!metamaskDetails.currentAccount) {
      showToast('Please connect your wallet first', 'error');
      return;
    }

    setIsRevoking(true);
    try {
      // TODO: Implement actual revoke logic
      // const governor = new ethers.Contract(GOVERNOR_ADDRESS, GOVERNOR_ABI, signer);
      // const tx = await governor.delegate(metamaskDetails.currentAccount); // Delegate to self
      // await tx.wait();
      
      // Mock for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      showToast('Delegation revoked successfully!', 'success');
    } catch (error: any) {
      showToast(`Failed to revoke: ${error.message}`, 'error');
    } finally {
      setIsRevoking(false);
    }
  };

  const formatBalance = (balance: bigint) => {
    const num = Number(balance) / 1e18;
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Delegation</h1>
          <p className="text-muted-foreground">
            Delegate your voting and proposition powers to another address. You will not be sending any tokens, 
            only the rights to vote and propose changes to the protocol.
          </p>
        </div>

        {/* Your Info */}
        <Card>
          <CardHeader>
            <CardTitle>Your info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Wallet Address</div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-purple-500"></div>
                  <span className="font-mono text-sm text-foreground">
                    {userInfo.address}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(userInfo.address);
                      showToast('Address copied!', 'success');
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  Voting power
                  <span className="text-xs">ℹ️</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {formatBalance(userInfo.votingPower)} LENDX
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  Proposition power
                  <span className="text-xs">ℹ️</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {formatBalance(userInfo.propositionPower)} LENDX
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delegated Power */}
        <Card>
          <CardHeader>
            <CardTitle>Delegated power</CardTitle>
            <CardDescription>
              Use your LENDX, stkLENDX, or aLENDX balance to delegate your voting and proposition powers. 
              You will not be sending any tokens, only the rights to vote and propose changes to the protocol. 
              You can re-delegate or revoke power to self at any time.{' '}
              <a href="#" className="text-primary hover:underline">Learn more</a>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {userInfo.tokenBalance === 0n ? (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  You have no LENDX/stkLENDX/aLENDX balance to delegate.
                </p>
                <Button disabled className="mt-4">
                  Set up delegation
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {userInfo.delegatedTo ? (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="text-sm font-medium text-yellow-600 mb-2">
                      Currently delegated to:
                    </div>
                    <div className="font-mono text-sm text-foreground mb-4">
                      {userInfo.delegatedTo}
                    </div>
                    <Button
                      onClick={handleRevoke}
                      disabled={isRevoking}
                      variant="outline"
                      className="w-full"
                    >
                      {isRevoking ? 'Revoking...' : 'Revoke delegation'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Delegate to address
                      </label>
                      <Input
                        type="text"
                        placeholder="0x..."
                        value={delegateAddress}
                        onChange={(e) => setDelegateAddress(e.target.value)}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Enter the Ethereum address you want to delegate your voting power to.
                      </p>
                    </div>
                    <Button
                      onClick={handleDelegate}
                      disabled={isDelegating || !delegateAddress}
                      className="w-full"
                    >
                      {isDelegating ? 'Delegating...' : 'Set up delegation'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked Addresses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Linked addresses</CardTitle>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </div>
            <CardDescription>
              Representative smart contract wallet (ie. Safe) addresses on other chains.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-600">🔗</span>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Polygon POS</div>
                    <div className="text-sm text-muted-foreground">Not connected</div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  + Connect
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="text-red-600">🔗</span>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Avalanche</div>
                    <div className="text-sm text-muted-foreground">Connected</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <Button variant="outline" size="sm">
                    + Connect
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import useLendContext from '@/context/useLendContext';

export default function DelegationPage() {
  const { metamaskDetails } = useLendContext();
  const { showToast } = useToast();
  const [delegateAddress, setDelegateAddress] = useState('');
  const [isDelegating, setIsDelegating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  // Mock data - replace with real contract calls
  const userInfo = {
    address: metamaskDetails.currentAccount || '0x0000...0000',
    votingPower: 0n,
    propositionPower: 0n,
    tokenBalance: 0n, // LENDX balance
    delegatedTo: null as string | null,
  };

  const handleDelegate = async () => {
    if (!metamaskDetails.currentAccount) {
      showToast('Please connect your wallet first', 'error');
      return;
    }

    if (!delegateAddress || !/^0x[a-fA-F0-9]{40}$/.test(delegateAddress)) {
      showToast('Please enter a valid Ethereum address', 'error');
      return;
    }

    setIsDelegating(true);
    try {
      // TODO: Implement actual delegation logic
      // const governor = new ethers.Contract(GOVERNOR_ADDRESS, GOVERNOR_ABI, signer);
      // const tx = await governor.delegate(delegateAddress);
      // await tx.wait();
      
      // Mock for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      showToast('Delegation successful!', 'success');
      setDelegateAddress('');
    } catch (error: any) {
      showToast(`Failed to delegate: ${error.message}`, 'error');
    } finally {
      setIsDelegating(false);
    }
  };

  const handleRevoke = async () => {
    if (!metamaskDetails.currentAccount) {
      showToast('Please connect your wallet first', 'error');
      return;
    }

    setIsRevoking(true);
    try {
      // TODO: Implement actual revoke logic
      // const governor = new ethers.Contract(GOVERNOR_ADDRESS, GOVERNOR_ABI, signer);
      // const tx = await governor.delegate(metamaskDetails.currentAccount); // Delegate to self
      // await tx.wait();
      
      // Mock for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      showToast('Delegation revoked successfully!', 'success');
    } catch (error: any) {
      showToast(`Failed to revoke: ${error.message}`, 'error');
    } finally {
      setIsRevoking(false);
    }
  };

  const formatBalance = (balance: bigint) => {
    const num = Number(balance) / 1e18;
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Delegation</h1>
          <p className="text-muted-foreground">
            Delegate your voting and proposition powers to another address. You will not be sending any tokens, 
            only the rights to vote and propose changes to the protocol.
          </p>
        </div>

        {/* Your Info */}
        <Card>
          <CardHeader>
            <CardTitle>Your info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Wallet Address</div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-purple-500"></div>
                  <span className="font-mono text-sm text-foreground">
                    {userInfo.address}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(userInfo.address);
                      showToast('Address copied!', 'success');
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  Voting power
                  <span className="text-xs">ℹ️</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {formatBalance(userInfo.votingPower)} LENDX
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  Proposition power
                  <span className="text-xs">ℹ️</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {formatBalance(userInfo.propositionPower)} LENDX
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delegated Power */}
        <Card>
          <CardHeader>
            <CardTitle>Delegated power</CardTitle>
            <CardDescription>
              Use your LENDX, stkLENDX, or aLENDX balance to delegate your voting and proposition powers. 
              You will not be sending any tokens, only the rights to vote and propose changes to the protocol. 
              You can re-delegate or revoke power to self at any time.{' '}
              <a href="#" className="text-primary hover:underline">Learn more</a>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {userInfo.tokenBalance === 0n ? (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  You have no LENDX/stkLENDX/aLENDX balance to delegate.
                </p>
                <Button disabled className="mt-4">
                  Set up delegation
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {userInfo.delegatedTo ? (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="text-sm font-medium text-yellow-600 mb-2">
                      Currently delegated to:
                    </div>
                    <div className="font-mono text-sm text-foreground mb-4">
                      {userInfo.delegatedTo}
                    </div>
                    <Button
                      onClick={handleRevoke}
                      disabled={isRevoking}
                      variant="outline"
                      className="w-full"
                    >
                      {isRevoking ? 'Revoking...' : 'Revoke delegation'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Delegate to address
                      </label>
                      <Input
                        type="text"
                        placeholder="0x..."
                        value={delegateAddress}
                        onChange={(e) => setDelegateAddress(e.target.value)}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Enter the Ethereum address you want to delegate your voting power to.
                      </p>
                    </div>
                    <Button
                      onClick={handleDelegate}
                      disabled={isDelegating || !delegateAddress}
                      className="w-full"
                    >
                      {isDelegating ? 'Delegating...' : 'Set up delegation'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked Addresses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Linked addresses</CardTitle>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </div>
            <CardDescription>
              Representative smart contract wallet (ie. Safe) addresses on other chains.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-600">🔗</span>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Polygon POS</div>
                    <div className="text-sm text-muted-foreground">Not connected</div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  + Connect
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="text-red-600">🔗</span>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Avalanche</div>
                    <div className="text-sm text-muted-foreground">Connected</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <Button variant="outline" size="sm">
                    + Connect
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}





