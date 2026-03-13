import { Routes, Route } from 'react-router-dom';
import WalletProvider from './components/wallet/WalletProvider';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Rounds from './pages/Rounds';
import RoundDetail from './pages/RoundDetail';
import CreateRound from './pages/CreateRound';
import Committee from './pages/Committee';
import Milestones from './pages/Milestones';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <WalletProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rounds" element={<Rounds />} />
          <Route path="/rounds/:id" element={<RoundDetail />} />
          <Route path="/create" element={<CreateRound />} />
          <Route path="/committee" element={<Committee />} />
          <Route path="/milestones" element={<Milestones />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Layout>
    </WalletProvider>
  );
}
