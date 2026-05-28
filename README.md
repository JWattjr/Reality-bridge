# ProofPlay

ProofPlay is a gamified prediction market on X Layer where players compete by making correct football predictions. Each football match is one prediction round with official markets, USDT-backed picks, automatic 1v1 pairing, match leaderboards, and optional rewards.

Players are paired 1v1 per match. The player with the most correct predictions at the end of the football game wins that match round. For the World Cup format, ProofPlay supports 104 rounds, one for each World Cup match.

**Tagline:** Predict football. Score points. Win rewards.

## What It Does

- Users sign in with Privy and use their Privy embedded wallet.
- Admins create football match events and official prediction markets.
- Users back outcomes with Test USDT on X Layer testnet.
- Every correct pick earns exactly 1 match point.
- Stake size affects pool payout only, never points.
- Each match has a match leaderboard.
- Each match has an automatic PvP pool.
- Selected matches can show NFT reward eligibility.

## Core User Flow

1. Pick a football match.
2. Open an official market.
3. Choose an outcome.
4. Stake Test USDT.
5. Match markets resolve.
6. Correct picks earn 1 point each.
7. Winners claim USDT payouts.
8. PvP points and leaderboards update.

## Automatic PvP

PvP is off-chain and handled by the backend.

- A user enters a match PvP pool after placing at least one USDT-backed pick in that match.
- Entrants are numbered by first successful indexed bid.
- Odd entries pair with the next even entry: `#1 vs #2`, `#3 vs #4`, `#5 vs #6`.
- If an odd entry has no even opponent yet, that entry stays `PENDING`.
- When the next even entrant arrives, the pool refreshes and they pair automatically.
- Correct predictions become PvP hits.
- Winner gets `100` PvP points.
- Loser gets `30` PvP points.
- Draw gives `50` points each.
- Bye/unmatched after resolution gives `50` points.

PvP points are separate from USDT payouts.

## Rank Tiers

- Rookie: `0`
- Veteran: `1,500`
- Elite: `3,000`
- Pro: `4,800`
- Master: `6,500`
- Grand Master: `8,200`
- Legendary: `9,600`

## Tech Stack

- Frontend: Next.js, React, Tailwind CSS, Privy, ethers
- Backend: NestJS, MongoDB, Socket.IO
- Chain: X Layer testnet
- Contracts: Solidity / Foundry
- Auth wallet: Privy embedded wallet
- Database: MongoDB

## Project Structure

```txt
frontend/   Next.js app, wallet UI, match pages, bet slip, leaderboards
backend/    NestJS API, MongoDB models, admin actions, PvP pairing
contracts/  Football prediction and Test USDT contracts
```

## Local Setup

Install dependencies:

```bash
pnpm install
```

Create env files from the examples:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Required frontend env:

```bash
NEXT_PUBLIC_XLAYER_RPC_URL=
NEXT_PUBLIC_TEST_USDT_ADDRESS=
NEXT_PUBLIC_FOOTBALL_PREDICTION_ADDRESS=
NEXT_PUBLIC_PRIVY_APP_ID=
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

Required backend env:

```bash
PORT=3001
MONGODB_URI=
MONGODB_DB_NAME=proofplay_xcup
PRIVY_APP_ID=
PRIVY_APP_SECRET=
XLAYER_RPC_URL=
FOOTBALL_PREDICTION_ADDRESS=
TEST_USDT_ADDRESS=
ADMIN_PRIVATE_KEY=
```

Run frontend and backend:

```bash
pnpm dev
```

Frontend runs on `http://localhost:3000`.
Backend runs on `http://localhost:3001`.

## Useful Commands

```bash
pnpm build
pnpm --filter frontend build
pnpm --filter backend build
pnpm --filter backend seed
```

## Important Implementation Notes

- Frontend and backend contract addresses must match.
- Test USDT uses `6` decimals.
- Market `minStake` values on-chain must also use `6` decimals.
- Bets use Privy embedded wallets, not injected external wallets.
- MongoDB stores app/game state and indexed predictions.
- Smart contracts handle USDT staking, market resolution, claiming, and refunds.
- PvP is backend-only and does not change market payout logic.

## Current Product Positioning

ProofPlay turns official football matches into simple prediction events. Fans back picks with USDT, score one point for every correct prediction, get automatically paired in PvP battles, climb match and World Cup leaderboards, and compete for selected rewards.
