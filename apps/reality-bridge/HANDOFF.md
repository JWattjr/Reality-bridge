# Reality Bridge — handoff

The build is complete and every offline check passes. The source is committed,
round 2 is published on StudioNet, and the frontend is hosted. What remains is
the funded-wallet journey and its uncut recording.

Read [`SUBMISSION.md`](SUBMISSION.md) for the full picture and
[`QA.md`](QA.md) for the hands-on procedures. This file is only the remaining
work.

## Current state

| | |
| --- | --- |
| Contract (StudioNet, chain `61999`) | `0x4DE4c2aFC908fd744b65Fe8361FEE4Dc1C5c8CA9` |
| Publisher account | `0xf19AA039E52fC65A23f2f98FBA15081244C32d4d` |
| Publisher key | `genlayer/.deployer.key` — **git-ignored, local to the machine that deployed** |
| Published round 1 | expired unjoined; retained as historical manifest data |
| Published round 2 | `OPEN`, one panel, future-resolving Bitcoin question |
| Git | source committed as `a5c6d31`, `5305d48`, and `9198aab` |
| `frontendUrl` in the manifest | `https://reality-bridge-beta.vercel.app` |

Passing now: contract lint + schema (28 methods), 56 direct tests, 90 frontend
tests, typecheck, lint, production build, `npm audit` clean, the hosted
StudioNet integration journey (192 s), and the public URL smoke check.

## Task 1 — Commit the source (done)

69 files across `apps/reality-bridge/` and `.github/`. Nothing in the tree
carries AI attribution; keep it that way — **no `Co-Authored-By`, no
"generated with" trailers, no tool names in commit messages.**

Confirm before committing that no secret is staged:

```bash
git ls-files | grep -E '\.env(\.local)?$|\.deployer\.key$'
```

That must print nothing. `.gitignore` already covers `.env.local`,
`.deployer.key`, `.genvmroot/`, `artifacts/` and `__pycache__/`.

CI (`.github/workflows/reality-bridge.yml`) runs on push: contract, frontend,
and a network-hygiene job that fails on any non-StudioNet GenLayer network or
a tracked secret.

## Task 2 — Publish a fresh, joinable round (done)

Rounds carry real deadlines and expire. Round 1 is past its join window; round 2
is the current public round.

**If you are on the machine that holds `genlayer/.deployer.key`:**

```bash
python genlayer/scripts/deploy_studionet.py --contract 0x4DE4c2aFC908fd744b65Fe8361FEE4Dc1C5c8CA9 --round-id 2 --join-window 1800 --commit-window 1800 --panel-window 3600 --reveal-grace 900
```

**If you are not** — the key cannot be recovered, so deploy fresh:

```bash
python genlayer/scripts/deploy_studionet.py --join-window 1800 --commit-window 1800 --panel-window 3600 --reveal-grace 900
```

That writes a new key to `genlayer/.deployer.key`. **Keep it**: it is the only
way to author further rounds on that deployment. The manifest merges rather
than overwrites, so an existing deployment record survives.

The published question is built from the live Bitcoin tip height at publish
time (`--block-margin`, default `+1`), so the answer genuinely does not exist
when players commit. Do not replace it with a static fixture page; that was a
prior defect.

`--panel-window` larger than `--commit-window` leaves slack so a forfeited
runner hands the **same** panel to the next seat. Without it every forfeit
produces `VOID_LIVENESS`.

## Task 3 — Host the frontend (done)

```bash
cp frontend/.env.example frontend/.env.local     # set the two NEXT_PUBLIC_ vars
npm --prefix frontend run build
```

The production URL is [`https://reality-bridge-beta.vercel.app`](https://reality-bridge-beta.vercel.app).
It is a static-capable Next.js deployment of the single client page. The host
has:

```text
NEXT_PUBLIC_REALITY_BRIDGE_CONTRACT=0x...
NEXT_PUBLIC_REALITY_BRIDGE_ROUND_ID=          # optional; blank picks the most urgent
```

The URL is recorded and verified in:

```jsonc
// deployment/studionet.json
"frontendUrl": "https://reality-bridge-beta.vercel.app"
```

## Task 4 — Two-wallet journey against the public URL

This is the last unverified requirement. It must run against the **hosted
URL**, not localhost, with two real wallet profiles.

Set up each wallet on StudioNet — chain `61999` (`0xf22f`), RPC
`https://studio.genlayer.com/api`, symbol `GEN`, 18 decimals. The app's
*Switch to GenLayer StudioNet* button does this.

Fund each (StudioNet has no faucet page, only this RPC method):

```bash
curl -s -X POST https://studio.genlayer.com/api -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"sim_fundAccount","params":["0xYOUR_ADDRESS",5000000000000000000],"id":1}'
```

Then walk the journey, recording it uncut:

1. Wallet A joins — read the pre-signature disclosure aloud before signing.
2. Wallet B joins.
3. After the join window closes, press **Start the round** (permissionless —
   works from any wallet).
4. Runner picks a side. Copy **and** download the recovery bundle, tick the
   confirmation; only then does commit enable.
5. **Prove recovery**: clear site data or open a fresh profile, then restore
   the bundle before revealing. It is validated against wallet, contract,
   round, panel and the on-chain commitment.
6. Reveal.
7. After the evidence timestamp, **Ask validators to resolve**.
8. Claim from both wallets. Confirm a second claim is refused.

Verify each step against chain state in a second terminal:

```bash
python genlayer/scripts/show_round.py --watch
```

**If the UI and that script disagree, the UI is wrong.** The one legitimate
lag: authoritative reads use the finalized variant, so the board trails an
accepted transaction briefly.

After the wallet journey is recorded, update `SUBMISSION.md` and set
`recordedDemonstration` to `true` in the manifest. `frontendUrlVerified` is
already `true`.

## Gotchas that will otherwise waste your time

- **An unfunded account looks like a hang, not an error.** The transaction is
  submitted and never decides. Check the balance first.
- **Unroutable IPv6 adds ~43 s to every RPC call.** The Python tooling handles
  this via `genlayer/scripts/netprefs.py`. If a hosted run appears to hang for
  tens of minutes, that is the cause.
- **The integration suite must run from `genlayer/`** so `gltest.config.yaml`
  is found. It refuses to start elsewhere unless that StudioNet configuration
  is present:
  ```bash
  cd genlayer && python -m pytest tests/integration -q -s
  ```
- **`genvm-lint validate` needs `GENVMROOT`.** The latest artifact bundle no
  longer ships the pinned runner:
  ```bash
  python genlayer/scripts/make_genvmroot.py
  GENVMROOT=.genvmroot genvm-lint check genlayer/contracts/reality_bridge.py
  ```
- On Windows prefix the linter with `PYTHONUTF8=1`.

## Do not change

- The pinned runner in the contract header
  (`py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`). If
  validation fails, fix `GENVMROOT`, not the pin.
- StudioNet as the only network. CI fails on any other GenLayer network
  appearing anywhere, including documentation.
- `next` pinned exactly at `16.3.3`. Read
  `node_modules/next/dist/docs/` before any framework change — this version has
  breaking changes relative to older training data.
- The published question must stay genuinely future-resolving.

## Full verification before submitting

```bash
python -m pytest genlayer/tests/direct -q                 # 56 passed
GENVMROOT=.genvmroot genvm-lint check genlayer/contracts/reality_bridge.py
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run test                            # 90 passed
npm --prefix frontend run build
npm --prefix frontend audit --audit-level=high            # 0 vulnerabilities
cd genlayer && python -m pytest tests/integration -q -s   # ~3 min, real network
```
