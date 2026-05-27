# ProofPlay X Cup

ProofPlay X Cup is a minimal USDT-backed football prediction game where each match becomes a prediction event. Users back official admin-created markets, earn 1 point for every correct prediction, compete on match and PvP leaderboards, and can win rare football NFTs in selected events.

Tagline: Back Your Picks.

## Product Rules

- Only admins create football game events.
- Only admins create markets inside a game event.
- Users cannot create public markets or prediction posts.
- Every prediction requires a USDT stake.
- Correct Pick = 1 point.
- Wrong Pick = 0 points.
- Stake size, market difficulty, odds, and payout do not affect points.
- Each game event has one player leaderboard and automatic PvP eligibility.
- World Cup PvP points accumulate across matches.
- Selected games can include player NFT rewards.

## Main Flow

1. See match.
2. Enter match.
3. Back official market outcomes with USDT.
4. Match resolves.
5. Correct picks earn points.
6. Leaderboards update.
7. Winners claim USDT winnings and optional NFT rewards.

## Current Implementation Pass

- Football game data model: `src/lib/football-data.ts`
- Home and app game cards: `src/app/page.tsx`, `src/app/app/page.tsx`
- Game event page and prediction modal: `src/app/app/event/[id]/page.tsx`, `src/components/PredictionModal.tsx`
- Player and PvP leaderboard pages: `src/app/app/leaderboard/page.tsx`
- Minimal profile: `src/app/app/profile/page.tsx`
- Admin dashboard foundation: `src/app/organizer/page.tsx`
- Supabase football schema additions: `supabase/schema.sql`
- MongoDB app data model and seed script: `docs/mongodb-data-model.md`, `npm run seed:mongodb`
- Contract foundation: `contracts/FootballPredictionGame.sol`
- Migration audit: `docs/proofplay-xcup-migration.md`
- X Layer testnet runbook: `docs/xlayer-testnet-runbook.md`

MongoDB is the production app database for new X Cup features. Legacy physical participation, QR/NFC, XP, badge, attendance, social, reputation, Supabase, and organizer SaaS flows are deprecated or hidden from the main UX while the football prediction stack is migrated safely.
