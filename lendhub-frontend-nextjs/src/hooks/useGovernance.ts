import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import useLendContext from '@/context/useLendContext';
// @ts-ignore - addresses.js is a JS file
const addresses = require('@/addresses');
import { CONFIG } from '@/config/contracts';
import { Proposal, ProposalState } from '@/types/governance';

// Governor ABI (simplified - only functions we need)
const GOVERNOR_ABI = [
  'function createProposal(string memory title, string memory summary, string memory description, string memory motivation, string memory ipfsHash) external returns (uint256)',
  'function castVote(uint256 proposalId, bool support) external',
  'function executeProposal(uint256 proposalId) external',
  'function updateProposalStates(uint256[] calldata proposalIds) external',
  'function cancelProposal(uint256 proposalId) external',
  'function getProposal(uint256 proposalId) external view returns (tuple(uint256 id, address proposer, string title, string summary, string description, string motivation, string ipfsHash, uint256 votesFor, uint256 votesAgainst, uint8 state, uint256 createdAt, uint256 votingEnd, uint256 executionTime, bool executed))',
  'function getAllProposalIds() external view returns (uint256[])',
  'function hasUserVoted(uint256 proposalId, address voter) external view returns (bool)',
  'function getUserVote(uint256 proposalId, address voter) external view returns (bool)',
  'function proposalCount() external view returns (uint256)',
  'function updateProposalStates(uint256[] calldata proposalIds) external',
  'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, uint256 createdAt)',
  'event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight)',
  'event ProposalExecuted(uint256 indexed proposalId)',
];

const GovernorAddress = addresses.GovernorAddress;

// Map contract state to ProposalState
function mapProposalState(state: number): ProposalState {
  switch (state) {
    case 0: return 'Created';
    case 1: return 'Active';
    case 2: return 'Succeeded';
    case 3: return 'Defeated';
    case 4: return 'Executed';
    case 5: return 'Canceled';
    default: return 'Created';
  }
}

export function useGovernance() {
  const { metamaskDetails } = useLendContext();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all proposals from contract
  const fetchProposals = async () => {
    if (!GovernorAddress || GovernorAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('GovernorAddress not set');
      setProposals([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const rpcProvider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      const governor = new ethers.Contract(GovernorAddress, GOVERNOR_ABI, rpcProvider);

      // Get proposal count
      const count = await governor.proposalCount();
      const proposalCount = Number(count);

      if (proposalCount === 0) {
        setProposals([]);
        setLoading(false);
        return;
      }

      // Fetch all proposals
      const proposalPromises = [];
      for (let i = 1; i <= proposalCount; i++) {
        proposalPromises.push(governor.getProposal(i));
      }

      const proposalData = await Promise.all(proposalPromises);

      // Transform to Proposal format and auto-calculate state if needed
      const transformedProposals: Proposal[] = proposalData.map((p: any) => {
        let state = mapProposalState(Number(p.state));
        const votingEnd = p.votingEnd ? Number(p.votingEnd) * 1000 : null;
        const now = Date.now();
        
        // Auto-calculate state if voting period has ended but state is still Active
        // This avoids needing a transaction to update state - we calculate it client-side
        // QUORUM = 1_000 * 1e18 = 1000 LENDX tokens (with 18 decimals)
        if (state === 'Active' && votingEnd && now >= votingEnd) {
          const votesFor = BigInt(p.votesFor.toString());
          const votesAgainst = BigInt(p.votesAgainst.toString());
          const totalVotes = votesFor + votesAgainst;
          const QUORUM = BigInt('1000000000000000000000'); // 1_000 * 1e18 (matches contract)
          
          // Match contract logic: totalVotes >= QUORUM && votesFor > votesAgainst
          if (totalVotes >= QUORUM && votesFor > votesAgainst) {
            state = 'Succeeded';
          } else {
            state = 'Defeated';
          }
        }
        
        return {
          id: p.id.toString(),
          title: p.title,
          summary: p.summary,
          description: p.description,
          motivation: p.motivation || undefined,
          state: state,
          createdAt: new Date(Number(p.createdAt) * 1000).toISOString(),
          votesFor: BigInt(p.votesFor.toString()),
          votesAgainst: BigInt(p.votesAgainst.toString()),
          ipfsHash: p.ipfsHash || undefined,
          parameters: [], // Parameters would need to be parsed from description or stored separately
          executed: p.executed || false,
          votingEnd: votingEnd ? new Date(votingEnd).toISOString() : undefined,
          proposer: p.proposer || undefined,
          executionTime: p.executionTime && Number(p.executionTime) > 0 
            ? new Date(Number(p.executionTime) * 1000).toISOString() 
            : undefined,
        };
      });

      // Sort by creation date (newest first)
      transformedProposals.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setProposals(transformedProposals);
    } catch (err: any) {
      console.error('Error fetching proposals:', err);
      setError(err.message || 'Failed to fetch proposals');
      setProposals([]);
    } finally {
      setLoading(false);
    }
  };

  // Create proposal
  const createProposal = async (
    title: string,
    summary: string,
    description: string,
    motivation: string,
    ipfsHash: string = ''
  ) => {
    if (!metamaskDetails.signer) {
      throw new Error('Wallet not connected');
    }

    if (!GovernorAddress || GovernorAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('Governor contract not deployed');
    }

    const governor = new ethers.Contract(GovernorAddress, GOVERNOR_ABI, metamaskDetails.signer);
    
    const tx = await governor.createProposal(
      title,
      summary,
      description,
      motivation,
      ipfsHash
    );

    const receipt = await tx.wait();
    let proposalId = '';
    
    // Try to get proposal ID from events
    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsedLog = governor.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'ProposalCreated') {
            proposalId = parsedLog.args.proposalId.toString();
            break;
          }
        } catch (e) {
          // Not the event we're looking for
        }
      }
    }
    
    // Fallback: get latest proposal count
    if (!proposalId) {
      const count = await governor.proposalCount();
      proposalId = count.toString();
    }

    // Refresh proposals
    await fetchProposals();

    return { tx, proposalId };
  };

  // Cast vote
  const castVote = async (proposalId: string, support: boolean) => {
    if (!metamaskDetails.signer) {
      throw new Error('Wallet not connected');
    }

    const governor = new ethers.Contract(GovernorAddress, GOVERNOR_ABI, metamaskDetails.signer);
    const tx = await governor.castVote(proposalId, support);
    await tx.wait();

    // Refresh proposals
    await fetchProposals();

    return tx;
  };

  // Execute proposal
  const executeProposal = async (proposalId: string) => {
    if (!metamaskDetails.signer) {
      throw new Error('Wallet not connected');
    }

    if (!GovernorAddress || GovernorAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('Governor contract not deployed');
    }

    const governor = new ethers.Contract(GovernorAddress, GOVERNOR_ABI, metamaskDetails.signer);
    
    // First, check the actual on-chain state and update if needed
    const rpcProvider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    const readOnlyGovernor = new ethers.Contract(GovernorAddress, GOVERNOR_ABI, rpcProvider);
    
    try {
      const proposal = await readOnlyGovernor.getProposal(proposalId);
      const onChainState = Number(proposal.state);
      
      // If state is still Active but voting period has ended, update it first
      if (onChainState === 1) { // Active
        const votingEnd = Number(proposal.votingEnd);
        const now = Math.floor(Date.now() / 1000);
        
        if (votingEnd <= now) {
          // Voting period has ended, need to update state on-chain first
          console.log('Voting period ended, updating proposal state on-chain...');
          try {
            const proposalIdsBigInt = [BigInt(proposalId)];
            
            // Estimate gas first
            let gasLimit = 200000;
            try {
              const gasEstimate = await governor.updateProposalStates.estimateGas(proposalIdsBigInt);
              gasLimit = Number(gasEstimate) * 1.2;
            } catch (e) {
              console.warn('Gas estimation failed, using default');
            }
            
            // Try to update; if RPC/internal error, log and fallback to read-only state check
            try {
              const updateTx = await governor.updateProposalStates(proposalIdsBigInt, {
                gasLimit: Math.floor(gasLimit)
              });
              await updateTx.wait();
              // Wait a bit for state to update
              await new Promise(resolve => setTimeout(resolve, 1500));
            } catch (updateSendError: any) {
              console.warn('[governance] updateProposalStates failed, will fallback to read-only state check:', updateSendError);
            }
            
            // Verify state was updated (or already correct)
            const updatedProposal = await readOnlyGovernor.getProposal(proposalId);
            const updatedState = Number(updatedProposal.state);
            
            if (updatedState !== 2) { // Not Succeeded
              throw new Error(`Proposal state is ${mapProposalState(updatedState)}, cannot execute. Expected: Succeeded`);
            }
          } catch (updateError: any) {
            if (updateError.message?.includes('rejected')) {
              throw new Error('Transaction rejected. Please try again.');
            }
            // More informative message
            throw new Error(`Failed to update proposal state (state=${mapProposalState(onChainState)}): ${updateError.message || 'Unknown error'}`);
          }
        } else {
          throw new Error('Voting period has not ended yet. Cannot execute proposal.');
        }
      } else if (onChainState !== 2) { // Not Succeeded
        throw new Error(`Proposal state is ${mapProposalState(onChainState)}, cannot execute. Expected: Succeeded`);
      }
      
      // Check if already executed
      if (proposal.executed) {
        throw new Error('Proposal has already been executed.');
      }
      
      // Now execute
      const tx = await governor.executeProposal(proposalId);
      await tx.wait();

      // Refresh proposals
      await fetchProposals();

      return tx;
    } catch (error: any) {
      console.error('Error executing proposal:', error);
      
      // Improve error messages
      if (error.message?.includes('proposal not succeeded')) {
        throw new Error('Proposal state must be "Succeeded" to execute. The state will be updated automatically, please try again.');
      }
      if (error.message?.includes('already executed')) {
        throw new Error('This proposal has already been executed.');
      }
      if (error.message?.includes('does not exist')) {
        throw new Error('Proposal does not exist.');
      }
      if (error.message?.includes('rejected')) {
        throw new Error('Transaction rejected by user.');
      }
      if (error.message?.includes('missing revert data')) {
        throw new Error('Transaction failed. The proposal may not be in the correct state. Please refresh and try again.');
      }
      
      throw error;
    }
  };

  // Check if user has voted
  const hasUserVoted = async (proposalId: string, userAddress: string): Promise<boolean> => {
    if (!GovernorAddress || !userAddress) return false;

    try {
      const rpcProvider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      const governor = new ethers.Contract(GovernorAddress, GOVERNOR_ABI, rpcProvider);
      return await governor.hasUserVoted(proposalId, userAddress);
    } catch (err) {
      console.error('Error checking vote:', err);
      return false;
    }
  };

  // Get user's vote
  const getUserVote = async (proposalId: string, userAddress: string): Promise<boolean | null> => {
    if (!GovernorAddress || !userAddress) return null;

    try {
      const rpcProvider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      const governor = new ethers.Contract(GovernorAddress, GOVERNOR_ABI, rpcProvider);
      const hasVoted = await governor.hasUserVoted(proposalId, userAddress);
      if (!hasVoted) return null;
      return await governor.getUserVote(proposalId, userAddress);
    } catch (err) {
      console.error('Error getting user vote:', err);
      return null;
    }
  };

  // Update proposal states
  const updateProposalStates = async (proposalIds: string[]) => {
    if (!metamaskDetails.signer) {
      throw new Error('Wallet not connected');
    }

    if (!proposalIds || proposalIds.length === 0) {
      throw new Error('No proposal IDs provided');
    }

    try {
      const governor = new ethers.Contract(GovernorAddress, GOVERNOR_ABI, metamaskDetails.signer);
      
      // Convert string IDs to BigInt for contract call
      const proposalIdsBigInt = proposalIds.map(id => {
        try {
          return BigInt(id);
        } catch (e) {
          throw new Error(`Invalid proposal ID: ${id}`);
        }
      });
      
      // Check if proposals exist and are in Active state before attempting update
      const rpcProvider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      const readOnlyGovernor = new ethers.Contract(GovernorAddress, GOVERNOR_ABI, rpcProvider);
      
      for (const proposalId of proposalIdsBigInt) {
        try {
          const proposal = await readOnlyGovernor.getProposal(proposalId);
          // Check if proposal exists (id should match)
          if (proposal.id.toString() !== proposalId.toString()) {
            throw new Error(`Proposal ${proposalId} does not exist`);
          }
          // Check if proposal is already in final state
          if (proposal.state !== 1) { // 1 = Active
            console.log(`Proposal ${proposalId} is already in state ${proposal.state}, skipping update`);
          }
        } catch (checkError: any) {
          if (checkError.message?.includes('does not exist')) {
            throw checkError;
          }
          // If getProposal fails, we'll still try to update (maybe it's a different error)
          console.warn(`Could not check proposal ${proposalId}:`, checkError.message);
        }
      }
      
      // Estimate gas first to catch errors early
      let gasLimit = 200000; // Default gas limit
      try {
        const gasEstimate = await governor.updateProposalStates.estimateGas(proposalIdsBigInt);
        gasLimit = Number(gasEstimate) * 1.2; // Add 20% buffer
        console.log('Gas estimate:', gasEstimate.toString(), 'Using:', gasLimit);
      } catch (estimateError: any) {
        console.error('Gas estimation failed:', estimateError);
        // Use default gas limit if estimation fails
      }
      
      const tx = await governor.updateProposalStates(proposalIdsBigInt, {
        gasLimit: Math.floor(gasLimit)
      });
      await tx.wait();

      // Refresh proposals
      await fetchProposals();

      return tx;
    } catch (error: any) {
      console.error('Error updating proposal states:', error);
      
      // Check if it's a user rejection
      if (error.code === 4001 || error.message?.includes('user rejected') || error.message?.includes('rejected')) {
        throw new Error('Transaction rejected by user');
      }
      
      // Check if proposal doesn't exist or other contract errors
      if (error.message?.includes('revert') || error.message?.includes('execution reverted') || error.message?.includes('does not exist')) {
        const errorMsg = error.message.includes('does not exist') 
          ? error.message 
          : 'Failed to update proposal state. The proposal may not exist or may already be in the correct state.';
        throw new Error(errorMsg);
      }
      
      // Check for RPC errors
      if (error.code === -32603 || error.message?.includes('Internal JSON-RPC error')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      throw error;
    }
  };

  // Auto-fetch proposals on mount and when account changes
  useEffect(() => {
    fetchProposals();

    // Refresh every 10 seconds
    const interval = setInterval(fetchProposals, 10000);

    return () => clearInterval(interval);
  }, [metamaskDetails.currentAccount]);

  return {
    proposals,
    loading,
    error,
    fetchProposals,
    createProposal,
    castVote,
    executeProposal,
    hasUserVoted,
    getUserVote,
    // updateProposalStates, // No longer needed - state is calculated client-side
  };
}

