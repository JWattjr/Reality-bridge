# Reality Bridge

**A real-world prediction and elimination game settled by GenLayer validator
consensus on StudioNet.**

Reality Bridge is a standalone GenLayer application inspired by the risk curve
of a glass-bridge challenge. Its bridge is not a secret bitmap. Each unopened
panel is a binary claim about a real-world event. The active runner commits to
`YES` or `NO` before the evidence exists; GenLayer validators later read the
registered public sources and settle the panel through consensus.

Network: **GenLayer StudioNet only** — chain id `61999`, RPC
`https://studio.genlayer.com/api`. Every asset here is a test asset with no
real-world value.

## Why GenLayer is essential

The consensus-critical decision is whether public evidence satisfies a panel's
human-readable `YES` condition. That needs web access, language interpretation,
source comparison and an explicit ambiguity policy — and it must be decided the
same way by independent validators, not by a server. A backend could index and
preview state, but it cannot choose an outcome or move the pool.

## How a round runs

1. The publisher registers evidence hosts, authors an ordered bridge of one to
   three binary panels, and opens it. Everything freezes at that moment.
2. Two to eight players join with the exact entry. Join order is crossing order.
3. Anyone may start the round once the join window closes.
4. The active runner commits a salted hash of `YES` or `NO`, then reveals it.
5. After the panel's evidence timestamp, anyone may ask validators to resolve
   it: `YES`, `NO`, `VOID`, or a retryable `UNRESOLVED`.
6. A correct runner earns a discovery credit; a wrong runner is eliminated and
   the next seat inherits the opened panels. `VOID` eliminates nobody.
7. Survivors split the whole pool by weight `1 + 3 × discovery_credits`.
   Cancellation, under-subscription, no-survivor and terminal expiry all unwind
   into individually claimable refunds of exactly one entry each.

Full rules, economics and the state machine:
[`specs/PRODUCT_SPEC.md`](specs/PRODUCT_SPEC.md).

## Layout

```text
reality-bridge/
├── DEPLOYMENT.md          # StudioNet deployment and browser verification
├── TESTING.md             # every test layer and how to run it
├── QA.md                  # hands-on manual testing guide
├── SECURITY.md            # threat model and mitigations
├── KNOWN_LIMITATIONS.md   # what this does not do
├── SUBMISSION.md          # submission checklist and artifacts
├── HANDOFF.md             # what is left to finish, for whoever picks this up
├── DEMO.md                # the uncut StudioNet demo script
├── deployment/
│   └── studionet.json     # network, address, runner, transactions, round
├── specs/
│   ├── PRODUCT_SPEC.md
│   ├── ARCHITECTURE.md
│   └── BUILD_PLAN.md
├── frontend/              # standalone Next.js App Router client (StudioNet only)
└── genlayer/
    ├── contracts/         # pinned-runner intelligent contract
    ├── scripts/           # deployment and lint tooling
    └── tests/
        ├── direct/        # deterministic contract behaviour
        └── integration/   # hosted StudioNet consensus journey
```

## Quick start

```bash
python -m pip install -r genlayer/requirements.txt
```

```bash
python -m pytest genlayer/tests/direct -q
```

```bash
npm --prefix frontend install && npm --prefix frontend run test
```

To deploy and play against the live network, follow
[`DEPLOYMENT.md`](DEPLOYMENT.md).

## Design commitments

- **StudioNet is the only network.** The chain id, RPC, explorer and currency
  all come from one module, `frontend/src/lib/network.ts`.
- **Nothing is called confirmed until the chain says so.** A returned hash means
  submitted. The interface follows every transaction to a decided consensus
  state and inspects the leader receipt, because GenLayer can accept a
  transaction whose contract execution reverted.
- **Authoritative reads are explicitly final** (`TransactionHashVariant
  .LATEST_FINAL`), never the SDK's non-final default.
- **No privileged keeper.** Activation, both forfeit paths, resolution, expiry,
  claims and refunds are permissionless and every one has a button.
- **Simulation is never mistaken for live play.** It is a separate mode, entered
  only on purpose, with its own visual language, and it never uses the words
  "on-chain", "live" or "validators agreed". A StudioNet failure surfaces an
  error instead of silently becoming a simulation.
- **The salt is the player's to keep.** The interface will not sign a commitment
  until the player has exported a versioned recovery bundle and said so.
- **Testnet only.** No mainnet path, no real-value play, no audit.

## Working rules for contributors

- Write only inside `apps/reality-bridge`.
- Never reuse another application's names, contracts or deployment addresses.
- Keep a concrete GenVM runner hash pinned in the contract header.
- Run `genvm-lint check` before the direct or integration suites.
- Read the bundled Next.js docs under `node_modules/next/dist/docs/` before
  changing framework code; this Next.js version has breaking changes.
