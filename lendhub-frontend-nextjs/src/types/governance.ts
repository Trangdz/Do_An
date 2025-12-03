export type ProposalState = 'Created' | 'Active' | 'Canceled' | 'Defeated' | 'Succeeded' | 'Queued' | 'Expired' | 'Executed' | 'Passed';

export type ProposalType = 
  | 'change_ltv'
  | 'change_liquidation_threshold'
  | 'change_liquidation_bonus'
  | 'change_supply_cap'
  | 'change_borrow_cap'
  | 'change_reserve_factor'
  | 'change_interest_rate'
  | 'pause_asset'
  | 'unpause_asset';

export interface ProposalParameter {
  name: string;
  value: string;
  disabled?: boolean;
}

export interface Proposal {
  id: string;
  title: string;
  summary: string;
  description: string;
  state: ProposalState;
  createdAt: string;
  votesFor: bigint;
  votesAgainst: bigint;
  motivation?: string;
  parameters?: ProposalParameter[];
  ipfsHash?: string;
  executed?: boolean;
  votingEnd?: string;
  proposer?: string;
  executionTime?: string;
}

export interface Voter {
  address: string;
  votes: bigint;
  support: boolean; // true = for, false = against
}

export interface Delegation {
  delegator: string;
  delegatee: string;
  votes: bigint;
}

