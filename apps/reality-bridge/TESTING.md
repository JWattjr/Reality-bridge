# Testing Reality Bridge

This is the **automated** reference. For sitting in front of the app with a
wallet and trying to break it, see [`QA.md`](QA.md).

Every command below is run from `apps/reality-bridge`.

| Layer | Command | Network |
| ----- | ------- | ------- |
| Contract lint + schema validation | `GENVMROOT=.genvmroot genvm-lint check genlayer/contracts/reality_bridge.py` | none |
| Contract behaviour | `python -m pytest genlayer/tests/direct -q` | none |
| Dependency audit | `npm --prefix frontend audit --audit-level=high` | none |
| Hosted consensus journey | `cd genlayer && python -m pytest tests/integration -q -s` | **StudioNet** |
| Frontend unit + component | `npm --prefix frontend run test` | none |
| Frontend types | `npm --prefix frontend run typecheck` | none |
| Frontend lint | `npm --prefix frontend run lint` | none |
| Production build | `npm --prefix frontend run build` | none |

## 1. Contract lint and validation

```bash
python -m pip install -r genlayer/requirements.txt
```

```bash
python genlayer/scripts/make_genvmroot.py
```

```bash
GENVMROOT=.genvmroot genvm-lint check genlayer/contracts/reality_bridge.py
```

`make_genvmroot.py` mirrors the SDK matching the **pinned** runner into
`.genvmroot/`. Without it the validator resolves the latest artifact bundle,
which no longer ships that runner, and reports `Failed to load SDK`. Relaxing
the pin instead is not acceptable.

On Windows, prefix the linter with `PYTHONUTF8=1` — it prints check marks that
the default `cp1252` console encoding cannot represent.

## 2. Direct-mode contract tests

```bash
python -m pytest genlayer/tests/direct -q
```

These run the real contract inside the GenVM direct runner with mocked web and
LLM responses. They cover:

- **Authoring** — owner-only round creation, source registration and
  revocation; duplicate round ids; out-of-order panels; empty, over-long,
  separator-bearing and fence-marker-bearing text.
- **Source policy** — HTTPS only, registered hosts only, no query string, no
  fragment, no userinfo, no IP literal, corroborating sources filled in order,
  no duplicates, revocation blocking only new panels.
- **Schedules** — commit-window and grace bounds; terminal deadline able to fit
  a single panel; first-panel cut-off at least a full commit window after the
  join deadline; monotonic panel deadlines; a later panel opening only after the
  previous one can resolve; resolution never racing the reveal grace; the whole
  schedule fitting before the terminal deadline. Each boundary is checked at
  equality, one second before and one second after.
- **Joining** — exact entry only, one seat per address, the eight-seat cap,
  join and start timing boundaries, permissionless activation.
- **One-player policy** — an under-subscribed round unwinds into refunds.
- **Commit/reveal** — hex format, domain separation across panels and accounts,
  runner-only commit and reveal, single use, wrong choice, wrong salt, and the
  exact-second window boundaries.
- **Consensus outcomes** — `YES`, `NO`, `VOID`, retryable `UNRESOLVED`,
  unavailable source, malformed model output, `FINAL` without a binary outcome,
  a contradicting corroborating source, and a consistent one.
- **Prompt injection** — a hostile page that forges the evidence fence and tells
  the model to emit its own reason code and receipt still produces canonical
  fields only.
- **Liveness** — a missed reveal handing the *same* panel to the next runner
  with a fresh window; a missed commit doing the same; the two forfeit paths not
  overlapping; four consecutive failures ending in `VOID_LIVENESS` rather than a
  late commitment; the last runner's failure unwinding the round; activation
  after the first cut-off voiding and moving on; terminal expiry.
- **Settlement** — weighted claims, the remainder rule, eliminated seats
  receiving nothing, no-survivor refunds, pool conservation in every shape,
  idempotent claims and refunds, unauthorised withdrawal, and a settled round
  never becoming refundable.

### Windows note

`genlayer-test`'s direct runner `dup2`s a temporary calldata file onto stdin and
then unlinks it while the handle is open. Windows rejects that unlink, so every
test fails with `PermissionError: [WinError 32]`.
`genlayer/tests/conftest.py` tolerates exactly that unlink and nothing else, so
the same suite runs unchanged on Linux CI, where the shim is a no-op passthrough.

### Reproducible Linux/CI path

```yaml
# .github/workflows/reality-bridge.yml (illustrative)
- uses: actions/setup-python@v5
  with: { python-version: "3.13" }
- run: python -m pip install -r apps/reality-bridge/genlayer/requirements.txt
- run: python -m pytest apps/reality-bridge/genlayer/tests/direct -q
  working-directory: apps/reality-bridge
```

The suite needs network access on its first run so `genlayer-test` can download
the pinned GenVM runner into `~/.cache/gltest-direct`.

## 3. Hosted StudioNet integration

```bash
cd genlayer && python -m pytest tests/integration -q -s
```

It must run from `genlayer/`, because `gltest` reads `gltest.config.yaml` from
the current directory. Run from anywhere else it refuses to start with an
explicit StudioNet configuration error rather than reporting a hosted result it
never obtained.

One test drives the whole product path against the real network: deployment,
source registration, round creation, panel authoring, opening, two funded joins,
permissionless activation, commit, reveal, a **real** validator resolution
against `https://test-server.genlayer.com/static/genvm/hello.html`, the stored
outcome and receipt, deterministic settlement, and a successful withdrawal for
both players.

It funds each account through the StudioNet faucet before its first
transaction. Skipping that is what makes a StudioNet run hang forever: an
unfunded deploy is submitted and never decides.

Expect about four minutes for roughly a dozen transactions — the consensus step
itself takes about 35 seconds. If a run instead appears to hang for tens of
minutes, the cause is almost certainly unroutable IPv6 records adding ~43 s to
every RPC call; `genlayer/scripts/netprefs.py` is wired into `conftest.py` to
prevent that.

## 4. Frontend tests

```bash
npm --prefix frontend run test
```

Vitest with jsdom and Testing Library, following the Next.js testing guide
bundled with the installed version.

- `tests/derive.test.ts` — state-derived action availability: runner-only
  commit/reveal, every write blocked on the wrong network, every write blocked
  while a transaction is pending, commit gated on an acknowledged recovery
  bundle, reveal gated on holding one, both
  forfeit paths at their exact boundaries, resolution gated on the reveal and
  the evidence timestamp, expiry after the terminal deadline, join gating,
  claim/refund eligibility including already-collected and never-joined
  wallets, and lobby ordering and filters.
- `tests/tx.test.ts` — transaction classification: numeric and named statuses,
  in-flight phases, an accepted transaction whose execution reverted, leader and
  validator timeouts, `UNDETERMINED`, revert-message extraction, and wallet
  rejection.
- `tests/recovery.test.ts` — commitment domain separation, CSPRNG salts, bundle
  round-tripping, rejection of malformed/wrong-version/wrong-network bundles,
  validation against wallet, contract, round, panel and on-chain commitment,
  tamper detection, durable storage across a simulated reload, and recovery
  after storage is cleared.
- `tests/simulation.test.ts` — every scenario driven to a terminal state using
  the simulation's own clock, proving the walkthrough completes without waiting
  on a real deadline; the deliberate-lapse route into the forfeit path; and that
  scripted outcomes do not bend to the player's choice.
- `tests/labels.test.tsx` — a lapsed deadline reads as a state rather than
  "closes in elapsed", and finished rounds stop labelling seats as waiting.
- `tests/submit.test.ts` — the write path itself: a refusal to sign from the
  wrong chain or with no wallet, a wallet dismissal reported as *rejected*
  rather than *failed*, the phase sequence through to acceptance, an accepted
  transaction whose execution reverted, a poll timeout, and a transient RPC
  failure that must not be mistaken for a chain failure.
- `tests/app.test.tsx` — the rendered app: StudioNet named as the only network
  and no other chain id present, the live badge and lobby, the wrong-network block,
  spectator mode, an RPC failure surfacing as an error rather than fixtures, the
  no-rounds empty state, pending-transaction reconciliation after a reload,
  simulation labelling and the absence of live vocabulary in it, no transaction
  sent while simulating, the commit gate on the recovery bundle, the exported
  bundle's contents, and a failed claim reported as failed.

## 5. Types, lint and build

```bash
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend audit --audit-level=high
```

A submission should report zero high or critical advisories. CI fails the build
otherwise.

The ESLint config is `eslint-config-next/core-web-vitals` plus
`eslint-config-next/typescript`, so React Compiler rules are errors. In
particular, effects must not call `setState` synchronously; the data loaders are
written as pure fetchers whose results are applied in promise callbacks.

## 6. Continuous integration

`.github/workflows/reality-bridge.yml` runs everything above that works
offline, on every push and pull request touching `apps/reality-bridge`:

- **contract** — direct tests, then `genvm-lint check` against the pinned
  runner (with the `GENVMROOT` mirror built first).
- **frontend** — typecheck, lint, tests, production build, dependency audit.
- **network-hygiene** — fails if any non-StudioNet GenLayer network appears in
  first-party code, tests or documentation, or if a secret file is tracked.

The hosted StudioNet journey is deliberately excluded: it sends real
transactions to a shared simulator and is run by hand before a deployment.

## 7. Manual accessibility and responsiveness pass

The full hands-on checklist lives in [`QA.md`](QA.md). The short version:

- Tab through the page: the skip link appears first, every control is reachable,
  and focus is visible (3 px outline).
- Check 360 px, 768 px and 1440 px widths. No horizontal page scroll; wide
  content (bundle JSON, transaction history) scrolls inside its own container.
- Enable "reduce motion" and confirm spinners and transitions stop animating.
- Verify status changes are announced: the transaction card is inside an
  `aria-live="polite"` region and the wrong-network banner uses `role="alert"`.
- Confirm long addresses, 18-decimal amounts and long questions wrap instead of
  overflowing.
