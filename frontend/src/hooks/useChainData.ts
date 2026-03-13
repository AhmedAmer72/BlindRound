/**
 * useChainData — fetch live on-chain data from blindround_v1.aleo mappings
 * via the Aleo Testnet REST API (no mock data).
 *
 * Endpoints used:
 *   GET /testnet/program/{program}/mapping/{mapping}/{key}
 */

import { useCallback, useEffect, useState } from 'react';
import { PROGRAM_ID } from '../utils/constants';
import type { Round, Project } from '../types';

const API = 'https://api.explorer.provable.com/v1';

async function getMapping<T>(
  mapping: string,
  key: string,
): Promise<T | null> {
  try {
    const res = await fetch(
      `${API}/testnet/program/${PROGRAM_ID}/mapping/${mapping}/${key}`,
    );
    if (!res.ok) return null;
    const text = await res.text();
    // Strip outer quotes if string value
    const cleaned = text.replace(/^"|"$/g, '').trim();
    if (!cleaned || cleaned === 'null') return null;
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

// ── Round list ──────────────────────────────────────────────────────────────

export interface ChainRoundInfo {
  creator: string;
  goal: string;
  deadline: string;
  matching_pool: string;
  status: string;      // "1u8" | "2u8" | "3u8"
  project_count: string;
}

function statusLabel(s: string): 'active' | 'closed' | 'finalized' {
  if (s === '1u8') return 'active';
  if (s === '3u8') return 'finalized';
  return 'closed';
}

/** Parse a Leo field literal like "123456field" → number */
function parseField(f: string): number {
  return parseInt(f.replace('field', '').replace('u64', '').replace('u32', ''));
}

function chainRoundToRound(roundId: string, raw: ChainRoundInfo): Round {
  return {
    id: roundId,
    fieldId: roundId,
    name: `Round ${roundId}`,
    description: '',
    goal: parseField(raw.goal),
    raised: 0,             // populated separately from round_totals mapping
    matchingPool: parseField(raw.matching_pool),
    donorCount: 0,         // populated separately from round_donor_count mapping
    projectCount: parseField(raw.project_count),
    deadline: raw.deadline,
    status: statusLabel(raw.status),
    creator: raw.creator,
    projects: [],
  };
}

// ── useRounds ───────────────────────────────────────────────────────────────

/**
 * Fetch a paginated list of rounds.
 * We maintain a stored list of known round field IDs in localStorage so the
 * app can discover newly created rounds after any create_round tx.
 */
export function useRounds() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRounds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Discover known round IDs from localStorage
      const storedIds: string[] = JSON.parse(
        localStorage.getItem('blindround_round_ids') ?? '[]',
      );

      // Also check the global_round_count to determine expected count
      const countRaw = await getMapping<string>('global_round_count', '0u8');
      const count = countRaw ? parseInt(countRaw.replace('u32', '')) : 0;

      // Try sequential field keys 1..count
      const fromChain: string[] = [];
      for (let i = 1; i <= count; i++) {
        fromChain.push(`${i}field`);
      }

      const allIds = Array.from(new Set([...storedIds, ...fromChain]));

      const results = await Promise.all(
        allIds.map(async (rid) => {
          const raw = await getMapping<ChainRoundInfo>('rounds', rid);
          if (!raw) return null;
          const round = chainRoundToRound(rid, raw);

          // Enrich with totals
          const totalRaw = await getMapping<string>('round_totals', rid);
          if (totalRaw) round.raised = parseField(totalRaw);

          const donorRaw = await getMapping<string>('round_donor_count', rid);
          if (donorRaw) round.donorCount = parseField(donorRaw);

          return round;
        }),
      );

      setRounds(results.filter((r): r is Round => r !== null));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load rounds');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRounds(); }, [loadRounds]);

  return { rounds, loading, error, refetch: loadRounds };
}

// ── useRound ─────────────────────────────────────────────────────────────────

export interface ChainProjectInfo {
  round_id: string;
  applicant: string;
  name_hash: string;
  total_donated: string;
  donor_count: string;
}

function chainProjectToProject(projectId: string, raw: ChainProjectInfo): Project {
  return {
    id: projectId,
    fieldId: projectId,
    name: `Project ${projectId}`,
    description: '',
    applicant: raw.applicant,
    raised: parseField(raw.total_donated),
    donorCount: parseField(raw.donor_count),
  };
}

export function useRound(roundId: string | undefined) {
  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!roundId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const raw = await getMapping<ChainRoundInfo>('rounds', roundId);
      if (!raw) { setRound(null); setLoading(false); return; }

      const r = chainRoundToRound(roundId, raw);

      const totalRaw = await getMapping<string>('round_totals', roundId);
      if (totalRaw) r.raised = parseField(totalRaw);

      const donorRaw = await getMapping<string>('round_donor_count', roundId);
      if (donorRaw) r.donorCount = parseField(donorRaw);

      // Discover projects from localStorage for this round
      const storedProjects: string[] = JSON.parse(
        localStorage.getItem(`blindround_projects_${roundId}`) ?? '[]',
      );

      const projects = await Promise.all(
        storedProjects.map(async (pid) => {
          const proj = await getMapping<ChainProjectInfo>('projects', pid);
          if (!proj) return null;
          const p = chainProjectToProject(pid, proj);

          // Fetch revealed score if present
          const scoreRaw = await getMapping<string>('revealed_scores', pid);
          if (scoreRaw) p.score = parseField(scoreRaw);

          return p;
        }),
      );

      r.projects = projects.filter((p): p is Project => p !== null);
      r.projectCount = r.projects.length || parseField(raw.project_count);

      setRound(r);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load round');
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  useEffect(() => { load(); }, [load]);

  return { round, loading, error, refetch: load };
}

// ── useStats ─────────────────────────────────────────────────────────────────

export interface ProtocolStats {
  totalRounds: number;
  totalDonationVolume: number;
  totalEscrows: number;
  totalLocked: number;
}

export function useProtocolStats() {
  const [stats, setStats] = useState<ProtocolStats>({
    totalRounds: 0,
    totalDonationVolume: 0,
    totalEscrows: 0,
    totalLocked: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [rounds, vol, escrows, locked] = await Promise.all([
          getMapping<string>('global_round_count', '0u8'),
          getMapping<string>('global_donation_vol', '0u8'),
          getMapping<string>('escrow_count', '0u8'),
          getMapping<string>('total_locked', '0u8'),
        ]);
        setStats({
          totalRounds:         rounds  ? parseField(rounds)  : 0,
          totalDonationVolume: vol     ? parseField(vol)     : 0,
          totalEscrows:        escrows ? parseField(escrows) : 0,
          totalLocked:         locked  ? parseField(locked)  : 0,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { stats, loading };
}

// ── useWalletRecords ─────────────────────────────────────────────────────────

export interface WalletRecords {
  donationReceipts: unknown[];
  escrowReceipts: unknown[];
  milestoneProofs: unknown[];
  ballots: unknown[];
}

export function useWalletRecords(
  requestRecords: ((program: string) => Promise<unknown[]>) | undefined,
  connected: boolean,
) {
  const [records, setRecords] = useState<WalletRecords>({
    donationReceipts: [],
    escrowReceipts: [],
    milestoneProofs: [],
    ballots: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connected || !requestRecords) return;
    setLoading(true);
    requestRecords(PROGRAM_ID)
      .then((all: unknown[]) => {
        const arr = all as Array<{ type?: string; recordName?: string }>;
        setRecords({
          donationReceipts: arr.filter((r) => r.recordName === 'DonationReceipt'),
          escrowReceipts:   arr.filter((r) => r.recordName === 'EscrowReceipt'),
          milestoneProofs:  arr.filter((r) => r.recordName === 'MilestoneProof'),
          ballots:          arr.filter((r) => r.recordName === 'Ballot'),
        });
      })
      .catch(() => {/* wallet may not have records */})
      .finally(() => setLoading(false));
  }, [connected, requestRecords]);

  return { records, loading };
}

// ── useEscrow ─────────────────────────────────────────────────────────────────

export interface ChainEscrowInfo {
  round_id: string;
  grantor: string;
  total_amount: string;
  released: string;
  milestone_count: string;
  milestones_completed: string;
  active: string;
}

export interface ChainMilestoneInfo {
  escrow_id: string;
  milestone_index: string;
  amount: string;
  deadline: string;
  completed: string;
  evidence_hash: string;
}

export function useEscrow(escrowId: string | undefined) {
  const [escrow, setEscrow] = useState<ChainEscrowInfo | null>(null);
  const [milestones, setMilestones] = useState<
    Array<ChainMilestoneInfo & { id: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!escrowId) { setLoading(false); return; }
    (async () => {
      const e = await getMapping<ChainEscrowInfo>('escrows', escrowId);
      setEscrow(e);

      const storedMs: string[] = JSON.parse(
        localStorage.getItem(`blindround_milestones_${escrowId}`) ?? '[]',
      );
      const msData = await Promise.all(
        storedMs.map(async (mid) => {
          const m = await getMapping<ChainMilestoneInfo>('milestones', mid);
          return m ? { ...m, id: mid } : null;
        }),
      );
      setMilestones(msData.filter((m): m is ChainMilestoneInfo & { id: string } => m !== null));
      setLoading(false);
    })();
  }, [escrowId]);

  return { escrow, milestones, loading };
}
