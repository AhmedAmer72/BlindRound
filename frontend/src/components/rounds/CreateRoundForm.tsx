import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, Rocket, ArrowRight } from 'lucide-react';
import { useAleoTransact } from '../../hooks/useAleoTransact';

export default function CreateRoundForm() {
  const navigate = useNavigate();
  const { createRound, loading, error, txId, txStatus } = useAleoTransact();
  const [form, setForm] = useState({
    name: '',
    description: '',
    goal: '',
    matchingPool: '',
    deadline: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [createdRoundId, setCreatedRoundId] = useState<string | null>(null);

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const roundId = `${Date.now()}field`;
    const goalStr = `${form.goal}u64`;
    const deadlineStr = `${Math.floor(new Date(form.deadline).getTime() / 1000)}u32`;
    const matchStr = `${form.matchingPool || '0'}u64`;
    const deadlineDate = new Date(form.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // ── Optimistic save ───────────────────────────────────────────────────
    // Save metadata and add round ID to localStorage BEFORE submitting the
    // transaction so the round appears immediately in the pending list with
    // the correct name (not just the raw field ID).
    const existing: string[] = JSON.parse(localStorage.getItem('blindround_round_ids') ?? '[]');
    if (!existing.includes(roundId)) {
      localStorage.setItem('blindround_round_ids', JSON.stringify([...existing, roundId]));
    }
    localStorage.setItem(`blindround_meta_${roundId}`, JSON.stringify({
      name: form.name,
      description: form.description,
      goal: Number(form.goal),
      matchingPool: Number(form.matchingPool || '0'),
      deadline: deadlineDate,
      txId: null,   // updated below once confirmed
    }));

    const result = await createRound(roundId, goalStr, deadlineStr, matchStr);
    if (result) {
      // Update metadata with the confirmed on-chain TX ID
      const confirmedTxId = (result as any).transactionId ?? null;
      localStorage.setItem(`blindround_meta_${roundId}`, JSON.stringify({
        name: form.name,
        description: form.description,
        goal: Number(form.goal),
        matchingPool: Number(form.matchingPool || '0'),
        deadline: deadlineDate,
        txId: confirmedTxId,
      }));
      setCreatedRoundId(roundId);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-lg text-center"
      >
        <div className="glass-card p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-br-green/10"
          >
            <CheckCircle2 className="h-8 w-8 text-br-green" />
          </motion.div>
          <h3 className="text-2xl font-bold text-white">Round Submitted!</h3>
          <p className="mt-2 text-sm text-white/40">
            Transaction sent to the Aleo network. The round will appear as
            <span className="text-br-amber font-medium"> Confirming…</span> until the block confirms (~30–90s).
          </p>
          {txId && (
            <div className="mt-4 rounded-lg border border-white/[0.04] bg-br-surface/40 p-3 text-left">
              <p className="text-xs text-white/30">Transaction ID</p>
              <p className="mt-1 break-all font-mono text-xs text-br-cyan">{txId}</p>
            </div>
          )}
          <div className="mt-6 flex flex-col gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/rounds')}
              className="btn-primary flex w-full items-center justify-center gap-2"
            >
              View Rounds
              <ArrowRight className="h-4 w-4" />
            </motion.button>
            {createdRoundId && (
              <Link
                to={`/rounds/${createdRoundId}`}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Go to round detail page
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <div className="glass-card p-6 sm:p-8">
        <h3 className="mb-6 text-xl font-bold text-white">Round Details</h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/60">
              Round Name
            </label>
            <input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g., Privacy Tools Grant Q2 2026"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/60">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Describe what this round is funding..."
              rows={3}
              className="input-field resize-none"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/60">
                Funding Goal (USAD)
              </label>
              <input
                type="number"
                value={form.goal}
                onChange={(e) => update('goal', e.target.value)}
                placeholder="50000"
                className="input-field font-mono"
                required
                min={1}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/60">
                Matching Pool (USAD)
              </label>
              <input
                type="number"
                value={form.matchingPool}
                onChange={(e) => update('matchingPool', e.target.value)}
                placeholder="25000"
                className="input-field font-mono"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/60">
              Deadline
            </label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => update('deadline', e.target.value)}
              className="input-field"
              required
            />
          </div>
        </div>
      </div>

      {/* Privacy note */}
      <div className="glass-card flex items-start gap-3 p-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-br-purple/10">
          <Rocket className="h-4 w-4 text-br-purple" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/80">On-Chain Deployment</p>
          <p className="mt-0.5 text-xs text-white/40">
            This transaction will create the round on Aleo Testnet. All donations
            to this round will be private by default — using ZK proofs to hide
            amounts and donor identities.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-br-red/20 bg-br-red/10 p-4 text-sm text-br-red">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary flex w-full items-center justify-center gap-2 py-4 text-base disabled:opacity-40"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            {txStatus || 'Creating Round…'}
          </>
        ) : (
          <>
            <Rocket className="h-5 w-5" />
            Create Funding Round
          </>
        )}
      </button>
    </form>
  );
}
