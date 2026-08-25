# ProofPlay

ProofPlay is a head-to-head football prediction game built around complete,
comparable tickets. Two players choose six independent outcomes on the same
fixture. When the fixture finishes, each pick settles against the real match
facts and the stronger ticket wins the duel.

It is not a pooled market and players are not forced onto opposite outcomes.
Both tickets may make the same call in any market. The competition is the
final scorecard across the whole ticket.

## Ticket model

Every duel contains these six markets:

1. Match winner: home, draw, or away
2. First team to score: home, away, or no goals
3. Total goals: over or under the configured line
4. Total corners: over or under the configured line
5. Total cards: over or under the configured line
6. Both teams to score: yes or no

Each pick settles independently. A wrong winner prediction cannot make a
correct corners prediction wrong.

Correct calls earn weighted points. The contract uses the locked implied
probability for the selected outcome, so a correct low-probability call earns
more than a correct favourite. Ties resolve in order: weighted score, number
of correct picks, highest-value correct pick, earlier ticket submission, then
a draw with one-entry refunds for both players.

## Networks and responsibility boundaries

| Component | Responsibility |
| --- | --- |
| Base Sepolia | One test-USDC entry per player, ticket lock, payout, and refund state |
| GenLayer Studionet | Consensus-backed verification of score, first scorer, corners, and cards |
| GenLayer bridge beta | Authenticated transport only; it cannot choose a winner |
| Browser EVM wallet | MetaMask, Rabby, Coinbase Wallet, or another injected wallet for Base Sepolia signing |

Base Sepolia uses Circle test USDC at
0x036CbD53842c5426634e7929541eC2318f3dCF7e (six decimals). Test assets have
no value. Bradbury and mainnet are deliberately out of scope.

## User flow

1. A creator builds all six picks, chooses a fixture, and creates either a
   direct invitation (wallet-restricted) or open duel.
2. The opponent opens the shared link or enters the duel ID and submits a full
   ticket before kickoff.
3. Base locks both one-entry stakes. There is no money transfer between
   individual markets.
4. After the fixture is final, GenLayer validates the raw match facts from the
   registered public evidence page.
5. Base deterministically scores both tickets and the winner claims the
   two-player test-USDC pot. An exact scoring draw refunds both entries.

## Key implementation files

- [Base duel contract](contracts/src/ProofPlayBaseDuel.sol)
- [Base duel tests](contracts/test/ProofPlayBaseDuel.t.sol)
- [GenLayer resolver](genlayer/contracts/proofplay_resolver.py)
- [GenLayer direct tests](genlayer/tests/direct/test_proofplay_resolver.py)
- [Architecture and safety model](GENLAYER_MVP.md)
- [Ticket UI](frontend/src/components/ProofPlayMvp.tsx)

## Run locally

~~~powershell
pnpm install
Copy-Item frontend/.env.example frontend/.env
pnpm dev
~~~

Open http://localhost:3000.

The interface remains transparent in preview mode until a deployed Base Sepolia
duel address is supplied:

~~~dotenv
NEXT_PUBLIC_PROOFPLAY_DUEL_ADDRESS=0x...
~~~

Once configured, the UI approves Base Sepolia test USDC, creates direct or
open duels, generates a shareable duel link from the creation event, and lets
the invited player join with their own ticket. Before creating a live fixture,
register the identical fixture metadata and HTTPS evidence URL with the
GenLayer resolver. Base and GenLayer independently derive the same canonical
SHA-256 commitment; neither side accepts a caller-selected hash.

## Verification

~~~powershell
# Complete reviewer flow: GenLayer registration/resolution plus Base
# escrow/authenticated callback/settlement/claim
pnpm test:flow

# Next.js production build
pnpm build

# Base contract optimized-IR compile
node contracts/scripts/compile.mjs

# GenLayer direct tests
Push-Location genlayer
.\.venv\Scripts\python.exe -m pytest tests/direct -q
Pop-Location

# Hosted Studionet smoke test (requires network access)
Push-Location genlayer
.\.venv\Scripts\gltest.exe -v -s --network studionet tests/integration/test_studionet_smoke.py
Pop-Location
~~~

The bridge configuration is intentionally not hard-coded because its official
beta endpoints must be verified at deployment time. The contract fails closed
on an unverified callback and opens individual refunds when resolution exceeds
the configured timeout.
