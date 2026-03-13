import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  ArrowRight,
  Zap,
  Globe,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import ParticleField from '../components/ui/ParticleField';
import AnimatedCounter from '../components/ui/AnimatedCounter';
import { FadeInUp } from '../components/ui/Animations';
import { useRounds, useProtocolStats } from '../hooks/useChainData';
import { PROGRAM_ID } from '../utils/constants';
import RoundCard from '../components/rounds/RoundCard';

function useTextScramble(target: string, active: boolean): string {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%▓▒░█';
  const [output, setOutput] = useState(target);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const id = setInterval(() => {
      frame++;
      setOutput(
        target
          .split('')
          .map((ch, i) => {
            if (frame >= i * 2 + 5) return ch;
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join(''),
      );
      if (frame >= target.length * 2 + 8) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [active]);

  return output;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const blindText = useTextScramble('BLIND', mounted);
  const roundText = useTextScramble('ROUND', mounted);
  const { stats } = useProtocolStats();
  const { rounds } = useRounds();
  const activeRounds = rounds.filter((r) => r.status === 'active').slice(0, 3);

  return (
    <div className="relative">
      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[90vh] overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <ParticleField />
          <div className="absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-br-cyan/[0.04] blur-[120px]" />
          <div className="absolute right-1/4 bottom-1/4 h-[400px] w-[400px] rounded-full bg-br-purple/[0.04] blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-32 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <FadeInUp>
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-br-cyan/20 bg-br-cyan/[0.06] px-4 py-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-br-cyan animate-pulse" />
                <span className="text-xs font-semibold text-br-cyan">
                  Built on Aleo · Zero-Knowledge Native
                </span>
              </div>
            </FadeInUp>

            {/* BLIND · ROUND scramble heading */}
            <FadeInUp delay={0.1}>
              <div className="leading-[1.05] tracking-tighter">
                <div className="text-4xl font-black sm:text-6xl lg:text-7xl">
                  <span className="text-gradient select-none font-mono">{blindText}</span>
                </div>
                <div className="my-3 flex items-center justify-center gap-3">
                  <div className="h-px w-16 bg-gradient-to-r from-transparent to-br-cyan/50" />
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-br-cyan/60">
                    zero · knowledge · native
                  </span>
                  <div className="h-px w-16 bg-gradient-to-l from-transparent to-br-purple/50" />
                </div>
                <div className="text-4xl font-black sm:text-6xl lg:text-7xl">
                  <span className="select-none font-mono text-white/90">{roundText}</span>
                </div>
              </div>
            </FadeInUp>

            {/* CTA buttons */}
            <FadeInUp delay={0.3}>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link to="/rounds">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="btn-primary flex items-center gap-2 px-8 py-4 text-base"
                  >
                    <Shield className="h-5 w-5" />
                    Explore Rounds
                    <ArrowRight className="h-4 w-4" />
                  </motion.button>
                </Link>
                <Link to="/create">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="btn-secondary flex items-center gap-2 px-8 py-4 text-base"
                  >
                    Launch a Round
                    <Zap className="h-4 w-4" />
                  </motion.button>
                </Link>
              </div>
            </FadeInUp>

            {/* Visual comparison */}
            <FadeInUp delay={0.5}>
              <div className="mx-auto mt-16 grid max-w-3xl gap-4 sm:grid-cols-2">
                {/* Old way */}
                <div className="glass-card border-br-red/10 p-5 text-left">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-br-red/10">
                      <Eye className="h-4 w-4 text-br-red" />
                    </div>
                    <span className="text-sm font-semibold text-br-red">Traditional Grants</span>
                  </div>
                  <ul className="space-y-2 text-xs text-white/40">
                    <li className="flex items-start gap-2">
                      <span className="mt-1 text-br-red">✕</span>
                      All donations permanently public
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 text-br-red">✕</span>
                      Committee votes visible to everyone
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 text-br-red">✕</span>
                      Wallet addresses tied to identity
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 text-br-red">✕</span>
                      Quadratic matching easily gamed
                    </li>
                  </ul>
                </div>

                {/* New way */}
                <div className="glass-card border-br-green/10 p-5 text-left">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-br-green/10">
                      <EyeOff className="h-4 w-4 text-br-green" />
                    </div>
                    <span className="text-sm font-semibold text-br-green">BlindRound on Aleo</span>
                  </div>
                  <ul className="space-y-2 text-xs text-white/40">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-br-green" />
                      Donations committed privately via ZK
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-br-green" />
                      Anonymous ballot submission
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-br-green" />
                      Hidden identities, provable totals
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-br-green" />
                      ZK-verified quadratic funding
                    </li>
                  </ul>
                </div>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="relative border-y border-white/[0.04] bg-br-surface/30">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            { label: 'Total Raised', value: stats.totalDonationVolume, prefix: '$', icon: Zap, color: 'text-br-cyan' },
            { label: 'Active Rounds', value: stats.totalRounds, icon: Globe, color: 'text-br-green' },
            { label: 'Active Escrows', value: stats.totalEscrows, icon: Lock, color: 'text-br-purple' },
            { label: 'Total Locked', value: stats.totalLocked, prefix: '$', icon: Shield, color: 'text-br-pink' },
          ].map(({ label, value, prefix, icon: Icon, color }, i) => (
            <FadeInUp key={label} delay={i * 0.1}>
              <div className="text-center">
                <Icon className={`mx-auto mb-2 h-5 w-5 ${color}`} />
                <div className="text-3xl font-bold text-white sm:text-4xl">
                  <AnimatedCounter end={value} prefix={prefix} />
                </div>
                <p className="mt-1 text-xs text-white/30">{label}</p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </section>



      {/* ═══ LIVE ROUNDS ═══ */}
      <section className="relative border-t border-white/[0.04] bg-mesh py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-end justify-between">
            <FadeInUp>
              <div>
                <h2 className="text-3xl font-bold text-white">
                  Active <span className="text-gradient-cyan">Rounds</span>
                </h2>
                <p className="mt-2 text-sm text-white/40">
                  Browse live funding rounds and donate privately.
                </p>
              </div>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <Link
                to="/rounds"
                className="flex items-center gap-1 text-sm font-semibold text-br-cyan transition-colors hover:text-white"
              >
                View all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </FadeInUp>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeRounds.length > 0 ? (
              activeRounds.map((round, i) => (
                <RoundCard key={round.id} round={round} index={i} />
              ))
            ) : (
              <div className="col-span-full glass-card py-12 text-center">
                <p className="text-sm text-white/30">No active rounds yet — be the first to launch one.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ PROTOCOL ARCHITECTURE ═══ */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Protocol <span className="text-gradient-purple">Architecture</span>
              </h2>
              <p className="mt-3 text-sm text-white/40">
                One composable Leo contract powering the entire grant lifecycle.
              </p>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <div className="mx-auto mt-12 max-w-4xl">
              <div className="glass-card overflow-hidden p-1">
                <div className="rounded-xl bg-br-bg/60 p-6 font-mono text-xs leading-loose text-white/50">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-br-red/60" />
                    <div className="h-2.5 w-2.5 rounded-full bg-br-amber/60" />
                    <div className="h-2.5 w-2.5 rounded-full bg-br-green/60" />
                    <span className="ml-2 text-white/20">BlindRound Protocol</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-br-cyan">{'// '}</span>
                      <span className="text-br-cyan/60">Layer 1: Private Funding</span>
                    </div>
                    <div className="ml-4">
                      <span className="text-br-purple">program</span>
                      {' '}
                      <span className="text-white/80">{PROGRAM_ID.replace('.aleo', '')}</span>
                      <span className="text-white/30">.aleo</span>
                      {' { '}
                      <span className="text-white/20">create_round, donate, close_round, compute_qf_match</span>
                      {' }'}
                    </div>
                    <div className="h-px bg-white/[0.04]" />
                    <div>
                      <span className="text-br-cyan">{'// '}</span>
                      <span className="text-br-cyan/60">Layer 2: Anonymous Governance</span>
                    </div>
                    <div className="ml-4 text-white/20">
                      <span className="text-white/40">{'↳ '}</span>create_committee, submit_vote, close_voting, reveal_scores
                    </div>
                    <div className="h-px bg-white/[0.04]" />
                    <div>
                      <span className="text-br-cyan">{'// '}</span>
                      <span className="text-br-cyan/60">Layer 3: Milestone Escrow</span>
                    </div>
                    <div className="ml-4 text-white/20">
                      <span className="text-white/40">{'↳ '}</span>lock_grant, prove_milestone, release_tranche
                    </div>
                    <div className="h-px bg-white/[0.04]" />
                    <div className="flex items-center gap-3 pt-1 text-white/25">
                      <span className="rounded border border-white/[0.06] px-2 py-0.5 text-[10px]">Shield Wallet</span>
                      <span className="rounded border border-white/[0.06] px-2 py-0.5 text-[10px]">USAD</span>
                      <span className="rounded border border-white/[0.06] px-2 py-0.5 text-[10px]">Aleo Testnet</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative border-t border-white/[0.04] bg-mesh py-24">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-br-cyan/[0.03] blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <FadeInUp>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to fund <span className="text-gradient">privately?</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/40">
              Connect your Shield Wallet and start exploring private funding rounds
              on the Aleo network. Every donation is ZK-protected.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link to="/rounds">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-primary flex items-center gap-2 px-8 py-4 text-base"
                >
                  Start Exploring
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              </Link>
              <Link to="/create">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-secondary flex items-center gap-2 px-8 py-4 text-base"
                >
                  Create a Round
                </motion.button>
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>
    </div>
  );
}
