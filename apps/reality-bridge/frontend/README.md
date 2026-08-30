# Reality Bridge frontend

Standalone Next.js App Router client for Reality Bridge on **GenLayer
StudioNet** (chain id `61999`). It shares no package, configuration or
deployment with any other application in this repository, and it imports nothing
from one.

## Run locally

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

`NEXT_PUBLIC_REALITY_BRIDGE_CONTRACT` is **required**. Without it the app shows
a configuration error and offers the offline simulation as an explicit choice.
It never falls back to fixtures and never presents a simulation as live data.

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_REALITY_BRIDGE_CONTRACT` | Reality Bridge address on StudioNet (required) |
| `NEXT_PUBLIC_REALITY_BRIDGE_ROUND_ID` | pin one round as the default lobby selection |
| `NEXT_PUBLIC_GENLAYER_RPC` | override the StudioNet RPC endpoint |
| `NEXT_PUBLIC_GENLAYER_EXPLORER` | override the explorer base for links |

## Scripts

```bash
npm run test       # vitest: derive, transactions, recovery, rendered app
npm run typecheck  # tsc --noEmit
npm run lint       # eslint-config-next core-web-vitals + typescript
npm run build      # production build
```

## What this client guarantees

- **StudioNet or nothing.** The chain, RPC, explorer, currency and label all come
  from `src/lib/network.ts`, which re-exports `genlayer-js`'s `studionet`. The
  wallet's chain id is checked, every write is blocked off-network, and a
  switch/add-network flow is offered.
- **Honest transaction status.** A returned hash means *submitted*. The client
  follows each transaction to a decided consensus state and inspects
  `consensus_data.leader_receipt[0].execution_result`, because GenLayer can
  accept a transaction whose contract execution reverted, and `UNDETERMINED`,
  `CANCELED`, `LEADER_TIMEOUT` and `VALIDATORS_TIMEOUT` are decided states that
  mean failure. Submitted hashes are stored locally and reconciled after a
  reload.
- **Final reads.** Authoritative views use
  `TransactionHashVariant.LATEST_FINAL`, not the SDK's non-final default.
- **Recovery custody.** A commitment cannot be signed until the player has
  exported a versioned recovery bundle (copy or download) and confirmed it. The
  bundle is also written to durable local storage *before* the wallet step, and
  can be re-imported on any device — it is validated against the wallet, the
  contract, the round, the panel and the on-chain commitment. **Salts are never
  uploaded.**
- **Every state has a control.** Join, start, commit, reveal, resolve, forfeit a
  missed commit, forfeit a missed reveal, expire, claim and refund are all
  reachable, each with a countdown and a plain sentence explaining why it is
  unavailable when it is.
- **Eligibility-aware claims.** The claim and refund buttons read the connected
  player's recorded amount: eligible, not eligible, already collected, wrong
  wallet, or wrong network.
- **Simulation is separate.** A hatched banner, a distinct network pill, fixed
  scripted outcomes chosen before the player picks, and no live vocabulary
  anywhere. Entering it is always an explicit click.

## Structure

```text
src/
├── app/
│   ├── layout.tsx        # metadata, viewport, stylesheets
│   ├── page.tsx
│   ├── globals.css       # base visual identity
│   └── components.css    # product surfaces + accessibility baseline
├── components/
│   ├── RealityBridgeApp.tsx     # orchestration, wallet, loading, transactions
│   ├── RoundLobby.tsx           # list, filters, ordering
│   ├── RoundBoard.tsx           # bridge, evidence receipts, player rail
│   ├── ActionPanel.tsx          # state-gated controls and countdowns
│   ├── PreSignatureDisclosure.tsx
│   ├── RecoveryBundlePanel.tsx  # export and restore
│   ├── TransactionMonitor.tsx
│   └── ui.tsx                   # countdown, status pill, copy, empty state
└── lib/                         # network, contract, tx, crypto, recovery,
                                 # storage, derive, economics, simulation, format
```

## Framework note

This project uses a Next.js version with breaking changes. Read the relevant
guide under `node_modules/next/dist/docs/` before changing framework code — the
bundled docs match the installed version. In particular, the React Compiler lint
rules are errors here: effects must not call `setState` synchronously, so the
data loaders are pure fetchers whose results are applied in promise callbacks,
and browser-owned state (wallet presence, transaction history) is read through
`useSyncExternalStore`.
