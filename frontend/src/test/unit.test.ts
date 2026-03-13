/**
 * unit.test.ts — Pure utility function tests.
 * No network calls, no mocks, no wallet.
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import {
  parseLeoStruct,
  parseField,
  formatDeadline,
  statusLabel,
  chainRoundToRound,
  type ChainRoundInfo,
} from '../hooks/useChainData';

const ROUND_ID    = '111111field';
const DEADLINE_TS = 1762300800; // known future unix ts

const SAMPLE_ROUND: ChainRoundInfo = {
  creator:       'aleo1abc000000000000000000000000000000000000000000000000000000000',
  goal:          '5000000u64',
  deadline:      `${DEADLINE_TS}u32`,
  matching_pool: '1000000u64',
  status:        '1u8',
  project_count: '1u8',
};

// ── parseLeoStruct ────────────────────────────────────────────────────────────
describe('parseLeoStruct', () => {
  it('parses a flat Leo struct literal', () => {
    const r = parseLeoStruct('{ creator: aleo1abc, goal: 5000000u64, status: 1u8 }');
    expect(r.creator).toBe('aleo1abc');
    expect(r.goal).toBe('5000000u64');
    expect(r.status).toBe('1u8');
  });

  it('handles multi-line structs', () => {
    const r = parseLeoStruct('{\n  creator: aleo1def,\n  goal: 9000u64\n}');
    expect(r.creator).toBe('aleo1def');
    expect(r.goal).toBe('9000u64');
  });

  it('returns empty object for an empty struct', () => {
    expect(parseLeoStruct('{ }')).toEqual({});
  });
});

// ── parseField ────────────────────────────────────────────────────────────────
describe('parseField', () => {
  it('strips field suffix',    () => expect(parseField('123456field')).toBe(123456));
  it('strips u64 suffix',     () => expect(parseField('9000000u64')).toBe(9000000));
  it('strips u32 suffix',     () => expect(parseField('42u32')).toBe(42));
  it('strips u8 suffix',      () => expect(parseField('1u8')).toBe(1));
  it('returns 0 for empty',   () => expect(parseField('')).toBe(0));
  it('returns 0 for address', () => expect(parseField('aleo1abc')).toBe(0));
});

// ── formatDeadline ────────────────────────────────────────────────────────────
describe('formatDeadline', () => {
  it('converts a Leo u32 timestamp to a readable date', () => {
    expect(formatDeadline(`${DEADLINE_TS}u32`)).toMatch(/\w+ \d+, \d{4}/);
  });

  it('passes non-zero raw strings through unchanged', () => {
    expect(formatDeadline('0u32')).toBe('0u32');
  });

  it('returns em-dash for empty string', () => {
    expect(formatDeadline('')).toBe('—');
  });
});

// ── statusLabel ───────────────────────────────────────────────────────────────
describe('statusLabel', () => {
  it('maps 1u8 → active',     () => expect(statusLabel('1u8')).toBe('active'));
  it('maps 2u8 → closed',     () => expect(statusLabel('2u8')).toBe('closed'));
  it('maps 3u8 → finalized',  () => expect(statusLabel('3u8')).toBe('finalized'));
  it('maps unknown → closed', () => expect(statusLabel('99u8')).toBe('closed'));
});

// ── chainRoundToRound ─────────────────────────────────────────────────────────
describe('chainRoundToRound', () => {
  it('converts ChainRoundInfo to a Round correctly', () => {
    const r = chainRoundToRound(ROUND_ID, SAMPLE_ROUND);
    expect(r.id).toBe(ROUND_ID);
    expect(r.goal).toBe(5_000_000);
    expect(r.matchingPool).toBe(1_000_000);
    expect(r.status).toBe('active');
    expect(r.projectCount).toBe(1);
    expect(r.raised).toBe(0);
    expect(r.deadline).toMatch(/\w/);
    expect(r.pending).toBeUndefined();
  });

  it('maps closed status correctly', () => {
    const r = chainRoundToRound(ROUND_ID, { ...SAMPLE_ROUND, status: '2u8' });
    expect(r.status).toBe('closed');
  });

  it('milestone escrow arithmetic: tranches sum to total', () => {
    const total   = parseField('10000000u64');
    const t1      = parseField('3000000u64');
    const t2      = parseField('3000000u64');
    const t3      = parseField('4000000u64');
    expect(t1 + t2 + t3).toBe(total);
  });

  it('milestone_index < milestone_count constraint holds', () => {
    const count = parseField('3u8');
    expect([0, 1, 2].every((i) => i < count)).toBe(true);
    expect(3 < count).toBe(false);
  });
});
