import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Shield, Lock, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { useAleoTransact } from '../../hooks/useAleoTransact';
import type { Project } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  roundId: string;
  project: Project | null;
}

export default function DonateModal({ open, onClose, roundId, project }: Props) {
  const [amount, setAmount] = useState('');
  const [showAmount, setShowAmount] = useState(false);
  const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input');
  const { donate, loading, error, txId } = useAleoTransact();

  const handleDonate = async () => {
    if (!amount || !project) return;
    setStep('confirm');

    const salt = `${Date.now()}field`;
    const amountStr = `${amount}u64`;
    const result = await donate(amountStr, roundId, project.fieldId, salt);

    if (result) {
      setStep('success');
    } else {
      setStep('input');
    }
  };

  const reset = () => {
    setAmount('');
    setStep('input');
    onClose();
  };

  const presets = [10, 50, 100, 500];

  return (
    <Modal open={open} onClose={reset} title="Private Donation">
      {step === 'input' && (
        <div className="space-y-5">
          {/* Privacy shield notice */}
          <div className="flex items-start gap-3 rounded-xl border border-br-cyan/10 bg-br-cyan/[0.03] p-4">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-br-cyan" />
            <div>
              <p className="text-sm font-medium text-white/80">Zero-Knowledge Protected</p>
              <p className="mt-0.5 text-xs text-white/40">
                Your donation amount and identity are hidden via ZK proof. Only the
                round total is updated on-chain.
              </p>
            </div>
          </div>

          {/* Project info */}
          {project && (
            <div className="rounded-xl border border-white/[0.04] bg-br-surface/40 p-4">
              <p className="text-xs text-white/30">Donating to</p>
              <p className="mt-1 font-semibold text-white">{project.name}</p>
            </div>
          )}

          {/* Amount input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white/60">
              Amount (USAD)
            </label>
            <div className="relative">
              <input
                type={showAmount ? 'text' : 'password'}
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter amount"
                className="input-field pr-10 text-lg font-mono"
              />
              <button
                onClick={() => setShowAmount(!showAmount)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showAmount ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>

            {/* Presets */}
            <div className="mt-3 flex gap-2">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(String(p))}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                    amount === String(p)
                      ? 'border-br-cyan/40 bg-br-cyan/10 text-br-cyan'
                      : 'border-white/[0.06] text-white/40 hover:border-white/10 hover:text-white/60'
                  }`}
                >
                  ${p}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-br-red/20 bg-br-red/10 p-3 text-xs text-br-red">
              {error}
            </div>
          )}

          <button
            onClick={handleDonate}
            disabled={!amount || loading}
            className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-40"
          >
            <Lock className="h-4 w-4" />
            Donate Privately
          </button>
        </div>
      )}

      {step === 'confirm' && (
        <div className="flex flex-col items-center py-8 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="h-12 w-12 text-br-cyan" />
          </motion.div>
          <p className="mt-4 text-lg font-semibold text-white">Generating ZK Proof...</p>
          <p className="mt-2 text-sm text-white/40">
            Your donation is being encrypted and committed to the Aleo network.
          </p>
          <div className="mt-4 w-full overflow-hidden rounded-full bg-br-cyan/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 8, ease: 'linear' }}
              className="h-1.5 rounded-full bg-gradient-to-r from-br-cyan to-br-purple"
            />
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="flex flex-col items-center py-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-br-green/10"
          >
            <Shield className="h-8 w-8 text-br-green" />
          </motion.div>
          <h4 className="text-xl font-bold text-white">Donation Sent Privately!</h4>
          <p className="mt-2 text-sm text-white/40">
            Your ZK proof has been verified. The donation receipt is stored as a
            private record in your wallet.
          </p>
          {txId && (
            <div className="mt-4 w-full rounded-lg border border-white/[0.04] bg-br-surface/40 p-3">
              <p className="text-xs text-white/30">Transaction ID</p>
              <p className="mt-1 break-all font-mono text-xs text-br-cyan">{txId}</p>
            </div>
          )}
          <button onClick={reset} className="btn-secondary mt-6 w-full">
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}
