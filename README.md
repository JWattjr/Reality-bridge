# ProofPlay

**A no-house PvP football prediction market, with test-USDC escrow on Base
Sepolia and consensus-backed match resolution on GenLayer Studionet.**

Players take `HOME`, `DRAW`, or `AWAY` positions in the same market. Their
test-USDC funds one shared pari-mutuel pot; ProofPlay never takes the opposite
side. When GenLayer reaches a final result, players on the winning side claim
their proportional share of the pot. If the beta bridge does not return a
result in time, every player can claim an individual refund.

> This is a testnet MVP: no mainnet, no real-value assets, and no Bradbury.

## Why it is PvP

- Players fund opposing outcomes, not a house book.
- One wallet can hold one `HOME`, `DRAW`, or `AWAY` position per market.
- Winners receive `their stake × total pot ÷ winning-side pot`.
- If no player chose the final outcome, or resolution times out, the market
  moves to refunds rather than creating a house winner.

## Architecture

```text
Player / Privy wallet
        │ approve + stake Base Sepolia test USDC
        ▼
ProofPlayBaseMarket (Base Sepolia)
        │ request resolution through beta bridge
        ▼
ProofPlayResolver (GenLayer Studionet)
        │ independently validate public-match evidence
        ▼
Bridge callback → authenticated Base result → PvP claims or refunds
```

| Component | Responsibility |
| --- | --- |
| Base Sepolia | Test-USDC escrow, positions, pots, claims, and timeout refunds |
| GenLayer Studionet | Consensus-backed final-score extraction and validation |
| Bridge | Asynchronous message transport only; it cannot choose a winner |
| Privy | Login and Base Sepolia wallet signing |

The official Base Sepolia Circle test-USDC address is
`0x036CbD53842c5426634e7929541eC2318f3dCF7e` (6 decimals).

## Key implementation files

- [Base PvP market contract](contracts/src/ProofPlayBaseMarket.sol)
- [GenLayer resolver](genlayer/contracts/proofplay_resolver.py)
- [GenLayer direct tests](genlayer/tests/direct/test_proofplay_resolver.py)
- [Base contract tests](contracts/test/ProofPlayBaseMarket.t.sol)
- [Architecture and safety model](GENLAYER_MVP.md)
- [MVP frontend](frontend/src/components/ProofPlayMvp.tsx)

## Run locally

```bash
pnpm install
Copy-Item frontend/.env.example frontend/.env
pnpm dev
```

Open `http://localhost:3000`.

The app deliberately starts in **Preview mode** until a deployed Base market
address is supplied. The preview makes the PvP pot and payout mechanics clear,
but it never pretends to send a transaction.

To enable Base Sepolia transactions, set:

```dotenv
NEXT_PUBLIC_PRIVY_APP_ID=
NEXT_PUBLIC_PROOFPLAY_MARKET_ADDRESS=0x...
NEXT_PUBLIC_PROOFPLAY_DEFAULT_MARKET_ID=1
```

## Verification

```bash
# Next.js production build
pnpm build

# Base contract optimized-IR compile
node contracts/scripts/compile.mjs

# GenLayer direct tests (Windows)
.\genlayer\.venv\Scripts\python.exe -m pytest genlayer/tests/direct -q

# Hosted Studionet smoke test (requires network access)
.\genlayer\.venv\Scripts\gltest.exe --network studionet genlayer/tests/integration/test_studionet_smoke.py -q
```

The project contains a pinned GenVM runner and direct consensus tests. The
current GenVM linter's semantic downloader cannot fetch that mandated runner
from its registry; its AST safety lint passes, and both direct and hosted
Studionet tests pass.

## Current submission state

The frontend is a live, runnable PvP prototype. The intelligent resolver was
deployed and smoke-tested on hosted Studionet. The Base contract is compiled
and ready to deploy, but an end-to-end live bridge deployment requires the
specific bridge sender/receiver addresses and should not be represented as
already live.

Every bridge request includes a fixture commitment registered on both chains.
Premature/failed requests are permissionlessly retryable without extending the
original refund deadline, and a result already resolved on GenLayer can be
replayed safely when the authenticated Base request arrives.
