import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import {
  Menu,
  X,
  Shield,
  LayoutDashboard,
  CircleDollarSign,
  Vote,
  Target,
  Plus,
  LogOut,
} from 'lucide-react';

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: Shield },
  { to: '/rounds', label: 'Rounds', icon: CircleDollarSign },
  { to: '/committee', label: 'Committee', icon: Vote },
  { to: '/milestones', label: 'Milestones', icon: Target },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export default function Navbar() {
  const location = useLocation();
  const { connected, address, disconnect } = useWallet();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [location]);

  const shortAddr = address
    ? `${address.slice(0, 8)}...${address.slice(-6)}`
    : '';

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-br-bg/80 backdrop-blur-xl border-b border-white/[0.04] shadow-lg shadow-black/20'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="group flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-br-cyan to-br-purple opacity-20 blur-md transition-opacity group-hover:opacity-40" />
              <Shield className="relative h-5 w-5 text-br-cyan" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="text-white">Blind</span>
              <span className="text-gradient-cyan">Round</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ${
                    active
                      ? 'text-br-cyan'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-lg border border-br-cyan/20 bg-br-cyan/[0.06]"
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {connected && (
              <Link to="/create" className="hidden sm:block">
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1.5 rounded-lg border border-br-purple/30 bg-br-purple/10 px-3 py-1.5 text-xs font-semibold text-br-purple transition-colors hover:bg-br-purple/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Round
                </motion.div>
              </Link>
            )}

            {connected ? (
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-br-surface/50 px-3 py-1.5 text-xs font-mono text-white/40">
                  <div className="h-2 w-2 rounded-full bg-br-green animate-pulse" />
                  {shortAddr}
                </div>
                <button
                  onClick={() => void disconnect()}
                  title="Disconnect wallet"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] text-white/30 transition-colors hover:border-br-red/30 hover:bg-br-red/10 hover:text-br-red"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="hidden sm:block">
                <WalletMultiButton />
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-white/50 transition-colors hover:text-white md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-0 top-16 z-40 border-b border-white/[0.04] bg-br-bg/95 backdrop-blur-xl md:hidden"
          >
            <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
              {NAV_LINKS.map(({ to, label, icon: Icon }) => {
                const active = location.pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                      active
                        ? 'bg-br-cyan/10 text-br-cyan'
                        : 'text-white/50 hover:bg-white/[0.02] hover:text-white/80'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
              <div className="mt-2 border-t border-white/[0.04] pt-3 flex items-center gap-2">
                {connected ? (
                  <>
                    <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/[0.06] bg-br-surface/50 px-3 py-2 text-xs font-mono text-white/40">
                      <div className="h-2 w-2 rounded-full bg-br-green animate-pulse" />
                      {shortAddr}
                    </div>
                    <button
                      onClick={() => void disconnect()}
                      title="Disconnect wallet"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-white/30 hover:border-br-red/30 hover:bg-br-red/10 hover:text-br-red transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <WalletMultiButton />
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
