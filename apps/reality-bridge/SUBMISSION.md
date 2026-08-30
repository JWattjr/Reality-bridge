# Reality Bridge — submission checklist

Network: **GenLayer StudioNet only**, chain id `61999`.

Every artifact below is read back from
[`deployment/studionet.json`](deployment/studionet.json) or quoted verbatim
from a command. Where something is unverified, it says so.

## Verified artifacts

| Artifact | Value |
| -------- | ----- |
| Pinned GenVM runner | `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` |
| Published contract | `0x4DE4c2aFC908fd744b65Fe8361FEE4Dc1C5c8CA9` |
| Publisher account | `0xf19AA039E52fC65A23f2f98FBA15081244C32d4d` |
| Deployment transaction | `0xb0861ef6bcf63aacd58c06662333a80d3ee675aeb59f7cc0fffd43e0dd9cafd3` |
| Published round | `3` — one panel, entry `0.01 GEN` |
| Frontend URL | [reality-bridge-beta.vercel.app](https://reality-bridge-beta.vercel.app) — production, verified |
| Demonstration recording | **not recorded** — see *Outstanding* |

Per-transaction hashes, deadlines and the panel threshold are in the manifest.
Do not assume a round listed there is still joinable: rounds carry real
deadlines and expire. Publish a fresh one using the recipes in
[`QA.md`](QA.md).

### The published round poses a genuinely open question

> Will the Bitcoin block height reported by the registered source be greater
> than **964782** at the evidence timestamp?

The threshold is computed from the live tip height at publish time (`964781`),
so at the moment a player commits, the answer does not exist yet. The evidence
source is `https://blockstream.info/api/blocks/tip/height`: public,
path-addressed, monotonic and unambiguous.

An earlier build published a question against a static fixture page whose
answer was readable before committing. That exercised the consensus plumbing
but not the product, and has been replaced.

## Definition of done

| Requirement | Status | Evidence |
| ----------- | ------ | -------- |
| StudioNet is the only network, everywhere | done | a repository-wide search finds no other GenLayer network outside third-party dependencies; enforced by a CI job and by `tests/app.test.tsx`, which derives the forbidden set from the SDK's own chain list |
| Terminal deadline is a hard boundary | done | resolution past the deadline unwinds instead of settling; both orderings tested at `terminal + 1` |
| Missed-commit and missed-reveal liveness | done | per-attempt windows; the same panel is handed on while still answerable, and voided for liveness once it is not |
| Impossible schedules rejected | done | boundary tests at equality, one second before and one second after |
| Commit/reveal recovery after storage loss | done | versioned bundle, export gate, validating import |
| Every permissionless path in the UI | done | start, both forfeits, resolve, expire, claim, refund |
| Transaction success requires proof | done | `execution_result === "SUCCESS"` is required; a decided transaction with no receipt stays pending; the watch runs through to finality |
| Authoritative reads are final | done | `TransactionHashVariant.LATEST_FINAL` on every read |
| Claims and refunds eligibility-aware and idempotent | done | contract and UI tests |
| Evidence receipts are meaningful | done | derived from host, status, outcome, event id and effective date |
| Simulation completes, and is never mistaken for live play | done | its own scripted clock; every scenario driven to a terminal state in tests; simulation-specific wording |
| Publisher rotation is recoverable | done | two-step transfer and accept, withdrawable, zero address rejected |
| Zero high or critical advisories | done | `npm audit` reports `found 0 vulnerabilities` on `next@16.3.3` |
| Contract lint and schema validation | done | 28 methods (9 view, 19 write) |
| Deterministic contract tests | done | 56 passed |
| Frontend tests | done | 90 passed across 7 files |
| Hosted StudioNet journey | done | see *Command results* |
| Continuous integration | done | `.github/workflows/reality-bridge.yml` — contract, frontend and network-hygiene jobs |
| Source is versioned | done | commits `a5c6d31`, `5305d48`, `9198aab`, and `61c139e` |
| Public URL | done | production URL recorded in `deployment/studionet.json` and checked with browser automation |
| Recorded demonstration | OUTSTANDING | the two-wallet journey still needs real wallet signatures and an uncut recording |

## Command results

```text
GENVMROOT=.genvmroot genvm-lint check genlayer/contracts/reality_bridge.py
  Lint passed (3 checks)
  Validation passed - RealityBridge, 28 methods (9 view, 19 write)

python -m pytest genlayer/tests/direct -q
  56 passed

npm --prefix frontend run test
  7 test files, 90 passed

npm --prefix frontend run typecheck     clean
npm --prefix frontend run lint          clean
npm --prefix frontend run build         Compiled successfully - 2 static routes
npm --prefix frontend audit             found 0 vulnerabilities
```

The hosted journey is run by hand, because it sends real transactions:

```bash
cd genlayer && python -m pytest tests/integration -q -s
```

It deploys a throwaway contract, funds two accounts, authors and opens a round,
joins twice, activates permissionlessly, commits, reveals, runs a real
validator resolution, checks the stored outcome and receipt, settles, and
withdraws for both players. Results are recorded in the manifest under
`verification`.

## What the hosted journey proved

A run on contract `0xeC37Bb0a63502143ec87Dc5E5174a1131e375A54` finished
`SETTLED` with `claimed_amount == pool`, weighted claims of `1.6e16` and
`0.4e16` against a `2e16` pool, and a **contract balance of zero** once both
players withdrew. Conservation was proven on chain, not merely asserted in a
test. A second run on `0xf44f742e885586B15dD5d86d9bC25f5C8B624045` reproduced
it.

Both predate the terminal-deadline fix; the run against the corrected contract
is recorded in the manifest.

## Browser verification performed

Against the hosted production URL and a local dev server pointed at the
published contract:

- The full lifecycle watched live while two funded accounts played a round:
  lobby pool and seats updating after both joins, `ACTIVE` with five
  countdowns, the stage advancing to `RESOLVE` after the reveal with both
  forfeit controls correctly disappearing, and settlement showing the evidence
  receipt and weighted claims.
- Network pill *GENLAYER STUDIONET*, footer *chain 61999*; no other chain id
  anywhere in the DOM.
- Actions correctly gated with a stated reason when no wallet is connected.
- An RPC failure surfaced the *StudioNet is not answering* panel rather than
  falling back to fixtures.
- Simulation entered by click: distinct chrome, scripted outcomes that do not
  bend to the player's choice, and no live-network vocabulary.
- Mobile at 375 px: no horizontal overflow, no touch target under 44 px.

The hosted production URL renders the same StudioNet-only lobby and live round
3 configuration; the signed two-wallet journey is the only remaining check.

## Outstanding

One item remains, and it is not blocked on code: **complete and record the
two-wallet journey against the public URL.** The signed half needs wallets this
environment does not hold. The steps are in [`QA.md`](QA.md); the narration is
in [`DEMO.md`](DEMO.md).

Until that recording exists this is **not submission-ready**, however green
the checks are. Everything verifiable without a wallet has been verified.

## Reading list for a reviewer

1. [`specs/PRODUCT_SPEC.md`](specs/PRODUCT_SPEC.md) — rules and economics.
2. [`specs/ARCHITECTURE.md`](specs/ARCHITECTURE.md) — consensus boundary and invariants.
3. [`SECURITY.md`](SECURITY.md) — threat model.
4. [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) — what this does not do.
5. [`QA.md`](QA.md) — hands-on testing, including the wallet steps.
6. [`DEMO.md`](DEMO.md) — the uncut walkthrough.
