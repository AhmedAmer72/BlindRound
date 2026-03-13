export interface Round {
  id: string;
  fieldId: string;
  name: string;
  description: string;
  goal: number;
  raised: number;
  matchingPool: number;
  donorCount: number;
  projectCount: number;
  deadline: string;
  status: 'active' | 'closed' | 'finalized';
  creator: string;
  projects: Project[];
  /** True when the TX is submitted but not yet confirmed on-chain */
  pending?: boolean;
  /** TX id returned by the wallet, used for status polling */
  txId?: string;
}

export interface Project {
  id: string;
  fieldId: string;
  name: string;
  description: string;
  applicant: string;
  raised: number;
  donorCount: number;
  score?: number;
}

export interface Milestone {
  id: string;
  escrowId: string;
  index: number;
  title: string;
  description: string;
  amount: number;
  deadline: string;
  completed: boolean;
  evidenceHash?: string;
}

export interface Vote {
  projectId: string;
  score: number;
  submitted: boolean;
}

export interface DonationInput {
  amount: number;
  roundId: string;
  projectId: string;
}
