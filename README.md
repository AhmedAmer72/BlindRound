# BlindRound — Private On-Chain Grants & Fundraising Protocol

> Fund anything. Expose nothing.

BlindRound is a privacy-preserving grants and fundraising protocol built natively on **Aleo**. It enables private donations, anonymous committee voting, and ZK-verified milestone proofs — all powered by zero-knowledge cryptography.

## 🏗️ Architecture

### Leo Smart Contracts

| Contract | Program ID | Purpose |
|---|---|---|
| **Funding Round** | `blindround_fund_v1.aleo` | Create rounds, accept private donations, compute quadratic matching |
| **Grant Committee** | `blindround_vote_v1.aleo` | Anonymous ballot submission, ZK-verified tally, delayed score reveal |
| **Milestone Escrow** | `blindround_escrow_v1.aleo` | Lock grants, prove milestones via ZK, release tranches |

### Frontend

- **React 18** + **Vite** + **TypeScript**
- **TailwindCSS** with custom dark theme
- **Framer Motion** for animations
- **Shield Wallet** integration via `@provablehq/aleo-wallet-adaptor`
- **USAD** stablecoin for all fund flows

## 🔑 Core ZK Innovations

### 1. Private Quadratic Funding
Donations committed privately via ZK proofs. Matching formula computed by Leo contracts over private inputs. Result is provably fair and ungameable.

### 2. Anonymous Committee Voting
Committee members submit private ballots with hidden scores. Final rankings are mathematically verified on-chain. Nobody knows who scored what.

### 3. ZK Proof of Fund Usage
Recipients prove milestone completion without exposing financial details or internal documents. Tranches released automatically when proofs verify.

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- [Leo CLI](https://docs.leo-lang.org/getting_started/installation)
- [Shield Wallet](https://shieldwallet.dev) browser extension

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Leo Contracts

```bash
# Build funding round
cd contracts/funding_round
leo build

# Build grant committee
cd ../grant_committee
leo build

# Build milestone escrow
cd ../milestone_escrow
leo build
```

### Deploy to Testnet

```bash
cd contracts/funding_round
leo deploy --network testnet
```

## 📁 Project Structure

```
BlindRound/
├── contracts/
│   ├── funding_round/       # Private donation & quadratic funding
│   │   └── src/main.leo
│   ├── grant_committee/     # Anonymous voting & tally
│   │   └── src/main.leo
│   └── milestone_escrow/    # ZK milestone proofs & escrow
│       └── src/main.leo
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route pages
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Constants & helpers
│   │   └── App.tsx          # Root component
│   ├── index.html
│   └── package.json
└── README.md
```

## 🔒 Privacy Model

| Data | Visibility | Method |
|---|---|---|
| Donation amount | **Private** | ZK record |
| Donor identity | **Private** | ZK record |
| Round total | Public | On-chain mapping |
| Committee scores | **Private** until reveal | ZK ballot |
| Voter identity | **Anonymous** | ZK proof |
| Evidence hashes | **Private** | ZK commitment |
| Milestone status | Public | On-chain mapping |

## 🛠️ Tech Stack

- **Smart Contracts**: Leo on Aleo
- **Frontend**: React + Vite + TailwindCSS
- **Wallet**: Shield Wallet
- **Stablecoin**: USAD
- **Animations**: Framer Motion
- **Network**: Aleo Testnet → Mainnet

## 📜 License

MIT
