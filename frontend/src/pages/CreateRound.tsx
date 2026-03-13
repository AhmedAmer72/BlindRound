import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FadeInUp } from '../components/ui/Animations';
import CreateRoundForm from '../components/rounds/CreateRoundForm';

export default function CreateRound() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <FadeInUp>
        <Link
          to="/rounds"
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-br-cyan"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Rounds
        </Link>
      </FadeInUp>

      <FadeInUp delay={0.1}>
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Create a <span className="text-gradient">Funding Round</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-white/40">
            Set up a new private funding round on Aleo. All donations will be
            protected by zero-knowledge proofs.
          </p>
        </div>
      </FadeInUp>

      <FadeInUp delay={0.2}>
        <CreateRoundForm />
      </FadeInUp>
    </div>
  );
}
