import { Link } from 'react-router-dom';
import { Shield, Github, Twitter, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative mt-auto border-t border-white/[0.04] bg-br-bg">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-br-cyan/20 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-br-cyan" />
              <span className="text-lg font-bold">
                <span className="text-white">Blind</span>
                <span className="text-gradient-cyan">Round</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-white/30">
              Private on-chain grants &amp; fundraising — powered by Aleo
              zero-knowledge proofs.
            </p>
          </div>

          {/* Protocol */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/20">
              Protocol
            </h4>
            <ul className="space-y-2 text-sm text-white/40">
              <li><Link to="/rounds" className="transition-colors hover:text-br-cyan">Funding Rounds</Link></li>
              <li><Link to="/committee" className="transition-colors hover:text-br-cyan">Committee Voting</Link></li>
              <li><Link to="/milestones" className="transition-colors hover:text-br-cyan">Milestone Escrow</Link></li>
              <li><Link to="/dashboard" className="transition-colors hover:text-br-cyan">Dashboard</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/20">
              Resources
            </h4>
            <ul className="space-y-2 text-sm text-white/40">
              <li><a href="https://developer.aleo.org/" target="_blank" rel="noreferrer" className="transition-colors hover:text-br-cyan">Aleo Docs</a></li>
              <li><a href="https://docs.leo-lang.org/" target="_blank" rel="noreferrer" className="transition-colors hover:text-br-cyan">Leo Language</a></li>
              <li><a href="https://play.leo-lang.org/" target="_blank" rel="noreferrer" className="transition-colors hover:text-br-cyan">Leo Playground</a></li>
              <li><a href="https://faucet.aleo.org/" target="_blank" rel="noreferrer" className="transition-colors hover:text-br-cyan">Testnet Faucet</a></li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/20">
              Community
            </h4>
            <div className="flex gap-3">
              {[
                { icon: Github, href: '#' },
                { icon: Twitter, href: '#' },
                { icon: MessageCircle, href: '#' },
              ].map(({ icon: Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-white/30 transition-all hover:border-br-cyan/20 hover:text-br-cyan hover:shadow-glow-cyan"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/[0.04] pt-6 sm:flex-row">
          <p className="text-xs text-white/20">
            &copy; {new Date().getFullYear()} BlindRound. Built on Aleo.
          </p>
          <div className="flex items-center gap-2 text-xs text-white/20">
            <div className="h-1.5 w-1.5 rounded-full bg-br-green animate-pulse" />
            Aleo Testnet
          </div>
        </div>
      </div>
    </footer>
  );
}
