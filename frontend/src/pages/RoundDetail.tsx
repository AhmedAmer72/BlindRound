import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Shield,
  Users,
  Target,
  Clock,
  Lock,
  TrendingUp,
  Award,
  RefreshCw,
} from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { FadeInUp, StaggerContainer, StaggerItem } from '../components/ui/Animations';
import ProgressBar from '../components/ui/ProgressBar';
import AnimatedCounter from '../components/ui/AnimatedCounter';
import DonateModal from '../components/rounds/DonateModal';
import { useRound } from '../hooks/useChainData';
import { useAleoTransact } from '../hooks/useAleoTransact';
import { PROGRAM_ID } from '../utils/constants';
import type { Project } from '../types';

export default function RoundDetail() {
  const { id } = useParams<{ id: string }>();
  const { round, loading, error, refetch } = useRound(id ?? '');
  const [donateOpen, setDonateOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Hooks must all appear before early returns
  const { connected, requestRecords } = useWallet();
  const { registerProject, closeRound, loading: txLoading, error: txError } = useAleoTransact();
  const [adminRecord, setAdminRecord] = useState<string | null>(null);
  const [projName, setProjName] = useState('');
  const [regTxId, setRegTxId] = useState<string | null>(null);

  useEffect(() => {
    if (!connected || !requestRecords || !round) { setAdminRecord(null); return; }
    (requestRecords as (p: string) => Promise<any[]>)(PROGRAM_ID)
      .then((all) => {
        const rec = all.find(
          (r: any) => r.recordName === 'RoundAdmin' && r.data?.round_id === round.fieldId,
        );
        setAdminRecord(rec ? JSON.stringify(rec) : null);
      })
      .catch(() => setAdminRecord(null));
  }, [connected, requestRecords, round]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim() || !round) return;
    const projectId = `${Date.now()}field`;
    const nameHash = `${projName.split('').reduce((a, c) => (a + c.charCodeAt(0)) & 0xffffff, 0)}field`;
    const result = await registerProject(round.fieldId, projectId, nameHash);
    if (result) {
      const key = `blindround_projects_${round.fieldId}`;
      const existing: string[] = JSON.parse(localStorage.getItem(key) ?? '[]');
      if (!existing.includes(projectId)) localStorage.setItem(key, JSON.stringify([...existing, projectId]));
      setRegTxId((result as any).transactionId ?? 'ok');
      setProjName('');
      refetch();
    }
  };

  const handleCloseRound = async () => {
    if (!adminRecord) return;
    await closeRound(adminRecord);
    refetch();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-br-cyan border-t-transparent" />
      </div>
    );
  }

  if (error || !round) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <p className="text-white/40">{error ?? 'Round not found.'}</p>
        <div className="mt-4 flex items-center justify-center gap-4">
          <button onClick={refetch} className="text-xs text-br-cyan hover:underline">Retry</button>
          <Link to="/rounds" className="text-sm text-br-cyan hover:underline">&larr; Back to rounds</Link>
        </div>
      </div>
    );
  }

  const pct = round.goal > 0 ? (round.raised / round.goal) * 100 : 0;

  const openDonate = (project: Project) => {
    setSelectedProject(project);
    setDonateOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <FadeInUp>
        <Link
          to="/rounds"
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-br-cyan"
        >
          <ArrowLeft className="h-4 w-4" />
          All Rounds
        </Link>
      </FadeInUp>

      {/* Header section */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2">
          <FadeInUp>
            <div className="glass-card p-6 sm:p-8">
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    round.status === 'active'
                      ? 'bg-br-green/10 text-br-green'
                      : 'bg-white/[0.06] text-white/40'
                  }`}
                >
                  {round.status === 'active' && (
                    <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  )}
                  {round.status.charAt(0).toUpperCase() + round.status.slice(1)}
                </div>
                <div className="rounded-lg bg-br-purple/10 px-2.5 py-1 text-xs font-semibold text-br-purple">
                  ${round.matchingPool.toLocaleString()} matching
                </div>
              </div>

              <h1 className="mb-3 text-2xl font-bold text-white sm:text-3xl">
                {round.name}
              </h1>
              <p className="mb-6 text-sm leading-relaxed text-white/40">
                {round.description}
              </p>

              {/* Progress */}
              <div className="mb-4">
                <div className="mb-2 flex items-end justify-between">
                  <div>
                    <span className="text-3xl font-bold text-white">
                      $<AnimatedCounter end={round.raised} />
                    </span>
                    <span className="ml-2 text-sm text-white/30">
                      raised of ${round.goal.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-br-cyan">
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <ProgressBar value={round.raised} max={round.goal} color="cyan" />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 rounded-xl border border-white/[0.04] bg-br-bg/40 p-4">
                {[
                  { icon: Users, label: 'Donors', value: round.donorCount },
                  { icon: Target, label: 'Projects', value: round.projectCount },
                  { icon: TrendingUp, label: 'Match Pool', value: `$${(round.matchingPool / 1000).toFixed(0)}k` },
                  { icon: Clock, label: 'Deadline', value: round.deadline },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="text-center">
                    <Icon className="mx-auto mb-1 h-4 w-4 text-white/20" />
                    <p className="text-lg font-bold text-white">{value}</p>
                    <p className="text-[10px] text-white/30">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeInUp>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <FadeInUp delay={0.1}>
            <div className="glass-card p-6">
              <h3 className="mb-4 text-sm font-semibold text-white/60">Privacy Status</h3>
              <div className="space-y-3">
                {[
                  { label: 'Donation Amounts', status: 'Hidden', color: 'text-br-green' },
                  { label: 'Donor Identities', status: 'Hidden', color: 'text-br-green' },
                  { label: 'Round Total', status: 'Public', color: 'text-br-amber' },
                  { label: 'Project Count', status: 'Public', color: 'text-br-amber' },
                  { label: 'ZK Proofs', status: 'Verified', color: 'text-br-cyan' },
                ].map(({ label, status, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-white/40">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <Shield className={`h-3 w-3 ${color}`} />
                      <span className={`text-xs font-semibold ${color}`}>{status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.15}>
            <div className="glass-card p-6">
              <h3 className="mb-3 text-sm font-semibold text-white/60">On-Chain</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/30">Network</span>
                  <span className="text-white/60">Aleo Testnet</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/30">Program</span>
                  <span className="font-mono text-br-cyan">{PROGRAM_ID}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/30">Round ID</span>
                  <span className="font-mono text-white/60">{round.fieldId}</span>
                </div>
              </div>
              {adminRecord && round.status === 'active' && (
                <button
                  onClick={handleCloseRound}
                  disabled={txLoading}
                  className="mt-4 w-full rounded-lg border border-br-red/20 bg-br-red/5 py-2 text-xs font-semibold text-br-red hover:bg-br-red/10 disabled:opacity-40 transition-colors"
                >
                  {txLoading ? 'Closing…' : 'Close Round'}
                </button>
              )}
            </div>
          </FadeInUp>
        </div>
      </div>

      {/* Projects */}
      {round.projects.length > 0 && (
        <div className="mt-10">
          <FadeInUp>
            <h2 className="mb-6 text-2xl font-bold text-white">
              Projects <span className="text-white/30">({round.projects.length})</span>
            </h2>
          </FadeInUp>

          <StaggerContainer className="grid gap-4 md:grid-cols-2">
            {round.projects.map((project) => (
              <StaggerItem key={project.id}>
                <div className="glass-card group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">{project.name}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-white/40">
                        {project.description}
                      </p>
                    </div>
                    {project.score !== undefined && (
                      <div className="ml-3 flex shrink-0 flex-col items-center rounded-lg border border-br-amber/20 bg-br-amber/10 px-2.5 py-1">
                        <Award className="h-3 w-3 text-br-amber" />
                        <span className="text-xs font-bold text-br-amber">{project.score}</span>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <ProgressBar
                      value={project.raised}
                      max={round.goal / round.projectCount}
                      color="purple"
                      showLabel
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-white/30">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {project.donorCount}
                      </span>
                      <span className="font-mono">{project.applicant.slice(0, 12)}...</span>
                    </div>

                    {round.status === 'active' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openDonate(project)}
                        className="flex items-center gap-1.5 rounded-lg bg-br-cyan/10 px-3 py-1.5 text-xs font-semibold text-br-cyan transition-colors hover:bg-br-cyan/20"
                      >
                        <Lock className="h-3 w-3" />
                        Donate
                      </motion.button>
                    )}
                  </div>

                  {/* Hover accent */}
                  <div className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full bg-br-purple/5 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      )}

      {/* Register Project */}
      {round.status === 'active' && connected && (
        <div className="mt-8">
          <FadeInUp>
            <div className="glass-card p-6">
              <h3 className="mb-4 text-lg font-bold text-white">Register a Project</h3>
              <form onSubmit={handleRegister} className="flex gap-3">
                <input
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  placeholder="Project name"
                  className="input-field flex-1"
                  required
                />
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.97 }}
                  disabled={!projName.trim() || txLoading}
                  className="btn-primary shrink-0 px-5 text-sm disabled:opacity-40"
                >
                  {txLoading ? 'Submitting…' : 'Register'}
                </motion.button>
              </form>
              {txError && <p className="mt-2 text-xs text-br-red">{txError}</p>}
              {regTxId && (
                <p className="mt-2 font-mono text-xs text-br-cyan break-all">
                  ✓ Registered · tx: {regTxId}
                </p>
              )}
            </div>
          </FadeInUp>
        </div>
      )}

      <DonateModal
        open={donateOpen}
        onClose={() => setDonateOpen(false)}
        roundId={round.fieldId}
        project={selectedProject}
      />
    </div>
  );
}
