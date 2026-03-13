import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  CheckCircle2,
  Circle,
  Lock,
  Upload,
  Shield,
  Clock,
  DollarSign,
  FileCheck,
  Loader2,
  Search,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { FadeInUp } from '../components/ui/Animations';
import ProgressBar from '../components/ui/ProgressBar';
import { useEscrow } from '../hooks/useChainData';
import { useAleoTransact } from '../hooks/useAleoTransact';
import { PROGRAM_ID } from '../utils/constants';

export default function Milestones() {
  const { connected, requestRecords } = useWallet();
  const [escrowIdInput, setEscrowIdInput] = useState('');
  const [activeEscrowId, setActiveEscrowId] = useState<string | undefined>();
  const { escrow, milestones, loading: escrowLoading } = useEscrow(activeEscrowId);
  const [provingIndex, setProvingIndex] = useState<number | null>(null);
  const [releasingIndex, setReleasingIndex] = useState<number | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [txError, setTxError] = useState<string | null>(null);

  // Grantor setup state
  const [grantorOpen, setGrantorOpen] = useState(false);
  const [grantRoundId, setGrantRoundId] = useState('');
  const [grantAmount, setGrantAmount] = useState('');
  const [grantRecipient, setGrantRecipient] = useState('');
  const [grantMilestoneCount, setGrantMilestoneCount] = useState('3');
  const [creditsRecord, setCreditsRecord] = useState<string | null>(null);
  const [escrowReceipt, setEscrowReceipt] = useState<string | null>(null);
  const [grantTxId, setGrantTxId] = useState<string | null>(null);

  // Define milestone state
  const [defineOpen, setDefineOpen] = useState(false);
  const [msAmount, setMsAmount] = useState('');
  const [msDeadline, setMsDeadline] = useState('');

  const { proveMilestone, lockGrant, defineMilestone, releaseTranche, loading: grantLoading } = useAleoTransact();

  // Auto-fetch credits record when grantor panel opens
  useEffect(() => {
    if (!connected || !requestRecords || !grantorOpen) return;
    (requestRecords as (p: string) => Promise<any[]>)('credits.aleo')
      .then((all) => { if (all.length > 0) setCreditsRecord(JSON.stringify(all[0])); })
      .catch(() => {});
  }, [connected, requestRecords, grantorOpen]);

  // Auto-fetch EscrowReceipt for actively loaded escrow
  useEffect(() => {
    if (!connected || !requestRecords || !activeEscrowId) { setEscrowReceipt(null); return; }
    (requestRecords as (p: string) => Promise<any[]>)(PROGRAM_ID)
      .then((all) => {
        const r = all.find(
          (rec: any) => rec.recordName === 'EscrowReceipt' && rec.data?.escrow_id === activeEscrowId,
        );
        setEscrowReceipt(r ? JSON.stringify(r) : null);
      })
      .catch(() => setEscrowReceipt(null));
  }, [connected, requestRecords, activeEscrowId]);

  const handleLockGrant = async () => {
    if (!creditsRecord || !grantRoundId || !grantAmount || !grantRecipient) return;
    const escrowId = `${Date.now()}field`;
    const normalizedRoundId = grantRoundId.trim().endsWith('field')
      ? grantRoundId.trim() : `${grantRoundId.trim()}field`;
    const result = await lockGrant(
      creditsRecord, escrowId, normalizedRoundId,
      `${grantAmount}u64`, grantRecipient.trim(), `${grantMilestoneCount}u8`,
    );
    if (result) {
      const existing: string[] = JSON.parse(localStorage.getItem('blindround_escrow_ids') ?? '[]');
      if (!existing.includes(escrowId))
        localStorage.setItem('blindround_escrow_ids', JSON.stringify([...existing, escrowId]));
      setGrantTxId((result as any).transactionId ?? 'submitted');
      setEscrowIdInput(escrowId.replace('field', ''));
      setActiveEscrowId(escrowId);
      setGrantorOpen(false);
    }
  };

  const handleDefineMilestone = async () => {
    if (!activeEscrowId || !msAmount || !msDeadline) return;
    const milestoneId = `${Date.now()}field`;
    const milestoneIndex = milestones.length;
    const deadlineTs = `${Math.floor(new Date(msDeadline).getTime() / 1000)}u32`;
    const result = await defineMilestone(
      activeEscrowId, milestoneId, `${milestoneIndex}u8`, `${msAmount}u64`, deadlineTs,
    );
    if (result) {
      const key = `blindround_milestones_${activeEscrowId}`;
      const existing: string[] = JSON.parse(localStorage.getItem(key) ?? '[]');
      if (!existing.includes(milestoneId))
        localStorage.setItem(key, JSON.stringify([...existing, milestoneId]));
      setMsAmount(''); setMsDeadline(''); setDefineOpen(false);
    }
  };

  const handleReleaseTranche = async (milestoneId: string, idx: number, amount: number) => {
    if (!activeEscrowId || !escrowReceipt) return;
    setReleasingIndex(idx);
    setTxError(null);
    try {
      await releaseTranche(escrowReceipt, milestoneId, `${idx}u8`, `${amount}u64`);
    } catch (e: any) {
      setTxError(e?.message ?? 'Release failed');
    } finally {
      setReleasingIndex(null);
    }
  };

  const handleLoad = () => {
    const trimmed = escrowIdInput.trim();
    if (!trimmed) return;
    const normalized = trimmed.endsWith('field') ? trimmed : `${trimmed}field`;
    setActiveEscrowId(normalized);
    setTxError(null);
  };

  const parseField = (f: string) => parseInt(f.replace('field', '').replace('u64', '').replace('u32', ''));

  const totalAmount = escrow ? parseField(escrow.total_amount) : 0;
  const releasedAmount = escrow ? parseField(escrow.released) : 0;
  const completedCount = escrow ? parseField(escrow.milestones_completed) : 0;
  const milestoneCount = escrow ? parseField(escrow.milestone_count) : milestones.length;

  const handleProve = async (milestoneId: string, idx: number, amount: number) => {
    if (!activeEscrowId) return;
    setProvingIndex(idx);
    setSelectedAmount(amount);
    setTxError(null);
    try {
      // evidenceHash and deliverableHash are submitted as field literals
      const evidenceHash = `${Date.now()}field`;
      const deliverableHash = `${Date.now() + 1}field`;
      await proveMilestone(evidenceHash, deliverableHash, activeEscrowId, milestoneId, `${idx}u8`);
      setShowProofModal(true);
    } catch (e: any) {
      setTxError(e?.message ?? 'Proof submission failed');
    } finally {
      setProvingIndex(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <FadeInUp>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Milestone <span className="text-gradient-pink" style={{ backgroundImage: 'linear-gradient(135deg, #ec4899, #f472b6)' }}>Escrow</span>
          </h1>
          <p className="mt-2 text-white/40">
            Prove deliverables without exposing details. Tranches release automatically.
          </p>
        </div>
      </FadeInUp>

      {/* Grantor Setup Escrow */}
      <FadeInUp delay={0.03}>
        <div className="glass-card mb-6 p-6">
          <button
            onClick={() => setGrantorOpen(!grantorOpen)}
            className="flex w-full items-center justify-between text-sm font-semibold text-white/60 hover:text-white/80 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Setup New Escrow <span className="text-white/30 font-normal">(Grantor)</span>
            </span>
            {grantorOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {grantorOpen && (
            <div className="mt-5 space-y-4 border-t border-white/[0.04] pt-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-white/40">Round ID</label>
                  <input value={grantRoundId} onChange={(e) => setGrantRoundId(e.target.value)}
                    placeholder="1741908000000field" className="input-field text-sm font-mono" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/40">Total Amount (microcredits)</label>
                  <input type="number" value={grantAmount} onChange={(e) => setGrantAmount(e.target.value)}
                    placeholder="1000000" className="input-field text-sm" min={1} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/40">Recipient Address</label>
                  <input value={grantRecipient} onChange={(e) => setGrantRecipient(e.target.value)}
                    placeholder="aleo1…" className="input-field text-sm font-mono" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/40">Milestones (1–10)</label>
                  <input type="number" value={grantMilestoneCount} onChange={(e) => setGrantMilestoneCount(e.target.value)}
                    placeholder="3" className="input-field text-sm" min={1} max={10} />
                </div>
              </div>
              {!creditsRecord && connected && (
                <p className="text-xs text-br-amber/70">Loading credits record from wallet…</p>
              )}
              {!connected && <p className="text-xs text-white/30">Connect Shield Wallet to lock a grant.</p>}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleLockGrant}
                disabled={grantLoading || !creditsRecord || !grantRoundId || !grantAmount || !grantRecipient}
                className="btn-primary text-sm disabled:opacity-40"
              >
                {grantLoading ? 'Locking…' : 'Lock Grant'}
              </motion.button>
              {grantTxId && (
                <p className="font-mono text-xs text-br-green break-all">✓ Escrow locked · tx: {grantTxId}</p>
              )}
            </div>
          )}
        </div>
      </FadeInUp>

      {/* Escrow ID search */}
      <FadeInUp delay={0.05}>
        <div className="mb-8 flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
            <input
              value={escrowIdInput}
              onChange={(e) => setEscrowIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
              placeholder="Escrow field ID (e.g. 1field)"
              className="input-field pl-10"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleLoad}
            disabled={!escrowIdInput.trim()}
            className="btn-primary px-5 text-sm disabled:opacity-40"
          >
            Load Escrow
          </motion.button>
        </div>
      </FadeInUp>

      {txError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-br-red/20 bg-br-red/5 px-4 py-3 text-xs text-br-red">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {txError}
        </div>
      )}

      {escrowLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-br-cyan border-t-transparent" />
        </div>
      )}

      {!escrowLoading && activeEscrowId && !escrow && (
        <div className="glass-card py-12 text-center">
          <AlertCircle className="mx-auto mb-2 h-7 w-7 text-br-red/60" />
          <p className="text-sm text-white/40">Escrow not found on-chain.</p>
        </div>
      )}

      {!escrowLoading && escrow && (
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main timeline */}
        <div className="lg:col-span-2">
          {/* Escrow summary card */}
          <FadeInUp delay={0.1}>
            <div className="glass-card mb-6 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">
                  Escrow <span className="font-mono text-xs text-white/40">{activeEscrowId}</span>
                </h3>
                <div className="rounded-lg bg-br-green/10 px-3 py-1 text-xs font-semibold text-br-green">
                  In Progress
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 rounded-xl border border-white/[0.04] bg-br-bg/40 p-4">
                <div className="text-center">
                  <DollarSign className="mx-auto mb-1 h-4 w-4 text-white/20" />
                  <p className="text-lg font-bold text-white">${totalAmount.toLocaleString()}</p>
                  <p className="text-[10px] text-white/30">Total Grant</p>
                </div>
                <div className="text-center">
                  <FileCheck className="mx-auto mb-1 h-4 w-4 text-white/20" />
                  <p className="text-lg font-bold text-br-green">${releasedAmount.toLocaleString()}</p>
                  <p className="text-[10px] text-white/30">Released</p>
                </div>
                <div className="text-center">
                  <Target className="mx-auto mb-1 h-4 w-4 text-white/20" />
                  <p className="text-lg font-bold text-br-cyan">{completedCount}/{milestoneCount}</p>
                  <p className="text-[10px] text-white/30">Milestones</p>
                </div>
              </div>

              <div className="mt-4">
                <ProgressBar value={releasedAmount} max={totalAmount} color="green" showLabel />
              </div>
            </div>
          </FadeInUp>

          {milestones.length === 0 ? (
            <div className="glass-card flex flex-col items-center py-12 text-center">
              <Target className="mb-2 h-7 w-7 text-white/10" />
              <p className="text-sm text-white/30">No milestones found for this escrow.</p>
              <p className="mt-1 text-xs text-white/20">Milestones are tracked in localStorage after creation.</p>
            </div>
          ) : (
          <div className="relative space-y-0">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-br-green via-br-cyan/20 to-transparent" />

            {milestones.map((milestone, i) => {
              const idx = parseInt(milestone.milestone_index.replace('u32', ''));
              const amount = parseInt(milestone.amount.replace('u64', '').replace('field', ''));
              const isCompleted = milestone.completed === 'true';
              const isPending = !isCompleted && (i === 0 || milestones[i - 1]?.completed === 'true');
              const isProving = provingIndex === idx;

              return (
                <FadeInUp key={milestone.id} delay={0.1 + i * 0.08}>
                  <div className="relative flex gap-4 pb-8">
                    {/* Timeline dot */}
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                          isCompleted
                            ? 'border-br-green bg-br-green/20'
                            : isPending
                            ? 'border-br-cyan bg-br-cyan/10'
                            : 'border-white/10 bg-br-bg'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-br-green" />
                        ) : isProving ? (
                          <Loader2 className="h-4 w-4 animate-spin text-br-cyan" />
                        ) : (
                          <Circle className="h-4 w-4 text-white/20" />
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className={`glass-card flex-1 overflow-hidden p-5 ${isPending ? 'ring-1 ring-br-cyan/20' : ''}`}>
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white/20">
                              Milestone {idx + 1}
                            </span>
                            {isCompleted && (
                              <span className="rounded bg-br-green/10 px-1.5 py-0.5 text-[10px] font-semibold text-br-green">
                                Verified
                              </span>
                            )}
                          </div>
                          <h4 className="mt-1 font-mono text-sm text-white/70">{milestone.id}</h4>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-white/60">
                          ${amount.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-white/20">
                          <Clock className="h-3 w-3" />
                          {milestone.deadline}
                        </div>

                        {!isCompleted && isPending && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleProve(milestone.id, idx, amount)}
                            disabled={isProving}
                            className="flex items-center gap-1.5 rounded-lg bg-br-cyan/10 px-3 py-1.5 text-xs font-semibold text-br-cyan transition-colors hover:bg-br-cyan/20 disabled:opacity-50"
                          >
                            {isProving ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Proving...
                              </>
                            ) : (
                              <>
                                <Upload className="h-3 w-3" />
                                Submit Proof
                              </>
                            )}
                          </motion.button>
                        )}

                        {isCompleted && (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-xs text-br-green">
                              <Shield className="h-3 w-3" />
                              ZK Verified
                            </div>
                            {escrowReceipt && releasingIndex !== idx && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleReleaseTranche(milestone.id, idx, amount)}
                                className="flex items-center gap-1.5 rounded-lg bg-br-green/10 px-3 py-1.5 text-xs font-semibold text-br-green hover:bg-br-green/20 transition-colors"
                              >
                                <Send className="h-3 w-3" />
                                Release Tranche
                              </motion.button>
                            )}
                            {releasingIndex === idx && (
                              <div className="flex items-center gap-1 text-xs text-white/40">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Releasing…
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </FadeInUp>
              );
            })}
          </div>
          )}

          {/* Define New Milestone */}
          {escrow && escrow.active === 'true' && (
            <div className="mt-6">
              <div className="glass-card p-5">
                <button
                  onClick={() => setDefineOpen(!defineOpen)}
                  className="flex w-full items-center justify-between text-xs font-semibold text-white/40 hover:text-white/60 transition-colors"
                >
                  <span>+ Define New Milestone</span>
                  {defineOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {defineOpen && (
                  <div className="mt-4 space-y-3 border-t border-white/[0.04] pt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs text-white/40">Amount (microcredits)</label>
                        <input type="number" value={msAmount} onChange={(e) => setMsAmount(e.target.value)}
                          placeholder="100000" className="input-field text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-white/40">Deadline</label>
                        <input type="date" value={msDeadline} onChange={(e) => setMsDeadline(e.target.value)}
                          className="input-field text-sm" />
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleDefineMilestone}
                      disabled={grantLoading || !msAmount || !msDeadline}
                      className="btn-primary text-xs disabled:opacity-40"
                    >
                      {grantLoading ? 'Submitting…' : 'Define Milestone'}
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <FadeInUp delay={0.15}>
            <div className="glass-card p-6">
              <h3 className="mb-4 text-sm font-semibold text-white/60">Escrow Details</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/30">Program</span>
                  <span className="font-mono text-br-cyan">{PROGRAM_ID}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/30">Escrow ID</span>
                  <span className="font-mono text-white/60">{activeEscrowId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/30">Grantor</span>
                  <span className="font-mono text-white/60">{escrow?.grantor?.slice(0, 14) ?? '—'}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/30">Currency</span>
                  <span className="font-semibold text-white/80">USAD</span>
                </div>
              </div>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <div className="glass-card p-6">
              <h3 className="mb-4 text-sm font-semibold text-white/60">Privacy Status</h3>
              <div className="space-y-2 text-xs text-white/30">
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-br-green" />
                  Grant amount: <span className="text-br-green font-semibold">Private</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-br-green" />
                  Evidence hashes: <span className="text-br-green font-semibold">Private</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-br-amber" />
                  Milestone status: <span className="text-br-amber font-semibold">Public</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-br-cyan" />
                  Proofs: <span className="text-br-cyan font-semibold">On-Chain</span>
                </div>
              </div>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.25}>
            <div className="glass-card overflow-hidden">
              <div className="border-b border-white/[0.04] bg-br-purple/[0.03] px-6 py-3">
                <h3 className="text-sm font-semibold text-white/60">How It Works</h3>
              </div>
              <div className="space-y-4 p-6">
                {[
                  { step: '1', text: 'Grant locked in ZK escrow' },
                  { step: '2', text: 'Recipient submits private evidence hash' },
                  { step: '3', text: 'ZK proof verifies milestone completion' },
                  { step: '4', text: 'Tranche auto-released to recipient' },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-br-purple/10 text-[10px] font-bold text-br-purple">
                      {step}
                    </div>
                    <p className="text-xs text-white/40">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeInUp>
        </div>
      </div>
      )}

      {/* Proof success modal */}
      <AnimatePresence>
        {showProofModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowProofModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="glass-card relative z-10 mx-4 w-full max-w-md p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-br-green/10"
              >
                <Shield className="h-8 w-8 text-br-green" />
              </motion.div>
              <h3 className="text-xl font-bold text-white">Milestone Proof Verified!</h3>
              <p className="mt-2 text-sm text-white/40">
                The ZK proof has been verified on-chain. The next tranche of
                ${selectedAmount.toLocaleString()} USAD will be released
                to the recipient.
              </p>
              <button
                onClick={() => setShowProofModal(false)}
                className="btn-primary mt-6 w-full"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
