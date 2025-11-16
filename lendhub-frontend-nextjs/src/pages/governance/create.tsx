import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useProposalRights } from '@/hooks/useLENDXToken';
import { useToast } from '@/components/ui/Toast';
import { ProposalType, ProposalParameter } from '@/types/governance';
import { useGovernance } from '@/hooks/useGovernance';
import useLendContext from '@/context/useLendContext';
import { useReserveData } from '@/hooks/useReserveData';

type ProposalActionType = 
  | 'add_asset'
  | 'remove_asset'
  | 'change_ltv'
  | 'change_liquidation_threshold'
  | 'change_liquidation_bonus'
  | 'change_supply_cap'
  | 'change_borrow_cap'
  | 'change_interest_rate'
  | 'change_reserve_factor'
  | 'pause_asset'
  | 'unpause_asset'
  | 'emergency_pause'
  | 'custom';

export default function CreateProposalPage() {
  const router = useRouter();
  const { hasProposalRights, balance, minRequired, loading: rightsLoading } = useProposalRights();
  const { showToast } = useToast();
  const { createProposal } = useGovernance();
  const { metamaskDetails } = useLendContext();

  const [proposalType, setProposalType] = useState<ProposalActionType>('change_ltv');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [motivation, setMotivation] = useState('');
  
  // Asset selection
  const [selectedAsset, setSelectedAsset] = useState('WETH');
  
  // Parameters based on proposal type
  const [parameters, setParameters] = useState<ProposalParameter[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available assets
  const assets = ['WETH', 'DAI', 'USDC', 'LINK', 'USDT', 'WBTC', 'UNI'];

  // Fetch reserve data for selected asset
  const { reserveData, loading: reserveLoading } = useReserveData(selectedAsset);

  // Update parameters based on proposal type
  const updateParametersForType = (type: ProposalActionType, reserveData?: any) => {
    const currentLTV = reserveData ? (reserveData.ltvBps / 100).toFixed(2) : '75';
    const currentThreshold = reserveData ? (reserveData.liqThresholdBps / 100).toFixed(2) : '80';
    const currentBonus = reserveData ? (reserveData.liqBonusBps / 100).toFixed(2) : '5';
    const currentReserveFactor = reserveData ? (reserveData.reserveFactorBps / 100).toFixed(2) : '10';

    switch (type) {
      case 'add_asset':
        setParameters([
          { name: 'Asset Address', value: '' },
          { name: 'LTV', value: '75' },
          { name: 'Liquidation Threshold', value: '80' },
          { name: 'Liquidation Bonus', value: '5' },
          { name: 'Supply Cap', value: '10000000' },
          { name: 'Borrow Cap', value: '7500000' },
        ]);
        break;
      case 'remove_asset':
        setParameters([]); // Asset is selected above, no need to show in parameters
        break;
      case 'change_ltv':
        setParameters([
          { name: 'Current LTV (%)', value: currentLTV, disabled: true },
          { name: 'Proposed LTV (%)', value: currentLTV },
        ]);
        break;
      case 'change_liquidation_threshold':
        setParameters([
          { name: 'Current Threshold (%)', value: currentThreshold, disabled: true },
          { name: 'Proposed Threshold (%)', value: currentThreshold },
        ]);
        break;
      case 'change_liquidation_bonus':
        setParameters([
          { name: 'Current Bonus (%)', value: currentBonus, disabled: true },
          { name: 'Proposed Bonus (%)', value: currentBonus },
        ]);
        break;
      case 'change_supply_cap':
        setParameters([
          { name: 'Current Supply Cap', value: '30000000' },
          { name: 'Proposed Supply Cap', value: '50000000' },
        ]);
        break;
      case 'change_borrow_cap':
        setParameters([
          { name: 'Current Borrow Cap', value: '24000000' },
          { name: 'Proposed Borrow Cap', value: '40000000' },
        ]);
        break;
      case 'change_interest_rate':
        setParameters([
          { name: 'Base Rate (%)', value: '2' },
          { name: 'Optimal Utilization (%)', value: '80' },
          { name: 'Slope 1 (%)', value: '5' },
          { name: 'Slope 2 (%)', value: '100' },
        ]);
        break;
      case 'change_reserve_factor':
        setParameters([
          { name: 'Current Reserve Factor (%)', value: currentReserveFactor, disabled: true },
          { name: 'Proposed Reserve Factor (%)', value: currentReserveFactor },
        ]);
        break;
      case 'pause_asset':
      case 'unpause_asset':
        setParameters([]); // Asset is selected above, no need to show in parameters
        break;
      case 'emergency_pause':
        setParameters([
          { name: 'Action', value: 'Pause all protocol operations' },
        ]);
        break;
      default:
        setParameters([]);
    }
  };

  // Update parameters when reserve data or proposal type changes
  useEffect(() => {
    if (proposalType && (proposalType === 'change_ltv' || proposalType === 'change_liquidation_threshold' || proposalType === 'change_liquidation_bonus' || proposalType === 'change_reserve_factor')) {
      updateParametersForType(proposalType, reserveData);
    }
  }, [reserveData, selectedAsset, proposalType]);

  const handleProposalTypeChange = (type: ProposalActionType) => {
    setProposalType(type);
    updateParametersForType(type, reserveData);
  };

  const handleParameterChange = (index: number, value: string) => {
    const newParameters = [...parameters];
    newParameters[index].value = value;
    setParameters(newParameters);
  };

  const handleSubmit = async () => {
    if (!hasProposalRights) {
      showToast({
        type: 'error',
        title: 'Insufficient Rights',
        message: `You need at least ${minRequired.toLocaleString()} LENDX to create proposals`
      });
      return;
    }

    if (!title.trim() || !summary.trim() || !description.trim()) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields'
      });
      return;
    }

    // Check wallet connection
    if (!metamaskDetails.currentAccount || !metamaskDetails.signer) {
      showToast({
        type: 'error',
        title: 'Wallet Not Connected',
        message: 'Please connect your wallet to create a proposal'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Build parameters array - include selected asset if applicable
      const finalParameters: ProposalParameter[] = [];
      
      // Add asset parameter if not add_asset or emergency_pause
      if (proposalType !== 'add_asset' && proposalType !== 'emergency_pause' && proposalType !== 'custom') {
        finalParameters.push({ name: 'Asset', value: selectedAsset });
      }
      
      // Add other parameters
      finalParameters.push(...parameters.filter(p => p.value.trim() !== ''));

      // Format parameters into description if needed
      const parametersText = finalParameters.length > 0
        ? `\n\nParameters:\n${finalParameters.map(p => `- ${p.name}: ${p.value}`).join('\n')}`
        : '';

      const fullDescription = description + parametersText;
      const ipfsHash = `Qm${Math.random().toString(36).substring(7)}...`; // Placeholder for IPFS

      // Create proposal on-chain
      const { tx, proposalId } = await createProposal(
        title,
        summary,
        fullDescription,
        motivation || '',
        ipfsHash
      );
      
      showToast({
        type: 'success',
        title: 'Proposal Created',
        message: `Proposal #${proposalId} created successfully!`,
        hash: tx.hash
      });

      // Redirect to proposals page
      setTimeout(() => {
        router.push('/governance/proposals');
      }, 1500);
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to create proposal'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check wallet connection
  const isWalletConnected = metamaskDetails.currentAccount && metamaskDetails.signer;

  // Redirect if no proposal rights
  if (!rightsLoading && !hasProposalRights) {
    return (
      <AppLayout>
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">⚠️ Proposal Rights Required</h2>
              <p className="text-muted-foreground mb-4">
                You need at least {minRequired.toLocaleString()} LENDX tokens to create proposals.
              </p>
              <p className="text-muted-foreground mb-6">
                Your current balance: {balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} LENDX
              </p>
              <Button onClick={() => router.push('/governance')}>
                Back to Governance
              </Button>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  // Show wallet connection warning
  if (!isWalletConnected) {
    return (
      <AppLayout>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">🔌 Wallet Not Connected</h2>
              <p className="text-muted-foreground mb-4">
                Please connect your wallet to create a proposal.
              </p>
              <p className="text-muted-foreground mb-6">
                Proposals are created on-chain and require a connected wallet to sign transactions.
              </p>
              <Button onClick={() => router.push('/dashboard')}>
                Go to Dashboard to Connect Wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-4"
          >
            ← Back
          </Button>
          <h1 className="text-4xl font-bold text-foreground mb-2">Create Proposal</h1>
          <p className="text-muted-foreground">
            Create a new governance proposal to suggest changes to the protocol
          </p>
        </div>

        {/* Proposal Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Proposal Type</CardTitle>
            <CardDescription>Select what you want to propose</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ProposalTypeButton
                type="add_asset"
                label="Add New Asset"
                description="Add a new asset as collateral"
                selected={proposalType === 'add_asset'}
                onClick={() => handleProposalTypeChange('add_asset')}
              />
              <ProposalTypeButton
                type="remove_asset"
                label="Remove Asset"
                description="Remove an asset from the protocol"
                selected={proposalType === 'remove_asset'}
                onClick={() => handleProposalTypeChange('remove_asset')}
              />
              <ProposalTypeButton
                type="change_ltv"
                label="Change LTV"
                description="Modify Loan-to-Value ratio"
                selected={proposalType === 'change_ltv'}
                onClick={() => handleProposalTypeChange('change_ltv')}
              />
              <ProposalTypeButton
                type="change_liquidation_threshold"
                label="Change Liquidation Threshold"
                description="Modify liquidation threshold"
                selected={proposalType === 'change_liquidation_threshold'}
                onClick={() => handleProposalTypeChange('change_liquidation_threshold')}
              />
              <ProposalTypeButton
                type="change_liquidation_bonus"
                label="Change Liquidation Bonus"
                description="Modify liquidation bonus"
                selected={proposalType === 'change_liquidation_bonus'}
                onClick={() => handleProposalTypeChange('change_liquidation_bonus')}
              />
              <ProposalTypeButton
                type="change_supply_cap"
                label="Change Supply Cap"
                description="Modify maximum supply limit"
                selected={proposalType === 'change_supply_cap'}
                onClick={() => handleProposalTypeChange('change_supply_cap')}
              />
              <ProposalTypeButton
                type="change_borrow_cap"
                label="Change Borrow Cap"
                description="Modify maximum borrow limit"
                selected={proposalType === 'change_borrow_cap'}
                onClick={() => handleProposalTypeChange('change_borrow_cap')}
              />
              <ProposalTypeButton
                type="change_interest_rate"
                label="Change Interest Rate Model"
                description="Modify interest rate parameters"
                selected={proposalType === 'change_interest_rate'}
                onClick={() => handleProposalTypeChange('change_interest_rate')}
              />
              <ProposalTypeButton
                type="change_reserve_factor"
                label="Change Reserve Factor"
                description="Modify protocol reserve factor"
                selected={proposalType === 'change_reserve_factor'}
                onClick={() => handleProposalTypeChange('change_reserve_factor')}
              />
              <ProposalTypeButton
                type="pause_asset"
                label="Pause Asset"
                description="Temporarily pause an asset"
                selected={proposalType === 'pause_asset'}
                onClick={() => handleProposalTypeChange('pause_asset')}
              />
              <ProposalTypeButton
                type="unpause_asset"
                label="Unpause Asset"
                description="Resume a paused asset"
                selected={proposalType === 'unpause_asset'}
                onClick={() => handleProposalTypeChange('unpause_asset')}
              />
              <ProposalTypeButton
                type="emergency_pause"
                label="Emergency Pause"
                description="Pause all protocol operations"
                selected={proposalType === 'emergency_pause'}
                onClick={() => handleProposalTypeChange('emergency_pause')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Asset Selection (if needed) */}
        {(proposalType !== 'add_asset' && proposalType !== 'emergency_pause' && proposalType !== 'custom') && (
          <Card>
            <CardHeader>
              <CardTitle>Select Asset</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={selectedAsset}
                onChange={(e) => {
                  setSelectedAsset(e.target.value);
                  updateParametersForType(proposalType, reserveData);
                }}
                className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {assets.map(asset => (
                  <option key={asset} value={asset}>{asset}</option>
                ))}
              </select>
              {reserveLoading && (
                <p className="text-xs text-muted-foreground mt-2">Loading reserve data...</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Parameters */}
        {parameters.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Parameters</CardTitle>
              <CardDescription>Configure the proposal parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {parameters.map((param, index) => (
                <div key={index}>
                  <Label htmlFor={`param-${index}`}>{param.name}</Label>
                  <Input
                    id={`param-${index}`}
                    type="text"
                    value={param.value}
                    onChange={(e) => handleParameterChange(index, e.target.value)}
                    placeholder={`Enter ${param.name.toLowerCase()}`}
                    className="mt-1"
                    disabled={param.disabled || reserveLoading}
                    readOnly={param.disabled}
                  />
                  {reserveLoading && param.name.includes('Current') && (
                    <p className="text-xs text-muted-foreground mt-1">Loading from contract...</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Proposal Details */}
        <Card>
          <CardHeader>
            <CardTitle>Proposal Details</CardTitle>
            <CardDescription>Describe your proposal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Add USDT as Collateral Asset"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="summary">Summary *</Label>
              <Input
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brief summary of the proposal"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the proposal..."
                rows={6}
                className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              />
            </div>

            <div>
              <Label htmlFor="motivation">Motivation</Label>
              <textarea
                id="motivation"
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                placeholder="Explain why this proposal should be implemented..."
                rows={4}
                className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !summary.trim() || !description.trim()}
            className="flex-1"
          >
            {isSubmitting ? 'Creating...' : 'Create Proposal'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

function ProposalTypeButton({
  type,
  label,
  description,
  selected,
  onClick,
}: {
  type: ProposalActionType;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 text-left border-2 rounded-lg transition-colors ${
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/50 hover:bg-accent'
      }`}
    >
      <div className="font-semibold text-foreground mb-1">{label}</div>
      <div className="text-sm text-muted-foreground">{description}</div>
    </button>
  );
}

