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

For a no-wallet demo, lock the completed ticket and ProofPlay automatically
assigns a bot opponent. The player cannot choose the bot, and its ticket stays
hidden until settlement. The UI then reveals a consistent simulated full-time
result, weighted scores, and the outcome of all six independent markets. Demo
duels are clearly labelled and never touch escrow or test funds.

1. A player builds all six picks and enters automatic matchmaking for the
   fixture. Choosing an opponent is available only through a private,
   wallet-restricted friend challenge.
2. Automatic matchmaking joins the next compatible open duel or queues a new
   one. For a private challenge, the invited friend opens the shared link and
   submits a full ticket before kickoff.
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
GenLayer resolver together with Base's canonical SHA-256 commitment. GenLayer
independently recomputes that commitment from its registered fields and
rejects the transaction on-chain if the metadata or evidence URL differs.

## Verification

~~~powershell
# Complete reviewer flow: real Studionet web consensus plus Base
# escrow/authenticated callback/settlement/payout (no mocked result)
pnpm test:flow

# Next.js production build
pnpm build

# Base contract optimized-IR compile
node contracts/scripts/compile.mjs

# GenLayer direct tests
Push-Location genlayer
.\.venv\Scripts\python.exe -m pytest tests/direct -q
Pop-Location

# Hosted real-web resolution only (requires network access)
Push-Location genlayer
.\.venv\Scripts\gltest.exe tests/integration/test_studionet_real_resolution.py -v -s --network studionet
Pop-Location
~~~

`pnpm test:flow` deploys a fresh resolver to Studionet, registers a completed
fixture with Base's expected commitment, and enters through the authenticated
Base-message handler. GenLayer validators render the committed public match
page and export their persisted consensus result. The Base harness refuses a
mismatched commitment, relays those exact returned facts rather than a fixture
constant, settles both independent tickets, and verifies the final test-USDC
payout. The command prints the resolver address and both Studionet transaction
hashes so a reviewer can inspect the network evidence.

Latest verified Studionet run (26 August 2026):

- Resolver: `0x030D6121a84546D314706b9684787126c72E17d4`
- Registration transaction: `0x05c90fb402d2d0ef28c828aac1e5c029b18bbbd5d52171cafd6a8d18d93d607c`
- Real-web resolution transaction: `0x87c918bc2a51eba83bb1220bc6bda76201f20a3b4fd0262d2b5694de8ef41f98`

Run `genlayer receipt <transaction-hash>` on Studionet to inspect either
transaction's consensus receipts.

The bridge configuration is intentionally not hard-coded because its official
beta endpoints must be verified at deployment time. The contract fails closed
on an unverified callback and opens individual refunds when resolution exceeds
the configured timeout.
