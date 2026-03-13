import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Vote,
  Shield,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Users,
  BarChart3,
  AlertCircle,
  Loader2,
  Search,
} from 'lucide-react';
import { FadeInUp, StaggerContainer, StaggerItem } from '../components/ui/Animations';
import ProgressBar from '../components/ui/ProgressBar';
import { useAleoTransact } from '../hooks/useAleoTransact';
import { useRound } from '../hooks/useChainData';

export default function Committee() {
  const [roundIdInput, setRoundIdInput] = useState('');
  const [activeRoundId, setActiveRoundId] = useState<string | undefined>();
  const { round, loading: roundLoading, error: roundError } = useRound(activeRoundId);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [score, setScore] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [txError, setTxError] = useState<string | null>(null);
  const [showScores, setShowScores] = useState(false);
  const { submitVote } = useAleoTransact();

  const handleLoad = () => {
    const trimmed = roundIdInput.trim();
    if (!trimmed) return;
    const normalized = trimmed.endsWith('field') ? trimmed : `${trimmed}field`;
    setActiveRoundId(normalized);
    setSubmitted(new Set());
    setTxError(null);
  };

  const handleVote = async () => {
    if (!selectedProject || score === 0 || !activeRoundId) return;
    setSubmitting(true);
    setTxError(null);
    try {
      await submitVote(activeRoundId, selectedProject, score);
      setSubmitted((prev) => new Set(prev).add(selectedProject));
      setSelectedProject(null);
      setScore(0);
    } catch (e: any) {
      setTxError(e?.message ?? 'Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  const projects = round?.projects ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <FadeInUp>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Committee <span className="text-gradient-purple">Voting</span>
          </h1>
          <p className="mt-2 text-white/40">
            Anonymous ballot submission. Scores are hidden until voting closes.
          </p>
        </div>
      </FadeInUp>

      {/* Round ID search */}
      <FadeInUp delay={0.05}>
        <div className="mb-8 flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
            <input
              value={roundIdInput}
              onChange={(e) => setRoundIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
              placeholder="Round field ID (e.g. 1field)"
              className="input-field pl-10"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleLoad}
            disabled={!roundIdInput.trim()}
            className="btn-primary px-5 text-sm disabled:opacity-40"
          >
            Load Round
          </motion.button>
        </div>
      </FadeInUp>

      {txError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-br-red/20 bg-br-red/5 px-4 py-3 text-xs text-br-red">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {txError}
        </div>
      )}

      {/* Loading */}
      {roundLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-br-purple border-t-transparent" />
        </div>
      )}

      {/* Error */}
      {!roundLoading && roundError && (
        <div className="glass-card py-12 text-center">
          <AlertCircle className="mx-auto mb-2 h-7 w-7 text-br-red/60" />
          <p className="text-sm text-white/40">{roundError}</p>
        </div>
      )}

      {!roundLoading && !roundError && activeRoundId && (
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FadeInUp delay={0.1}>
            {/* Privacy notice */}
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-br-purple/10 bg-br-purple/[0.03] p-4">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-br-purple" />
              <div>
                <p className="text-sm font-medium text-white/80">Anonymous Voting Enabled</p>
                <p className="mt-0.5 text-xs text-white/40">
                  Your scores are encrypted via ZK ballot. No one — not even the
                  committee chair — can see individual votes until the round closes.
                </p>
              </div>
            </div>
          </FadeInUp>

          {/* Project list with voting */}
          <StaggerContainer className="space-y-4">
            {projects.length === 0 ? (
              <div className="glass-card flex flex-col items-center py-12 text-center">
                <BarChart3 className="mb-2 h-7 w-7 text-white/10" />
                <p className="text-sm text-white/30">No projects found in this round.</p>
              </div>
            ) : projects.map((project) => {
              const isSelected = selectedProject === project.id;
              const isSubmitted = submitted.has(project.id);

              return (
                <StaggerItem key={project.id}>
                  <motion.div
                    layout
                    className={`glass-card overflow-hidden transition-all duration-300 ${
                      isSelected ? 'ring-1 ring-br-purple/30' : ''
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-base font-bold text-white">{project.name}</h3>
                          <div className="mt-1 flex items-center gap-3 text-xs text-white/30">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {project.donorCount} donors
                            </span>
                          </div>
                        </div>

                        {isSubmitted ? (
                          <div className="flex items-center gap-1.5 text-br-green">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs font-semibold">Voted</span>
                          </div>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() =>
                              setSelectedProject(isSelected ? null : project.id)
                            }
                            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-br-purple text-white'
                                : 'border border-white/[0.06] text-white/40 hover:border-br-purple/20 hover:text-br-purple'
                            }`}
                          >
                            {isSelected ? 'Voting...' : 'Cast Vote'}
                          </motion.button>
                        )}
                      </div>

                      {/* Score slider when selected */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-5 border-t border-white/[0.04] pt-5">
                              <div className="mb-3 flex items-center justify-between">
                                <span className="text-sm font-medium text-white/60">
                                  Your Score
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <Lock className="h-3 w-3 text-br-purple" />
                                  <span className="text-sm font-bold text-br-purple">
                                    {score}/100
                                  </span>
                                </div>
                              </div>

                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={score}
                                onChange={(e) => setScore(Number(e.target.value))}
                                className="w-full accent-br-purple"
                              />

                              <div className="mt-2 flex justify-between text-[10px] text-white/20">
                                <span>0</span>
                                <span>25</span>
                                <span>50</span>
                                <span>75</span>
                                <span>100</span>
                              </div>

                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleVote}
                                disabled={score === 0 || submitting}
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-br-purple py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                              >
                                {submitting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Generating ZK Ballot...
                                  </>
                                ) : (
                                  <>
                                    <Vote className="h-4 w-4" />
                                    Submit Anonymous Vote
                                  </>
                                )}
                              </motion.button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <FadeInUp delay={0.15}>
            <div className="glass-card p-6">
              <h3 className="mb-4 text-sm font-semibold text-white/60">Voting Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Round</span>
                  <span className="font-mono text-white/80">{activeRoundId}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Projects</span>
                  <span className="font-semibold text-white/80">{projects.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Your Votes Cast</span>
                  <span className="font-semibold text-br-purple">{submitted.size} / {projects.length}</span>
                </div>
                <ProgressBar value={submitted.size} max={projects.length || 1} color="purple" />
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Voting Period</span>
                  <span className="font-semibold text-br-green">Open</span>
                </div>
              </div>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <div className="glass-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white/60">Results</h3>
                <button
                  onClick={() => setShowScores(!showScores)}
                  className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60"
                >
                  {showScores ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                  {showScores ? 'Hide' : 'Reveal'}
                </button>
              </div>

              {showScores ? (
                <div className="space-y-3">
                  {projects
                    .filter((p) => p.score !== undefined)
                    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                    .map((p, i) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.04] text-[10px] font-bold text-white/40">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-white/80">{p.name}</p>
                          <ProgressBar value={p.score ?? 0} max={100} color="cyan" className="mt-1" />
                        </div>
                        <span className="text-sm font-bold text-br-cyan">{p.score ?? '—'}</span>
                      </div>
                    ))}
                  {projects.filter((p) => p.score === undefined).length > 0 && (
                    <p className="pt-2 text-center text-xs text-white/20">Scores not yet revealed for all projects.</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <Lock className="mb-2 h-6 w-6 text-white/10" />
                  <p className="text-xs text-white/30">
                    Scores hidden until voting closes
                  </p>
                </div>
              )}
            </div>
          </FadeInUp>

          <FadeInUp delay={0.25}>
            <div className="glass-card p-6">
              <h3 className="mb-3 text-sm font-semibold text-white/60">Privacy Guarantees</h3>
              <div className="space-y-2 text-xs text-white/30">
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-br-green" />
                  Individual scores: <span className="text-br-green font-semibold">Hidden</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-br-green" />
                  Voter identity: <span className="text-br-green font-semibold">Anonymous</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-br-amber" />
                  Vote count: <span className="text-br-amber font-semibold">Public</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-br-cyan" />
                  Final tally: <span className="text-br-cyan font-semibold">ZK Verified</span>
                </div>
              </div>
            </div>
          </FadeInUp>
        </div>
      </div>
      )}
    </div>
  );
}
