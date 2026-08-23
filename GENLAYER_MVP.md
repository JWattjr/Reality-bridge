# ProofPlay GenLayer MVP

## Goal

Ship a small football prediction experience that keeps test-USDC custody and
payouts on Base Sepolia while using a GenLayer Intelligent Contract on hosted
Studionet to determine the final match result from public web evidence.

This is a testnet prototype. Base Sepolia USDC and every other testnet asset in
the app have no financial value.

## Responsibility boundary

- **Frontend owns:** Privy login, Base Sepolia wallet switching, non-authoritative
  match previews, transaction progress, and readable result evidence.
- **Base Sepolia contract owns:** match configuration, the prediction deadline,
  one Home/Draw/Away pick per wallet, USDC escrow, pari-mutuel accounting,
  resolution-request state, trusted bridge callbacks, claims, and timeout
  refunds.
- **GenLayer contract owns:** the minimum non-deterministic decision: fetch the
  configured result page, extract a final score, have validators independently
  compare the outcome fields, and persist a canonical Home/Draw/Away result.
- **External sources own:** raw match facts. They are evidence, not trusted state;
  validators independently refetch them.
- **Bridge/relayer owns:** asynchronous delivery between Base Sepolia and
  Studionet. It must never be able to choose an arbitrary winner—the Base
  contract accepts callbacks only from its configured bridge receiver, and the
  payload identifies the configured GenLayer resolver.

## User flow

1. An admin creates one Base market with teams, kickoff, prediction cutoff, and
   a nonzero fixture commitment. The same 256-bit commitment is registered
   with the matching GenLayer resolver record.
2. A player approves official Base Sepolia test USDC and submits one of
   `HOME`, `DRAW`, or `AWAY` with a stake.
3. Once the match is final, anyone requests resolution. If it was requested
   too early or a beta relay attempt fails, anyone can retry it without moving
   the original refund deadline.
4. The relay delivers the market ID plus fixture commitment to the GenLayer
   resolver. The resolver refuses a request that does not match its registered
   fixture before it reads evidence.
5. GenLayer validators independently derive and compare the final score and
   outcome. Only a finished match can be persisted.
6. The relay returns `(marketId, outcome, homeScore, awayScore)` to Base; the
   Base callback separately verifies the configured resolver address.
7. Winners claim their pro-rata share. Users claim individually so resolution
   never loops over every prediction.
8. If no valid result arrives before the timeout, anyone opens refunds and each
   player withdraws their own stake.

## Network choices

| Responsibility | Network | Asset |
| --- | --- | --- |
| Escrow and payouts | Base Sepolia (`84532`) | Circle test USDC (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`) |
| Intelligent resolution | GenLayer hosted Studionet | Gasless hosted development environment |
| Cross-chain transport | GenLayer bridge beta | LayerZero + zkSync Sepolia hub + operated relay service |

Bradbury and Base mainnet are intentionally out of scope.

## Consensus design

The leader renders the configured public result page and asks an LLM for strict
JSON containing only `status`, `home_score`, `away_score`, and `outcome`. Each
validator repeats the web/LLM task and compares the decision fields. Free-form
reasoning is not stored or compared. Invalid JSON, inconsistent scores, an
unfinished game, and unknown outcome labels fail without changing state.

## Prototype safety gates

- No real-value asset or mainnet deployment.
- A pinned GenVM runner is required.
- The Intelligent Contract must pass `genvm-lint`, direct tests, and a Studionet
  consensus smoke test before its address is configured in Base.
- The Base contract must reject duplicate resolution messages and callbacks from
  any address other than the configured bridge receiver. Identical bridge
  replays are harmless; conflicting callbacks are rejected.
- Base and GenLayer bind every cross-chain request to the same fixture
  commitment, so a mismatched resolver registration fails closed instead of
  settling the wrong football match.
- The bridge is currently beta and operator-relayed, so a timeout refund path is
  mandatory.
