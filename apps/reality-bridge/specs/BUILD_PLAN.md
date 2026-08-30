# Reality Bridge build plan

Target network throughout: **GenLayer StudioNet** (chain id `61999`).

## Milestone 1 — deterministic contract core — complete

- Pinned-runner contract package with an owner-managed evidence source registry.
- Owner-curated round drafting and immutable opening.
- Player joins, permissionless activation, ordered runner selection,
  commitments, reveals, and both missed-commit and missed-reveal recovery.
- Per-runner attempt windows clamped by the immutable terminal deadline.
- Schedule validation that rejects impossible authoring configurations.

Exit condition met: every deterministic behaviour is tested without trusting a
web or LLM result. **49 direct-mode tests pass** in about three seconds.

## Milestone 2 — consensus-backed panel resolution — complete

- Registered-host HTTPS render plus JSON extraction, with the page fenced,
  sanitised and truncated before it reaches a prompt.
- Deterministic source priority: primary decides; a corroborating source can
  only downgrade a `FINAL` to `VOID` on contradiction.
- Model output canonicalised into `status`, `outcome`, `reason_code`,
  `event_id`, `effective_date` and a computed `evidence_receipt`; free-form
  prose never reaches storage.
- A leader/validator pair that independently re-runs the task and compares all
  six fields.
- Expected, transient and LLM error classes distinguished; `UNRESOLVED` stays
  retryable and moves no deadline.

Exit condition met: a hosted StudioNet transaction resolved a real page.
`resolve_tile` was accepted in 35 s with `outcome=YES`,
`reason_code=FINAL_EVIDENCE` and receipt `29e984e6…0271e6`.

## Milestone 3 — native value settlement — complete

- Payable joins with exact-entry enforcement.
- Deterministic survivor claims (`1 + 3 × discovery_credits`) with the remainder
  going to the highest-credit survivor.
- Individually claimable refunds for cancellation, under-subscription,
  no-survivor and terminal expiry.
- Conservation asserted inside the transaction that fixes amounts; state written
  before every external transfer.
- Protocol fee fixed at zero, with no accrual account and no admin withdrawal.

Exit condition met on chain, not just in tests: the hosted round settled
`1.6 × 10^16` and `0.4 × 10^16` against a `2 × 10^16` pool, both players
withdrew, and the contract's balance is `0`.

## Milestone 4 — StudioNet-only frontend — complete

- One network module re-exporting `genlayer-js`'s `studionet`; chain validation
  and a switch/add-network flow; explorer links derived from the chain.
- Round lobby with lifecycle filters, correct ordering and a "my rounds" view.
- Every contract state has a control, a countdown and a stated reason when the
  control is unavailable.
- Real transaction lifecycle: submitted → consensus phases → accepted/finalized
  or failed/rejected/timed-out, with the leader receipt inspected and pending
  hashes reconciled after a reload.
- Versioned recovery bundle with an export gate before the commit signature and
  a validating import flow.
- Pre-signature disclosure covering amount, maximum loss, fee, payout range,
  refund conditions, expected transactions, deadline consequences and the salt
  warning.
- Simulation separated from live play in mode, vocabulary and visual language,
  with scripted outcomes fixed before the player chooses.

Exit condition met: lint, typecheck, production build and 57 frontend tests
pass, and the live page was verified in a browser against the deployed contract.

## Milestone 5 — end-to-end verification — complete, with one external step

- `genvm-lint check` passes lint and schema validation against the pinned runner.
- 49 direct tests, 57 frontend tests, one hosted StudioNet journey.
- Contract deployed and a durable round published; artifacts recorded in
  `deployment/studionet.json`.
- Browser verification of the live read path, network identity, action gating,
  responsiveness and simulation labelling.

Remaining external step: the wallet-signed half of the browser journey and
frontend hosting both need credentials this environment does not hold. See the
**Remaining external step** section of [`../SUBMISSION.md`](../SUBMISSION.md).

## Operational note worth keeping

StudioNet's endpoint publishes AAAA records that are unroutable from some hosts.
Python's sequential connect then costs about 43 seconds **per RPC call**, which
makes a hosted run look like it has hung — this is what stalled the earlier
integration attempt. `genlayer/scripts/netprefs.py` orders IPv4 first without
removing IPv6, and a full hosted journey drops from hours to under four minutes.
