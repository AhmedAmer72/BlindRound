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

  const createRound = useCallback(
    (roundId: string, goal: string, deadline: string, matchingPool: string) =>
      execute(PROGRAMS.FUNDING_ROUND, 'create_round', [
        roundId,
        goal,
        deadline,
        matchingPool,
      ]),
    [execute],
  );

  const donate = useCallback(
    (creditsRecord: string, amount: string, roundId: string, projectId: string, salt: string) =>
      execute(PROGRAMS.FUNDING_ROUND, 'donate', [
        creditsRecord,
        amount,
        roundId,
        projectId,
        salt,
      ]),
    [execute],
  );

  const closeRound = useCallback(
    (adminRecord: string) =>
      execute(PROGRAMS.FUNDING_ROUND, 'close_round', [adminRecord]),
    [execute],
  );

  const submitVote = useCallback(
    (seatRecord: string, score: string, projectId: string, salt: string) =>
      execute(PROGRAMS.GRANT_COMMITTEE, 'submit_vote', [
        seatRecord,
        score,
        projectId,
        salt,
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
        evidenceHash,
        deliverableHash,
        escrowId,
        milestoneId,
        milestoneIndex,
      ]),
    [execute],
  );

  return {
    loading,
    error,
    txId,
    createRound,
    donate,
    closeRound,
    submitVote,
    proveMilestone,
    execute,
  };
}
