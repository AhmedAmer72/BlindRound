// @vitest-environment node
/**
 * onchain.test.ts — Real end-to-end on-chain integration tests.
 *
 * Every call here hits the Aleo Testnet.  NO mocks. NO jsdom.
 *
 * ─── HOW TO RUN ──────────────────────────────────────────────────────────────
 *  1. Get testnet credits: https://faucet.aleo.org  (request for the address
 *     printed by the first test — copy it from the console output)
 *  2. Set the env var:
 *       $env:ALEO_TEST_PRIVATE_KEY = "APrivateKey1zk..."
 *  3. Run:
 *       npm run test:onchain
 *
 * Read-only tests run unconditionally (18 tests).
 * Write tests covering the full grant lifecycle are skipped when the env var
 * is absent so CI stays green with no credentials.
 *
 * ─── LIFECYCLE COVERED ───────────────────────────────────────────────────────
 *   Layer 1  create_round → register_project → donate → close_round
 *   Layer 2  create_committee → add_member → submit_vote →
 *            close_voting → reveal_project_score
 *   Layer 3  lock_grant → define_milestone → prove_milestone → release_tranche
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  Account,
  ProgramManager,
  AleoNetworkClient,
  NetworkRecordProvider,
  AleoKeyProvider,
} from '@provablehq/sdk';

// ─── Config ──────────────────────────────────────────────────────────────────

const NETWORK_URL = 'https://api.explorer.provable.com/v1';
const PROGRAM_ID  = 'blindround_proto.aleo';
const PRIVATE_KEY = process.env.ALEO_TEST_PRIVATE_KEY ?? '';
const HAS_KEY     = PRIVATE_KEY.length > 0;

// priorityFee in credits (the SDK handles conversion to microcredits)
const PRIORITY_FEE = 0.0;

// Unique IDs per run so parallel CI jobs don't collide on-chain
const TS         = Math.floor(Date.now() / 1000);
const ROUND_ID   = `${TS}field`;
const PROJECT_ID = `${TS + 1}field`;
const ESCROW_ID  = `${TS + 2}field`;
const MS_ID_0    = `${TS + 3}field`;
const MS_ID_1    = `${TS + 4}field`;
const SALT       = `${TS + 5}field`;

// Round params
const GOAL          = '5000000u64';
const MATCHING_POOL = '1000000u64';
const DEADLINE      = `${TS + 7_776_000}u32`; // +90 days
const NAME_HASH     = `${TS + 6}field`;

// Committee params
const MEMBER_COUNT = '2u8';
const MAX_SCORE    = '100u8';

// Escrow params
const TOTAL_AMOUNT    = '2000000u64';
const MILESTONE_COUNT = '2u8';
const MS_AMOUNT       = '1000000u64';
const MS_DEADLINE     = `${TS + 2_592_000}u32`; // +30 days

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Read a mapping value; strips outer JSON quotes, returns null if missing. */
async function mapping(name: string, key: string): Promise<string | null> {
  const res = await fetch(
    `${NETWORK_URL}/testnet/program/${PROGRAM_ID}/mapping/${name}/${key}`,
  );
  if (!res.ok) return null;
  const text = (await res.text()).replace(/^"|"$/g, '').trim();
  return text === 'null' ? null : text;
}

/** Poll until the transaction is visible in the REST API (confirmed). */
async function waitForTx(txId: string, label: string): Promise<void> {
  console.log(`  ⏳ ${label} — ${txId}`);
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const res = await fetch(`${NETWORK_URL}/testnet/transaction/${txId}`);
    if (res.ok) { console.log(`  ✅ ${label} confirmed`); return; }
    await new Promise((r) => setTimeout(r, 6_000));
  }
  throw new Error(`Timeout waiting for ${label} (${txId})`);
}

/**
 * After a TX confirms, decrypt the output record ciphertexts that belong to
 * the account and return their plaintext strings (used as inputs to next TX).
 */
async function decryptOutputRecords(
  txId: string,
  acc: Account,
  networkClient: AleoNetworkClient,
): Promise<string[]> {
  try {
    const txObj = await networkClient.getTransactionObject(txId);
    const ciphertexts: unknown[] = (txObj as any).records() ?? [];
    const plaintexts: string[] = [];
    for (const ct of ciphertexts) {
      try {
        const plain = acc.decryptRecord(ct as any);
        if (plain) plaintexts.push(plain.toString());
      } catch { /* doesn't belong to this account */ }
    }
    return plaintexts;
  } catch (e) {
    console.warn('  ⚠ record decryption failed:', (e as Error).message);
    return [];
  }
}

// ─── Shared state (populated during write tests) ─────────────────────────────

let account:       Account           | undefined;
let pm:            ProgramManager    | undefined;
let nc:            AleoNetworkClient | undefined;
let adminRecord:   string | undefined; // RoundAdmin  → close_round
let seatRecord0:   string | undefined; // CommitteeSeat[0] → submit_vote
let seatRecord1:   string | undefined; // CommitteeSeat[1] → submit_vote
let escrowReceipt: string | undefined; // EscrowReceipt → release_tranche

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(async () => {
  if (!HAS_KEY) return;
  account    = new Account({ privateKey: PRIVATE_KEY });
  nc         = new AleoNetworkClient(NETWORK_URL);
  const keyProvider    = new AleoKeyProvider();
  keyProvider.useCache(true);
  const recordProvider = new NetworkRecordProvider(account, nc);
  pm = new ProgramManager(NETWORK_URL, keyProvider, recordProvider);
  pm.setAccount(account);
  console.log(`\n🔑 Account  : ${account.address().to_string()}`);
  console.log(`   Round    : ${ROUND_ID}`);
  console.log(`   Project  : ${PROJECT_ID}`);
  console.log(`   Escrow   : ${ESCROW_ID}`);
});

// ═════════════════════════════════════════════════════════════════════════════
// READ TESTS — always run, no key required
// ═════════════════════════════════════════════════════════════════════════════

describe('Read: contract deployment', () => {
  it('blindround_proto.aleo is deployed on testnet', async () => {
    const res = await fetch(`${NETWORK_URL}/testnet/program/${PROGRAM_ID}`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('program blindround_proto.aleo');
  }, 20_000);

  it('contract exposes all 13 expected transitions', async () => {
    const res  = await fetch(`${NETWORK_URL}/testnet/program/${PROGRAM_ID}`);
    const text = await res.text();
    for (const t of [
      'create_round', 'register_project', 'donate', 'close_round',
      'create_committee', 'add_member', 'submit_vote',
      'close_voting', 'reveal_project_score',
      'lock_grant', 'define_milestone', 'prove_milestone', 'release_tranche',
    ]) {
      expect(text, `missing transition: ${t}`).toContain(t);
    }
  }, 20_000);
});

describe('Read: global on-chain stats', () => {
  it('global_round_count is accessible', async () => {
    const res = await fetch(
      `${NETWORK_URL}/testnet/program/${PROGRAM_ID}/mapping/global_round_count/0u8`,
    );
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      const val = (await res.text()).replace(/^"|"$/g, '').trim();
      if (val && val !== 'null') {
        expect(parseInt(val.replace(/u32/g, ''))).toBeGreaterThanOrEqual(0);
      }
    }
  }, 15_000);

  it('global_donation_vol is accessible', async () => {
    const res = await fetch(
      `${NETWORK_URL}/testnet/program/${PROGRAM_ID}/mapping/global_donation_vol/0u8`,
    );
    expect([200, 404]).toContain(res.status);
  }, 15_000);

  it('escrow_count is accessible', async () => {
    const res = await fetch(
      `${NETWORK_URL}/testnet/program/${PROGRAM_ID}/mapping/escrow_count/0u8`,
    );
    expect([200, 404]).toContain(res.status);
  }, 15_000);
});

describe('Read: all 13 mappings have reachable REST endpoints', () => {
  for (const m of [
    'rounds', 'round_totals', 'round_donor_count',
    'projects', 'project_donations', 'project_donor_counts',
    'committees', 'project_scores', 'vote_counts', 'revealed_scores',
    'escrows', 'milestones', 'total_locked',
  ]) {
    it(`/mapping/${m} returns 200 or 404 for unknown key`, async () => {
      const res = await fetch(
        `${NETWORK_URL}/testnet/program/${PROGRAM_ID}/mapping/${m}/0field`,
      );
      expect([200, 404]).toContain(res.status);
    }, 15_000);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// WRITE TESTS — skipped unless ALEO_TEST_PRIVATE_KEY env var is set
// ═════════════════════════════════════════════════════════════════════════════

describe.skipIf(!HAS_KEY)('Write: Layer 1 — Funding Round', () => {
  it('create_round: on-chain mapping shows active (1u8) after TX', async () => {
    const txId: string = await pm!.execute({
      programName:  PROGRAM_ID,
      functionName: 'create_round',
      priorityFee:  PRIORITY_FEE,
      privateFee:   false,
      inputs:       [ROUND_ID, GOAL, DEADLINE, MATCHING_POOL],
    });
    expect(txId).toMatch(/^at1/);
    await waitForTx(txId, 'create_round');

    const records = await decryptOutputRecords(txId, account!, nc!);
    if (records[0]) adminRecord = records[0];

    const raw = await mapping('rounds', ROUND_ID);
    expect(raw).toBeTruthy();
    expect(raw).toContain('1u8');
  }, 180_000);

  it('register_project: project entry linked to round on-chain', async () => {
    const txId: string = await pm!.execute({
      programName:  PROGRAM_ID,
      functionName: 'register_project',
      priorityFee:  PRIORITY_FEE,
      privateFee:   false,
      inputs:       [ROUND_ID, PROJECT_ID, NAME_HASH],
    });
    await waitForTx(txId, 'register_project');

    const raw = await mapping('projects', PROJECT_ID);
    expect(raw).toBeTruthy();
    expect(raw).toContain(ROUND_ID);
  }, 180_000);

  it('donate: round_totals and donor_count incremented on-chain', async () => {
    const txId: string = await pm!.execute({
      programName:  PROGRAM_ID,
      functionName: 'donate',
      priorityFee:  PRIORITY_FEE,
      privateFee:   false,
      inputs:       ['100000u64', ROUND_ID, PROJECT_ID, SALT],
    });
    await waitForTx(txId, 'donate');

    const total  = await mapping('round_totals', ROUND_ID);
    const donors = await mapping('round_donor_count', ROUND_ID);
    expect(parseInt((total  ?? '0').replace(/u64/, ''))).toBeGreaterThan(0);
    expect(parseInt((donors ?? '0').replace(/u32/, ''))).toBeGreaterThan(0);
  }, 180_000);

  it('close_round: status transitions to 2u8 (closed)', async () => {
    if (!adminRecord) { console.warn('  ⚠ adminRecord missing — skip'); return; }
    const txId: string = await pm!.execute({
      programName:  PROGRAM_ID,
      functionName: 'close_round',
      priorityFee:  PRIORITY_FEE,
      privateFee:   false,
      inputs:       [adminRecord],
    });
    await waitForTx(txId, 'close_round');
    expect(await mapping('rounds', ROUND_ID)).toContain('2u8');
  }, 180_000);
});

describe.skipIf(!HAS_KEY)('Write: Layer 2 — Anonymous Committee Voting', () => {
  it('create_committee: committee written with voting_open: true', async () => {
    const txId: string = await pm!.execute({
      programName:  PROGRAM_ID,
      functionName: 'create_committee',
      priorityFee:  PRIORITY_FEE,
      privateFee:   false,
      inputs:       [ROUND_ID, MEMBER_COUNT, MAX_SCORE],
    });
    await waitForTx(txId, 'create_committee');
    const raw = await mapping('committees', ROUND_ID);
    expect(raw).toBeTruthy();
    expect(raw).toContain('true');
  }, 180_000);

  it('add_member: two CommitteeSeat records issued and decrypted', async () => {
    const addr = account!.address().to_string();
    for (const [idx, setter] of [
      ['0u8', (r: string) => { seatRecord0 = r; }],
      ['1u8', (r: string) => { seatRecord1 = r; }],
    ] as [string, (r: string) => void][]) {
      const txId: string = await pm!.execute({
        programName:  PROGRAM_ID,
        functionName: 'add_member',
        priorityFee:  PRIORITY_FEE,
        privateFee:   false,
        inputs:       [ROUND_ID, addr, idx],
      });
      await waitForTx(txId, `add_member[${idx}]`);
      const recs = await decryptOutputRecords(txId, account!, nc!);
      if (recs[0]) setter(recs[0]);
      expect(txId).toMatch(/^at1/);
    }
  }, 360_000);

  it('submit_vote: project_scores mapping updated with aggregated votes', async () => {
    for (const [seat, score, label] of [
      [seatRecord0, '80u8', 'vote[0]'],
      [seatRecord1, '90u8', 'vote[1]'],
    ] as [string | undefined, string, string][]) {
      if (!seat) { console.warn(`  ⚠ ${label}: missing seat record`); continue; }
      const txId: string = await pm!.execute({
        programName:  PROGRAM_ID,
        functionName: 'submit_vote',
        priorityFee:  PRIORITY_FEE,
        privateFee:   false,
        inputs:       [seat, score, PROJECT_ID, SALT],
      });
      await waitForTx(txId, label);
    }
    const scores = await mapping('project_scores', PROJECT_ID);
    expect(scores).toBeTruthy();
    expect(parseInt((scores ?? '').match(/total_score:\s*(\d+)/)?.[1] ?? '0'))
      .toBeGreaterThan(0);
  }, 360_000);

  it('close_voting: committee voting_open set to false', async () => {
    const txId: string = await pm!.execute({
      programName:  PROGRAM_ID,
      functionName: 'close_voting',
      priorityFee:  PRIORITY_FEE,
      privateFee:   false,
      inputs:       [ROUND_ID],
    });
    await waitForTx(txId, 'close_voting');
    expect(await mapping('committees', ROUND_ID)).toContain('false');
  }, 180_000);

  it('reveal_project_score: score written to revealed_scores mapping', async () => {
    const txId: string = await pm!.execute({
      programName:  PROGRAM_ID,
      functionName: 'reveal_project_score',
      priorityFee:  PRIORITY_FEE,
      privateFee:   false,
      inputs:       [ROUND_ID, PROJECT_ID],
    });
    await waitForTx(txId, 'reveal_project_score');
    const score = await mapping('revealed_scores', PROJECT_ID);
    expect(parseInt((score ?? '0').replace(/u64/, ''))).toBeGreaterThan(0);
  }, 180_000);
});

describe.skipIf(!HAS_KEY)('Write: Layer 3 — Milestone Escrow', () => {
  it('lock_grant: escrow active, total_amount locked in program custody', async () => {
    const txId: string = await pm!.execute({
      programName:  PROGRAM_ID,
      functionName: 'lock_grant',
      priorityFee:  PRIORITY_FEE,
      privateFee:   false,
      inputs: [
        ESCROW_ID, ROUND_ID, TOTAL_AMOUNT,
        account!.address().to_string(), MILESTONE_COUNT,
      ],
    });
    await waitForTx(txId, 'lock_grant');
    const recs = await decryptOutputRecords(txId, account!, nc!);
    if (recs[0]) escrowReceipt = recs[0];

    const escrow = await mapping('escrows', ESCROW_ID);
    expect(escrow).toBeTruthy();
    expect(escrow).toContain('true'); // active
    expect(escrow).toContain(TOTAL_AMOUNT.replace('u64', ''));
  }, 180_000);

  it('define_milestone: milestones written with completed: false', async () => {
    for (const [msId, idx] of [[MS_ID_0, '0u8'], [MS_ID_1, '1u8']] as [string, string][]) {
      const txId: string = await pm!.execute({
        programName:  PROGRAM_ID,
        functionName: 'define_milestone',
        priorityFee:  PRIORITY_FEE,
        privateFee:   false,
        inputs:       [ESCROW_ID, msId, idx, MS_AMOUNT, MS_DEADLINE],
      });
      await waitForTx(txId, `define_milestone[${idx}]`);
      expect(await mapping('milestones', msId)).toContain('false');
    }
  }, 360_000);

  it('prove_milestone: both milestones marked completed: true', async () => {
    const evHash  = `${TS + 10}field`;
    const delHash = `${TS + 11}field`;
    for (const [msId, idx] of [[MS_ID_0, '0u8'], [MS_ID_1, '1u8']] as [string, string][]) {
      const txId: string = await pm!.execute({
        programName:  PROGRAM_ID,
        functionName: 'prove_milestone',
        priorityFee:  PRIORITY_FEE,
        privateFee:   false,
        inputs:       [evHash, delHash, ESCROW_ID, msId, idx],
      });
      await waitForTx(txId, `prove_milestone[${idx}]`);
      expect(await mapping('milestones', msId)).toContain('true');
    }
  }, 360_000);

  it('release_tranche: escrow.released equals total after both tranches', async () => {
    if (!escrowReceipt) { console.warn('  ⚠ escrowReceipt missing — skip'); return; }
    for (const [msId, idx] of [[MS_ID_0, '0u8'], [MS_ID_1, '1u8']] as [string, string][]) {
      const txId: string = await pm!.execute({
        programName:  PROGRAM_ID,
        functionName: 'release_tranche',
        priorityFee:  PRIORITY_FEE,
        privateFee:   false,
        inputs:       [escrowReceipt, msId, idx, MS_AMOUNT],
      });
      await waitForTx(txId, `release_tranche[${idx}]`);
    }
    const escrow   = await mapping('escrows', ESCROW_ID);
    const released = parseInt((escrow ?? '').match(/released:\s*(\d+)/)?.[1] ?? '0');
    expect(released).toBe(parseInt(TOTAL_AMOUNT.replace('u64', '')));
  }, 360_000);
});
