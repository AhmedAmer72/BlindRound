import { motion } from 'framer-motion';
import {
  Shield,
  CircleDollarSign,
  Vote,
  Target,
  Receipt,
  Lock,
  ExternalLink,
  Activity,
  Inbox,
} from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { FadeInUp, StaggerContainer, StaggerItem } from '../components/ui/Animations';
import AnimatedCounter from '../components/ui/AnimatedCounter';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useWalletRecords } from '../hooks/useChainData';

export default function Dashboard() {
  const { connected, address, requestRecords } = useWallet();
  const { records, loading: recordsLoading } = useWalletRecords(
    requestRecords as ((program: string) => Promise<unknown[]>) | undefined,
    connected,
  );

  if (!connected) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md text-center">
          <FadeInUp>
            <div className="glass-card p-10">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-br-cyan/10">
                <Shield className="h-8 w-8 text-br-cyan shield-glow" />
              </div>
              <h2 className="text-2xl font-bold text-white">Connect Your Wallet</h2>
              <p className="mt-2 text-sm text-white/40">
                Connect with Shield Wallet to view your private dashboard — donation
                receipts, voting history, and milestone status.
              </p>
              <div className="mt-6 flex justify-center">
                <WalletMultiButton />
              </div>
            </div>
          </FadeInUp>
        </div>
      </div>
    );
  }

  const shortAddr = `${address!.slice(0, 12)}...${address!.slice(-8)}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <FadeInUp>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Your <span className="text-gradient">Dashboard</span>
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-br-green animate-pulse" />
              <span className="font-mono text-sm text-white/40">{shortAddr}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-br-surface/40 px-4 py-2">
            <Activity className="h-4 w-4 text-br-cyan" />
            <span className="text-sm text-white/60">Aleo Testnet</span>
          </div>
        </div>
      </FadeInUp>

      {/* Stats Grid */}
      <StaggerContainer className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Receipt,
            label: 'ZK Donation Receipts',
            value: records.donationReceipts.length,
            color: 'text-br-cyan',
            bg: 'bg-br-cyan/10',
          },
          {
            icon: Vote,
            label: 'ZK Ballots',
            value: records.ballots.length,
            color: 'text-br-purple',
            bg: 'bg-br-purple/10',
          },
          {
            icon: Target,
            label: 'Milestone Proofs',
            value: records.milestoneProofs.length,
            color: 'text-br-green',
            bg: 'bg-br-green/10',
          },
          {
            icon: CircleDollarSign,
            label: 'Escrow Receipts',
            value: records.escrowReceipts.length,
            color: 'text-br-pink',
            bg: 'bg-br-pink/10',
          },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <StaggerItem key={label}>
            <div className="glass-card p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <span className="text-sm text-white/40">{label}</span>
              </div>
              <div className="text-3xl font-bold text-white">
                {recordsLoading ? (
                  <span className="text-white/20">...</span>
                ) : (
                  <AnimatedCounter end={value} />
                )}
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <FadeInUp delay={0.2}>
            <div className="glass-card p-6">
              <h3 className="mb-4 text-lg font-bold text-white">Private Donation Receipts</h3>
              {recordsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-br-cyan border-t-transparent" />
                </div>
              ) : records.donationReceipts.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <Inbox className="mb-2 h-7 w-7 text-white/10" />
                  <p className="text-sm text-white/30">No donation receipts yet.</p>
                  <p className="mt-1 text-xs text-white/20">Records appear here after you donate to a round.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {records.donationReceipts.map((r, i) => {
                    const rec = r as Record<string, unknown>;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.06 }}
                        className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-br-bg/40 p-4 transition-colors hover:border-white/[0.08]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-br-cyan/10">
                            <Lock className="h-4 w-4 text-br-cyan" />
                          </div>
                          <div>
                            <p className="font-mono text-xs text-white/60">
                              {String(rec.id ?? rec.commitment ?? `Receipt #${i + 1}`).slice(0, 20)}...
                            </p>
                            <p className="text-[10px] text-white/30">DonationReceipt · ZK Protected</p>
                          </div>
                        </div>
                        <Shield className="h-4 w-4 text-br-green" />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </FadeInUp>

          <FadeInUp delay={0.3}>
            <div className="glass-card p-6">
              <h3 className="mb-4 text-lg font-bold text-white">ZK Ballots</h3>
              {records.ballots.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Vote className="mb-2 h-6 w-6 text-white/10" />
                  <p className="text-sm text-white/30">No ballots cast yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {records.ballots.map((b, i) => {
                    const ballot = b as Record<string, unknown>;
                    return (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-br-bg/40 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-br-purple/10">
                            <Vote className="h-4 w-4 text-br-purple" />
                          </div>
                          <p className="font-mono text-xs text-white/60">
                            {String(ballot.id ?? ballot.round_id ?? `Ballot #${i + 1}`).slice(0, 20)}...
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-br-cyan">Sealed</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </FadeInUp>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <FadeInUp delay={0.2}>
            <div className="glass-card p-6">
              <h3 className="mb-4 text-sm font-semibold text-white/60">ZK Privacy Score</h3>
              <div className="flex items-center justify-center">
                <div className="relative flex h-32 w-32 items-center justify-center">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="url(#privacy-gradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${251.2 * 1} ${251.2 * 0}`}
                      initial={{ strokeDashoffset: 251.2 }}
                      animate={{ strokeDashoffset: 0 }}
                      transition={{ duration: 2, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
                    />
                    <defs>
                      <linearGradient id="privacy-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#00e5ff" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-2xl font-bold text-white">100</div>
                    <div className="text-[10px] text-white/30">/ 100</div>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-white/30">
                Every transaction uses ZK proofs — your on-chain footprint reveals
                minimal information.
              </p>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.25}>
            <div className="glass-card p-6">
              <h3 className="mb-3 text-sm font-semibold text-white/60">ZK Records</h3>
              <div className="space-y-2 text-xs text-white/40">
                <div className="flex items-center justify-between">
                  <span>Donation Receipts</span>
                  <span className="font-semibold text-br-cyan">{records.donationReceipts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Escrow Receipts</span>
                  <span className="font-semibold text-br-purple">{records.escrowReceipts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Ballots</span>
                  <span className="font-semibold text-br-pink">{records.ballots.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Milestone Proofs</span>
                  <span className="font-semibold text-br-green">{records.milestoneProofs.length}</span>
                </div>
              </div>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.3}>
            <div className="glass-card p-6">
              <h3 className="mb-3 text-sm font-semibold text-white/60">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { label: 'Browse Rounds', to: '/rounds', icon: CircleDollarSign },
                  { label: 'Cast Votes', to: '/committee', icon: Vote },
                  { label: 'View Milestones', to: '/milestones', icon: Target },
                ].map(({ label, to, icon: Icon }) => (
                  <a
                    key={label}
                    href={to}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-br-bg/40 p-3 text-xs font-medium text-white/60 transition-all hover:border-br-cyan/10 hover:text-white"
                  >
                    <Icon className="h-4 w-4 text-white/20" />
                    {label}
                    <ExternalLink className="ml-auto h-3 w-3 text-white/10" />
                  </a>
                ))}
              </div>
            </div>
          </FadeInUp>
        </div>
      </div>
    </div>
  );
}
