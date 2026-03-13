import { motion } from 'framer-motion';

interface Props {
  value: number;
  max: number;
  className?: string;
  color?: 'cyan' | 'purple' | 'pink' | 'green';
  showLabel?: boolean;
}

const colorMap = {
  cyan: {
    bar: 'from-br-cyan to-cyan-400',
    glow: 'shadow-[0_0_12px_rgba(0,229,255,0.4)]',
    bg: 'bg-br-cyan/10',
  },
  purple: {
    bar: 'from-br-purple to-violet-400',
    glow: 'shadow-[0_0_12px_rgba(139,92,246,0.4)]',
    bg: 'bg-br-purple/10',
  },
  pink: {
    bar: 'from-br-pink to-pink-400',
    glow: 'shadow-[0_0_12px_rgba(236,72,153,0.4)]',
    bg: 'bg-br-pink/10',
  },
  green: {
    bar: 'from-br-green to-emerald-400',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.4)]',
    bg: 'bg-br-green/10',
  },
};

export default function ProgressBar({
  value,
  max,
  className = '',
  color = 'cyan',
  showLabel = false,
}: Props) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const c = colorMap[color];

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/40">{value.toLocaleString()} / {max.toLocaleString()}</span>
          <span className="font-semibold text-white/60">{pct.toFixed(0)}%</span>
        </div>
      )}
      <div className={`h-2 overflow-hidden rounded-full ${c.bg}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className={`h-full rounded-full bg-gradient-to-r ${c.bar} ${c.glow}`}
        />
      </div>
    </div>
  );
}
