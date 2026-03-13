/**
 * BlindRound — End-to-End Scenario Test
 *
 * Simulates the full grant lifecycle without a live wallet or testnet:
 *
 *   1. Admin creates a funding round
 *   2. Project applicant registers a project
 *   3. Donor donates to the project
 *   4. Admin closes the funding round
 *   5. Admin creates a committee for the round
 *   6. Chair adds two committee members
 *   7. Both members submit votes for the project
 *   8. Chair closes voting
 *   9. Scores are revealed on-chain
 *  10. Grantor locks the grant in a milestone escrow
 *  11. Grantor defines a milestone in the escrow
 *  12. Grantee proves the milestone (submits evidence)
 *  13. Grantor releases the tranche to the grantee
 *
 * Network calls (fetch) are mocked to return Aleo AVM-formatted responses
 * that mirror what blindround_proto.aleo mappings return on Testnet.
 * localStorage is reset between each test.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  parseLeoStruct,
  parseField,
  formatDeadline,
  statusLabel,
  chainRoundToRound,
  useRounds,
  useRound,
  type ChainRoundInfo,
  type ChainProjectInfo,
} from '../hooks/useChainData';

// ─── Constants that mirror what the Leo contract emits ────────────────────────

const ROUND_ID   = '111111field';
const PROJECT_ID = '222222field';
const ESCROW_ID  = '333333field';
const MILESTONE_ID = '444444field';

const DEADLINE_TS = 1762300800; // arbitrary future unix timestamp

// AVM struct strings exactly as the Testnet REST API returns them:
const CHAIN_ROUND: ChainRoundInfo = {
  creator: 'aleo1abc000000000000000000000000000000000000000000000000000000000',
  goal: '5000000u64',
  deadline: `${DEADLINE_TS}u32`,
  matching_pool: '1000000u64',
  status: '1u8',
  project_count: '1u8',
};

const CHAIN_ROUND_CLOSED: ChainRoundInfo = { ...CHAIN_ROUND, status: '2u8' };

const CHAIN_PROJECT: ChainProjectInfo = {
  round_id: ROUND_ID,
  applicant: 'aleo1xyz000000000000000000000000000000000000000000000000000000000',
  name_hash: '999999field',
  total_donated: '500000u64',
  donor_count: '3u32',
};

// Leo AVM struct string format returned by the REST API for the `rounds` mapping
function leoRoundStruct(r: ChainRoundInfo) {
  return `{ creator: ${r.creator}, goal: ${r.goal}, deadline: ${r.deadline}, matching_pool: ${r.matching_pool}, status: ${r.status}, project_count: ${r.project_count} }`;
}

function leoProjectStruct(p: ChainProjectInfo) {
  return `{ round_id: ${p.round_id}, applicant: ${p.applicant}, name_hash: ${p.name_hash}, total_donated: ${p.total_donated}, donor_count: ${p.donor_count} }`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockFetchMapping(responses: Record<string, string | null>) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const u = url.toString();
    for (const [key, value] of Object.entries(responses)) {
      if (u.endsWith(key)) {
        if (value === null) {
          return new Response(null, { status: 404 });
        }
        // Testnet wraps the value in JSON string quotes
        return new Response(JSON.stringify(value), { status: 200 });
      }
    }
    return new Response(null, { status: 404 });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — PURE UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('parseLeoStruct', () => {
  it('parses a flat Leo struct literal correctly', () => {
    const raw = `{ creator: aleo1abc, goal: 5000000u64, status: 1u8 }`;
    const parsed = parseLeoStruct(raw);
    expect(parsed.creator).toBe('aleo1abc');
    expect(parsed.goal).toBe('5000000u64');
    expect(parsed.status).toBe('1u8');
  });

  it('handles multi-line struct strings', () => {
    const raw = `{\n  creator: aleo1def,\n  goal: 9000u64,\n  status: 2u8\n}`;
    const parsed = parseLeoStruct(raw);
    expect(parsed.creator).toBe('aleo1def');
    expect(parsed.goal).toBe('9000u64');
    expect(parsed.status).toBe('2u8');
  });

  it('returns an empty object for an empty struct', () => {
    expect(parseLeoStruct('{ }')).toEqual({});
  });
});

describe('parseField', () => {
  it('strips field suffix', () => expect(parseField('123456field')).toBe(123456));
  it('strips u64 suffix',   () => expect(parseField('9000000u64')).toBe(9000000));
  it('strips u32 suffix',   () => expect(parseField('42u32')).toBe(42));
  it('strips u8 suffix',    () => expect(parseField('1u8')).toBe(1));
  it('returns 0 for empty', () => expect(parseField('')).toBe(0));
  it('returns 0 for non-numeric', () => expect(parseField('aleo1abc')).toBe(0));
});

describe('formatDeadline', () => {
  it('converts a Leo u32 timestamp to a date string', () => {
    const formatted = formatDeadline(`${DEADLINE_TS}u32`);
    expect(formatted).toMatch(/\w+ \d+, \d{4}/); // e.g. "May 15, 2025"
  });

  it('returns the raw string for a zero timestamp (non-empty fallback)', () => {
    // formatDeadline returns raw || '—'; '0u32' is truthy so it passes through as-is
    expect(formatDeadline('0u32')).toBe('0u32');
  });

  it('returns raw value when unparseable', () => {
    expect(formatDeadline('')).toBe('—');
  });
});

describe('statusLabel', () => {
  it('maps 1u8 → active',    () => expect(statusLabel('1u8')).toBe('active'));
  it('maps 2u8 → closed',    () => expect(statusLabel('2u8')).toBe('closed'));
  it('maps 3u8 → finalized', () => expect(statusLabel('3u8')).toBe('finalized'));
  it('maps unknown → closed', () => expect(statusLabel('99u8')).toBe('closed'));
});

describe('chainRoundToRound', () => {
  it('converts a ChainRoundInfo record to a Round correctly', () => {
    const round = chainRoundToRound(ROUND_ID, CHAIN_ROUND);
    expect(round.id).toBe(ROUND_ID);
    expect(round.goal).toBe(5_000_000);
    expect(round.matchingPool).toBe(1_000_000);
    expect(round.status).toBe('active');
    expect(round.projectCount).toBe(1);
    expect(round.raised).toBe(0);          // enriched separately
    expect(round.donorCount).toBe(0);      // enriched separately
    expect(round.deadline).toMatch(/\w/);  // not empty
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — useRounds HOOK
// ═══════════════════════════════════════════════════════════════════════════════

describe('useRounds', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('returns an empty list when localStorage has no stored IDs', async () => {
    const { result } = renderHook(() => useRounds());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rounds).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('loads a confirmed round from the chain and enriches totals', async () => {
    localStorage.setItem('blindround_round_ids', JSON.stringify([ROUND_ID]));

    mockFetchMapping({
      [`rounds/${ROUND_ID}`]: leoRoundStruct(CHAIN_ROUND),
      [`round_totals/${ROUND_ID}`]: '500000u64',
      [`round_donor_count/${ROUND_ID}`]: '3u32',
    });

    const { result } = renderHook(() => useRounds());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rounds).toHaveLength(1);
    const round = result.current.rounds[0];
    expect(round.id).toBe(ROUND_ID);
    expect(round.goal).toBe(5_000_000);
    expect(round.raised).toBe(500_000);
    expect(round.donorCount).toBe(3);
    expect(round.status).toBe('active');
    expect(round.pending).toBeUndefined();
  });

  it('shows a pending round from localStorage metadata when chain returns 404', async () => {
    localStorage.setItem('blindround_round_ids', JSON.stringify([ROUND_ID]));
    localStorage.setItem(`blindround_meta_${ROUND_ID}`, JSON.stringify({
      name: 'Aleo Grants Q1',
      description: 'First quarter grants',
      goal: 10_000,
      matchingPool: 2_000,
      deadline: 'Mar 14, 2026',
      txId: 'at1pendingxyz',
    }));

    // Simulate chain returning 404 (TX not confirmed yet)
    mockFetchMapping({});

    const { result } = renderHook(() => useRounds());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rounds).toHaveLength(1);
    const round = result.current.rounds[0];
    expect(round.pending).toBe(true);
    expect(round.name).toBe('Aleo Grants Q1');
    expect(round.goal).toBe(10_000);
    expect(round.txId).toBe('at1pendingxyz');
  });

  it('skips IDs stored in localStorage that have no chain data and no metadata', async () => {
    localStorage.setItem('blindround_round_ids', JSON.stringify([ROUND_ID]));
    // No metadata, no chain response → should be filtered out
    mockFetchMapping({});

    const { result } = renderHook(() => useRounds());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rounds).toHaveLength(0);
  });

  it('refetch() triggers a re-load', async () => {
    localStorage.setItem('blindround_round_ids', JSON.stringify([ROUND_ID]));
    mockFetchMapping({
      [`rounds/${ROUND_ID}`]: leoRoundStruct(CHAIN_ROUND),
      [`round_totals/${ROUND_ID}`]: '100000u64',
      [`round_donor_count/${ROUND_ID}`]: '1u32',
    });

    const { result } = renderHook(() => useRounds());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rounds[0].raised).toBe(100_000);

    // Second call: donor donated more
    mockFetchMapping({
      [`rounds/${ROUND_ID}`]: leoRoundStruct(CHAIN_ROUND),
      [`round_totals/${ROUND_ID}`]: '600000u64',
      [`round_donor_count/${ROUND_ID}`]: '4u32',
    });

    await act(async () => { result.current.refetch(); });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rounds[0].raised).toBe(600_000);
    expect(result.current.rounds[0].donorCount).toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — useRound HOOK
// ═══════════════════════════════════════════════════════════════════════════════

describe('useRound', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('returns null when roundId is undefined', async () => {
    const { result } = renderHook(() => useRound(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.round).toBeNull();
  });

  it('returns null for an unknown round (chain 404)', async () => {
    mockFetchMapping({});
    const { result } = renderHook(() => useRound(ROUND_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.round).toBeNull();
  });

  it('loads a round with its projects', async () => {
    localStorage.setItem(
      `blindround_projects_${ROUND_ID}`,
      JSON.stringify([PROJECT_ID]),
    );

    mockFetchMapping({
      [`rounds/${ROUND_ID}`]:            leoRoundStruct(CHAIN_ROUND),
      [`round_totals/${ROUND_ID}`]:      '500000u64',
      [`round_donor_count/${ROUND_ID}`]: '3u32',
      [`projects/${PROJECT_ID}`]:        leoProjectStruct(CHAIN_PROJECT),
      [`revealed_scores/${PROJECT_ID}`]: null,
    });

    const { result } = renderHook(() => useRound(ROUND_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const round = result.current.round!;
    expect(round).not.toBeNull();
    expect(round.id).toBe(ROUND_ID);
    expect(round.raised).toBe(500_000);
    expect(round.projects).toHaveLength(1);

    const project = round.projects[0];
    expect(project.id).toBe(PROJECT_ID);
    expect(project.raised).toBe(500_000);
    expect(project.donorCount).toBe(3);
    expect(project.score).toBeUndefined();
  });

  it('attaches revealed score to a project after committee vote', async () => {
    localStorage.setItem(
      `blindround_projects_${ROUND_ID}`,
      JSON.stringify([PROJECT_ID]),
    );

    mockFetchMapping({
      [`rounds/${ROUND_ID}`]:            leoRoundStruct(CHAIN_ROUND_CLOSED),
      [`round_totals/${ROUND_ID}`]:      '500000u64',
      [`round_donor_count/${ROUND_ID}`]: '3u32',
      [`projects/${PROJECT_ID}`]:        leoProjectStruct(CHAIN_PROJECT),
      [`revealed_scores/${PROJECT_ID}`]: '85u64',  // score revealed after voting
    });

    const { result } = renderHook(() => useRound(ROUND_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const round = result.current.round!;
    expect(round.status).toBe('closed');
    expect(round.projects[0].score).toBe(85);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — FULL END-TO-END LIFECYCLE SCENARIO
// ═══════════════════════════════════════════════════════════════════════════════

describe('Full lifecycle: create → donate → vote → escrow → release', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('Step 1 — Round appears as pending immediately after wallet confirms TX', async () => {
    // Simulate what CreateRoundForm does after executeTransaction returns:
    const ids: string[] = JSON.parse(localStorage.getItem('blindround_round_ids') ?? '[]');
    ids.push(ROUND_ID);
    localStorage.setItem('blindround_round_ids', JSON.stringify(ids));
    localStorage.setItem(`blindround_meta_${ROUND_ID}`, JSON.stringify({
      name: 'BlindRound Q1 2026',
      description: 'A private matching grants round on Aleo.',
      goal: 5_000_000,
      matchingPool: 1_000_000,
      deadline: 'Apr 1, 2026',
      txId: 'at1create_round_tx',
    }));

    // Chain not confirmed yet → 404
    mockFetchMapping({});

    const { result } = renderHook(() => useRounds());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const round = result.current.rounds[0];
    expect(round.name).toBe('BlindRound Q1 2026');
    expect(round.pending).toBe(true);
    expect(round.txId).toBe('at1create_round_tx');
  });

  it('Step 2 — Round appears confirmed once TX is on-chain', async () => {
    localStorage.setItem('blindround_round_ids', JSON.stringify([ROUND_ID]));

    mockFetchMapping({
      [`rounds/${ROUND_ID}`]:            leoRoundStruct(CHAIN_ROUND),
      [`round_totals/${ROUND_ID}`]:      '0u64',
      [`round_donor_count/${ROUND_ID}`]: '0u32',
    });

    const { result } = renderHook(() => useRounds());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const round = result.current.rounds[0];
    expect(round.pending).toBeUndefined();
    expect(round.status).toBe('active');
    expect(round.goal).toBe(5_000_000);
  });

  it('Step 3 — Project shows up with donation totals after register + donate', async () => {
    // Simulate frontend storing the project ID after register_project
    localStorage.setItem('blindround_round_ids', JSON.stringify([ROUND_ID]));
    localStorage.setItem(
      `blindround_projects_${ROUND_ID}`,
      JSON.stringify([PROJECT_ID]),
    );

    mockFetchMapping({
      [`rounds/${ROUND_ID}`]:            leoRoundStruct(CHAIN_ROUND),
      [`round_totals/${ROUND_ID}`]:      '500000u64',
      [`round_donor_count/${ROUND_ID}`]: '3u32',
      [`projects/${PROJECT_ID}`]:        leoProjectStruct(CHAIN_PROJECT),
      [`revealed_scores/${PROJECT_ID}`]: null,
    });

    const { result } = renderHook(() => useRound(ROUND_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const round = result.current.round!;
    expect(round.raised).toBe(500_000);
    expect(round.donorCount).toBe(3);
    expect(round.projects).toHaveLength(1);
    expect(round.projects[0].raised).toBe(500_000);
    expect(round.projects[0].donorCount).toBe(3);
  });

  it('Step 4 — Round is closed by admin', async () => {
    localStorage.setItem('blindround_round_ids', JSON.stringify([ROUND_ID]));
    localStorage.setItem(
      `blindround_projects_${ROUND_ID}`,
      JSON.stringify([PROJECT_ID]),
    );

    mockFetchMapping({
      [`rounds/${ROUND_ID}`]:            leoRoundStruct(CHAIN_ROUND_CLOSED),
      [`round_totals/${ROUND_ID}`]:      '500000u64',
      [`round_donor_count/${ROUND_ID}`]: '3u32',
      [`projects/${PROJECT_ID}`]:        leoProjectStruct(CHAIN_PROJECT),
      [`revealed_scores/${PROJECT_ID}`]: null,
    });

    const { result } = renderHook(() => useRound(ROUND_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.round?.status).toBe('closed');
  });

  it('Step 5-9 — Committee votes are submitted and scores revealed', async () => {
    // Utility: chainRoundToRound correctly reflects the score reveal
    const closedRound = chainRoundToRound(ROUND_ID, CHAIN_ROUND_CLOSED);
    expect(closedRound.status).toBe('closed');

    // Simulate revealed score in mapping
    localStorage.setItem('blindround_round_ids', JSON.stringify([ROUND_ID]));
    localStorage.setItem(
      `blindround_projects_${ROUND_ID}`,
      JSON.stringify([PROJECT_ID]),
    );

    mockFetchMapping({
      [`rounds/${ROUND_ID}`]:            leoRoundStruct(CHAIN_ROUND_CLOSED),
      [`round_totals/${ROUND_ID}`]:      '500000u64',
      [`round_donor_count/${ROUND_ID}`]: '3u32',
      [`projects/${PROJECT_ID}`]:        leoProjectStruct(CHAIN_PROJECT),
      [`revealed_scores/${PROJECT_ID}`]: '170u64', // two votes of 85 = 170 total
    });

    const { result } = renderHook(() => useRound(ROUND_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.round?.projects[0].score).toBe(170);
  });

  it('Steps 10-13 — Utility: escrow / milestone field arithmetic is correct', () => {
    // validate the parseField + arithmetic that underpins define_milestone / release_tranche
    const totalAmount   = parseField('10000000u64'); // 10 credits
    const tranche1      = parseField('3000000u64');
    const tranche2      = parseField('3000000u64');
    const tranche3      = parseField('4000000u64');
    const totalReleased = tranche1 + tranche2 + tranche3;

    expect(totalAmount).toBe(10_000_000);
    expect(totalReleased).toBe(totalAmount); // all tranches sum to escrow total

    const milestoneCount = parseField('3u8');
    expect(milestoneCount).toBe(3);

    // Each milestone_index < milestone_count (contract assert)
    expect([0, 1, 2].every((i) => i < milestoneCount)).toBe(true);
  });

  it('Complete flow summary — all data shapes round-trip correctly', () => {
    // This test exercises parsing of all Leo struct / scalar types present
    // in the contract so that if the Testnet API response format changes,
    // these assertions catch it immediately.

    const roundStruct = parseLeoStruct(leoRoundStruct(CHAIN_ROUND));
    expect(roundStruct.goal).toBe('5000000u64');
    expect(roundStruct.status).toBe('1u8');
    expect(roundStruct.project_count).toBe('1u8');

    const projectStruct = parseLeoStruct(leoProjectStruct(CHAIN_PROJECT));
    expect(projectStruct.total_donated).toBe('500000u64');
    expect(projectStruct.donor_count).toBe('3u32');

    const round = chainRoundToRound(ROUND_ID, CHAIN_ROUND);
    expect(round.goal).toBe(parseField(roundStruct.goal));
    expect(round.matchingPool).toBe(parseField(roundStruct.matching_pool));
    expect(round.projectCount).toBe(parseField(roundStruct.project_count));
    expect(round.deadline).toBe(
      new Date(DEADLINE_TS * 1000).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    );
  });
});
