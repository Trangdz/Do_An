import { Proposal, ProposalState } from '@/types/governance';

// Empty array - all proposals will be created by users
// In production, proposals will be stored on-chain via governance contract
export const mockProposals: Proposal[] = [];

export function getProposalsByState(state: ProposalState): Proposal[] {
  const allProposals = [...mockProposals];
  
  // Add saved proposals from localStorage
  if (typeof window !== 'undefined') {
    const savedProposals = localStorage.getItem('lendhub_proposals');
    if (savedProposals) {
      try {
        const parsed = JSON.parse(savedProposals);
        parsed.forEach((p: any) => {
          allProposals.push({
            ...p,
            votesFor: BigInt(p.votesFor || '0'),
            votesAgainst: BigInt(p.votesAgainst || '0'),
          });
        });
      } catch (e) {
        console.error('Error parsing saved proposals:', e);
      }
    }
  }
  
  return allProposals.filter(p => p.state === state);
}

export function getProposalById(id: string): Proposal | undefined {
  // Check localStorage first for newly created proposals
  if (typeof window !== 'undefined') {
    const savedProposals = localStorage.getItem('lendhub_proposals');
    if (savedProposals) {
      try {
        const parsed = JSON.parse(savedProposals);
        const found = parsed.find((p: Proposal) => p.id === id);
        if (found) {
          // Convert bigint strings back to bigint
          return {
            ...found,
            votesFor: BigInt(found.votesFor || '0'),
            votesAgainst: BigInt(found.votesAgainst || '0'),
          };
        }
      } catch (e) {
        console.error('Error parsing saved proposals:', e);
      }
    }
  }
  
  return mockProposals.find(p => p.id === id);
}

export function addProposal(proposal: Proposal): void {
  if (typeof window !== 'undefined') {
    const savedProposals = localStorage.getItem('lendhub_proposals');
    let proposals: Proposal[] = [];
    
    if (savedProposals) {
      try {
        proposals = JSON.parse(savedProposals);
      } catch (e) {
        console.error('Error parsing saved proposals:', e);
      }
    }
    
    // Convert bigint to string for localStorage
    const proposalToSave = {
      ...proposal,
      votesFor: proposal.votesFor.toString(),
      votesAgainst: proposal.votesAgainst.toString(),
    };
    
    proposals.push(proposalToSave);
    localStorage.setItem('lendhub_proposals', JSON.stringify(proposals));
  }
}

export function getAllProposals(): Proposal[] {
  const allProposals = [...mockProposals];
  
  // Add saved proposals from localStorage
  if (typeof window !== 'undefined') {
    const savedProposals = localStorage.getItem('lendhub_proposals');
    if (savedProposals) {
      try {
        const parsed = JSON.parse(savedProposals);
        parsed.forEach((p: any) => {
          allProposals.push({
            ...p,
            votesFor: BigInt(p.votesFor || '0'),
            votesAgainst: BigInt(p.votesAgainst || '0'),
          });
        });
      } catch (e) {
        console.error('Error parsing saved proposals:', e);
      }
    }
  }
  
  // Sort by creation date (newest first)
  return allProposals.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

