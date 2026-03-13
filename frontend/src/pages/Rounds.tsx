import { useState } from 'react';
import { Search, Filter, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { FadeInUp } from '../components/ui/Animations';
import RoundCard from '../components/rounds/RoundCard';
import { useRounds } from '../hooks/useChainData';

export default function Rounds() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');
  const { rounds, loading, error, refetch } = useRounds();

  const filtered = rounds.filter((r) => {
    const matchSearch =
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.fieldId.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'active' && r.status === 'active') ||
      (filter === 'closed' && (r.status === 'closed' || r.status === 'finalized'));
    return matchSearch && matchFilter;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <FadeInUp>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Funding <span className="text-gradient-cyan">Rounds</span>
          </h1>
          <p className="mt-2 text-white/40">
            Browse all private funding rounds. Donate anonymously via ZK proofs.
          </p>
        </div>
      </FadeInUp>

      {/* Search & Filters */}
      <FadeInUp delay={0.1}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by round ID..."
              className="input-field pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-white/20" />
            {(['all', 'active', 'closed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  filter === f
                    ? 'bg-br-cyan/10 text-br-cyan border border-br-cyan/20'
                    : 'border border-white/[0.06] text-white/40 hover:text-white/60'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <motion.button
              whileTap={{ rotate: 180 }}
              onClick={refetch}
              className="rounded-lg border border-white/[0.06] p-1.5 text-white/30 transition-colors hover:text-white/60"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </div>
      </FadeInUp>

      {/* Loading */}
      {loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-card h-64 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="glass-card flex flex-col items-center py-16 text-center">
          <p className="text-sm text-br-red/70">{error}</p>
          <button onClick={refetch} className="mt-4 text-xs text-br-cyan hover:underline">Retry</button>
        </div>
      )}

      {/* Round Grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((round, i) => (
            <RoundCard key={round.id} round={round} index={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="glass-card flex flex-col items-center py-20 text-center">
          <Filter className="mb-3 h-8 w-8 text-white/10" />
          <p className="text-sm text-white/30">No rounds found on-chain yet.</p>
          <p className="mt-1 text-xs text-white/20">Create the first round to get started.</p>
        </div>
      )}
    </div>
  );
}
