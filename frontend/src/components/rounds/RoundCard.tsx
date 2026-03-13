import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Target, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import ProgressBar from '../ui/ProgressBar';
import type { Round } from '../../types';

interface Props {
  round: Round;
  index?: number;
}

export default function RoundCard({ round, index = 0 }: Props) {
  const pct = round.goal > 0 ? (round.raised / round.goal) * 100 : 0;
  const isClosed = round.status === 'closed' || round.status === 'finalized';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/rounds/${round.id}`} className="group block">
        <div className="glass-card glow-border relative overflow-hidden p-6 transition-all duration-500 hover:-translate-y-1">
          {/* Status badge */}
          <div className="mb-4 flex items-center justify-between">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                isClosed
                  ? 'bg-white/[0.06] text-white/40'
                  : 'bg-br-green/10 text-br-green'
              }`}
            >
              {isClosed ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              )}
              {round.status === 'active' ? 'Active' : round.status === 'closed' ? 'Closed' : 'Finalized'}
            </div>
            <ArrowRight className="h-4 w-4 text-white/10 transition-all group-hover:translate-x-1 group-hover:text-br-cyan" />
          </div>

          {/* Title */}
          <h3 className="mb-2 text-xl font-bold text-white transition-colors group-hover:text-gradient-cyan">
            {round.name}
          </h3>
          <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-white/40">
            {round.description}
          </p>

          {/* Progress */}
          <div className="mb-4">
            <div className="mb-2 flex items-end justify-between">
              <div>
                <span className="text-2xl font-bold text-white">
                  ${round.raised.toLocaleString()}
                </span>
                <span className="ml-1 text-sm text-white/30">
                  / ${round.goal.toLocaleString()}
                </span>
              </div>
              <span className="text-sm font-semibold text-br-cyan">
                {pct.toFixed(0)}%
              </span>
            </div>
            <ProgressBar
              value={round.raised}
              max={round.goal}
              color={pct >= 100 ? 'green' : 'cyan'}
            />
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 border-t border-white/[0.04] pt-4 text-xs text-white/30">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {round.donorCount} donors
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              {round.projectCount} projects
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {round.deadline}
            </div>
          </div>

          {/* Matching pool tag */}
          {round.matchingPool > 0 && (
            <div className="absolute right-4 top-4 rounded-lg bg-br-purple/10 px-2.5 py-1 text-xs font-semibold text-br-purple">
              ${round.matchingPool.toLocaleString()} match
            </div>
          )}

          {/* Hover glow effect overlay */}
          <div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100">
            <div className="absolute -top-24 right-0 h-48 w-48 rounded-full bg-br-cyan/5 blur-3xl" />
            <div className="absolute -bottom-24 left-0 h-48 w-48 rounded-full bg-br-purple/5 blur-3xl" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
