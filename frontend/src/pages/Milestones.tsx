import { useState } from 'react';
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
} from 'lucide-react';
import { FadeInUp } from '../components/ui/Animations';
import ProgressBar from '../components/ui/ProgressBar';
import { useEscrow } from '../hooks/useChainData';
import { useAleoTransact } from '../hooks/useAleoTransact';
import { PROGRAM_ID } from '../utils/constants';

export default function Milestones() {
  const [escrowIdInput, setEscrowIdInput] = useState('');
  const [activeEscrowId, setActiveEscrowId] = useState<string | undefined>();
  const { escrow, milestones, loading: escrowLoading } = useEscrow(activeEscrowId);
  const [provingIndex, setProvingIndex] = useState<number | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [txError, setTxError] = useState<string | null>(null);
  const { proveMilestone } = useAleoTransact();

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
      await proveMilestone(activeEscrowId, milestoneId, idx);
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
                          <div className="flex items-center gap-1 text-xs text-br-green">
                            <Shield className="h-3 w-3" />
                            ZK Verified
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
