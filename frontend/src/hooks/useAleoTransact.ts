import { useCallback, useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { PROGRAMS } from '../utils/constants';

export function useAleoTransact() {
  const { connected, executeTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  const execute = useCallback(
    async (
      programId: string,
      functionName: string,
      inputs: string[],
    ) => {
      if (!connected || !executeTransaction) {
        setError('Wallet not connected');
        return null;
      }
      setLoading(true);
      setError(null);
      setTxId(null);

      try {
        const result = await executeTransaction({
          program: programId,
          function: functionName,
          inputs,
        });
        setTxId(result?.transactionId ?? null);
        return result;
      } catch (err: any) {
        const msg = err?.message || 'Transaction failed';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [connected, executeTransaction],
  );

  // ── Layer 1: Funding Round ─────────────────────────────────────────────
  const createRound = useCallback(
    (roundId: string, goal: string, deadline: string, matchingPool: string) =>
      execute(PROGRAMS.FUNDING_ROUND, 'create_round', [roundId, goal, deadline, matchingPool]),
    [execute],
  );

  const registerProject = useCallback(
    (roundId: string, projectId: string, nameHash: string) =>
      execute(PROGRAMS.FUNDING_ROUND, 'register_project', [roundId, projectId, nameHash]),
    [execute],
  );

  const donate = useCallback(
    (creditsRecord: string, amount: string, roundId: string, projectId: string, salt: string) =>
      execute(PROGRAMS.FUNDING_ROUND, 'donate', [creditsRecord, amount, roundId, projectId, salt]),
    [execute],
  );

  const closeRound = useCallback(
    (adminRecord: string) =>
      execute(PROGRAMS.FUNDING_ROUND, 'close_round', [adminRecord]),
    [execute],
  );

  // ── Layer 2: Committee Voting ───────────────────────────────────────────
  const createCommittee = useCallback(
    (roundId: string, memberCount: string, maxScore: string) =>
      execute(PROGRAMS.GRANT_COMMITTEE, 'create_committee', [roundId, memberCount, maxScore]),
    [execute],
  );

  const addMember = useCallback(
    (roundId: string, member: string, memberIndex: string) =>
      execute(PROGRAMS.GRANT_COMMITTEE, 'add_member', [roundId, member, memberIndex]),
    [execute],
  );

  const submitVote = useCallback(
    (seatRecord: string, score: string, projectId: string, salt: string) =>
      execute(PROGRAMS.GRANT_COMMITTEE, 'submit_vote', [seatRecord, score, projectId, salt]),
    [execute],
  );

  const closeVoting = useCallback(
    (roundId: string) =>
      execute(PROGRAMS.GRANT_COMMITTEE, 'close_voting', [roundId]),
    [execute],
  );

  const revealProjectScore = useCallback(
    (roundId: string, projectId: string) =>
      execute(PROGRAMS.GRANT_COMMITTEE, 'reveal_project_score', [roundId, projectId]),
    [execute],
  );

  // ── Layer 3: Milestone Escrow ───────────────────────────────────────────
  const lockGrant = useCallback(
    (
      creditsRecord: string,
      escrowId: string,
      roundId: string,
      totalAmount: string,
      recipient: string,
      milestoneCount: string,
    ) =>
      execute(PROGRAMS.MILESTONE_ESCROW, 'lock_grant', [
        creditsRecord, escrowId, roundId, totalAmount, recipient, milestoneCount,
      ]),
    [execute],
  );

  const defineMilestone = useCallback(
    (
      escrowId: string,
      milestoneId: string,
      milestoneIndex: string,
      amount: string,
      deadline: string,
    ) =>
      execute(PROGRAMS.MILESTONE_ESCROW, 'define_milestone', [
        escrowId, milestoneId, milestoneIndex, amount, deadline,
      ]),
    [execute],
  );

  const proveMilestone = useCallback(
    (
      evidenceHash: string,
      deliverableHash: string,
      escrowId: string,
      milestoneId: string,
      milestoneIndex: string,
    ) =>
      execute(PROGRAMS.MILESTONE_ESCROW, 'prove_milestone', [
        evidenceHash, deliverableHash, escrowId, milestoneId, milestoneIndex,
      ]),
    [execute],
  );

  const releaseTranche = useCallback(
    (
      escrowReceipt: string,
      milestoneId: string,
      milestoneIndex: string,
      payoutAmount: string,
    ) =>
      execute(PROGRAMS.MILESTONE_ESCROW, 'release_tranche', [
        escrowReceipt, milestoneId, milestoneIndex, payoutAmount,
      ]),
    [execute],
  );

  return {
    loading,
    error,
    txId,
    execute,
    // Layer 1
    createRound,
    registerProject,
    donate,
    closeRound,
    // Layer 2
    createCommittee,
    addMember,
    submitVote,
    closeVoting,
    revealProjectScore,
    // Layer 3
    lockGrant,
    defineMilestone,
    proveMilestone,
    releaseTranche,
  };
}
