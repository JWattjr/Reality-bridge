# Reality Bridge architecture

Network: **GenLayer StudioNet only** (chain id `61999`, RPC
`https://studio.genlayer.com/api`). The chain definition, RPC endpoint,
explorer base and currency all come from `genlayer-js`'s `studionet` export,
re-exported once from `frontend/src/lib/network.ts`.

## Responsibility boundary

### Frontend (`frontend/`)

- Connects an injected EVM wallet, validates its chain id against StudioNet and
  offers a switch/add-network flow.
- Reads rounds, panels, players and economics constants from contract views.
- Generates salts with the platform CSPRNG and builds commitments locally.
- Produces a versioned recovery bundle and refuses to sign a commitment until
  the player confirms they have saved it.
- Submits transactions and follows them to a decided consensus state, checking
  the leader receipt before reporting success.
- Exposes every permissionless recovery action.

The frontend never decides an outcome, an elimination, a payout, a refund or
crossing order. It re-implements no business rule: weights, limits and the fee
come from `get_config`.

### Intelligent Contract (`genlayer/contracts/reality_bridge.py`)

- Owns an allowlist of evidence hosts.
- Stores immutable round and panel definitions.
- Holds native StudioNet GEN entries.
- Freezes join order at activation.
- Accepts commitments, verifies reveals, and enforces per-attempt windows
  clamped by the immutable terminal deadline.
- Renders registered evidence inside a leader/validator nondeterministic block
  and canonicalises the result before storage.
- Eliminates players, awards discovery credits, and computes deterministic
  claims and refunds with an in-transaction conservation assertion.

### External sources

Publish the underlying facts. They have no authority over contract state by
themselves; the leader and every validator fetch them independently.

## Consensus boundary

The nondeterministic block returns exactly:

```json
{
  "status": "FINAL | VOID | UNRESOLVED",
  "outcome": "YES | NO | NONE",
  "reason_code": "FINAL_EVIDENCE | VOID_EVIDENCE | VOID_CONTRADICTION | UNRESOLVED",
  "event_id": "normalized stable identifier, or NONE",
  "effective_date": "YYYY-MM-DD, or empty",
  "evidence_receipt": "sha256 over the fields above plus round, panel and host"
}
```

`_canonicalize_resolution` folds free-form model output into that shape before
it is compared or stored, so wording variation cannot become a settlement
difference and injected text cannot become a reason code.

Validator agreement rules, implemented in `_resolve_tile_consensus`:

- Every validator re-runs the same render-and-extract task.
- All six fields above must match exactly. Schema-only validation is not used.
- Malformed model output raises, which reads as leader disagreement and forces
  rotation.
- A transient source failure produces `UNRESOLVED`, which is distinguished from
  a stable `VOID` and never eliminates a player or moves a deadline.

### Prompt-injection defence

1. Rendered pages are sanitised: control characters removed, the reserved unit
   separator stripped, and the fence markers themselves neutralised so a page
   cannot close the fence.
2. Page text is truncated to 16 000 characters before it reaches a prompt.
3. The page is delimited by `<<<REALITY_BRIDGE_EVIDENCE` /
   `REALITY_BRIDGE_EVIDENCE>>>` with an explicit instruction that everything
   inside is untrusted data.
4. Publisher-supplied text is rejected if it contains the separator or either
   fence marker.
5. Even a fully successful injection can only move `status`/`outcome`; reason
   codes and the receipt are computed by the contract, never copied from the
   model.

## Deterministic state model

| Structure     | Holds                                                                          |
| ------------- | ------------------------------------------------------------------------------ |
| `SourceState` | registered host, label, active flag, registration time                          |
| `RoundState`  | publisher config, lifecycle status, deadlines, current panel, active runner, per-attempt deadline, pool accounting |
| `TileState`   | frozen prompt, condition, up to three sources, deadlines, outcome, reason code, receipt, extraction fields, attempts |
| `PlayerState` | join index, status, discovery credits, commitment, reveal, claim and refund accounting |

Storage uses GenLayer types only: `TreeMap`, `DynArray`, `u256`, `Address` and
`@allow_storage` dataclasses.

## Security invariants

1. `Σ claim_amount == pool` at settlement and `Σ refund_amount == pool` when a
   round unwinds; both are asserted inside the transaction that fixes them.
2. An opened round's panel definitions are immutable.
3. Only the active runner may commit or reveal, and the message sender is
   checked against the runner's account.
4. One commitment per runner attempt; one reveal per commitment.
5. Reveal input must reproduce the stored domain-separated commitment.
6. No outcome is stored without independent validator agreement on every
   persisted field.
7. A panel transitions from `PENDING` to `RESOLVED` exactly once.
8. Resolution retries never move a choice, reveal, attempt or terminal deadline.
9. Claims and refunds are idempotent; the collected flag is written before the
   external transfer.
10. Publisher privileges cannot select winners or withdraw player escrow.
11. No commitment is accepted at or after a panel's information cut-off.
12. Past the terminal deadline a round can only unwind. Resolution stops
    settling and settlement re-checks the deadline, so the outcome cannot
    depend on whether resolution or expiry lands first.
13. Publisher rotation is two-step and withdrawable, so the authoring role is
    recoverable without ever being transferable in a single mistyped call.

## Liveness

Activation, missed-commit forfeiture, missed-reveal forfeiture, resolution,
expiry, claims and refunds are permissionless once their preconditions hold, and
each has a button in the interface. Every web-dependent state has a fixed
timeout that leads to `VOID` or `REFUNDABLE`; funds never wait indefinitely on a
website.

## Frontend module map

| Module              | Responsibility                                                             |
| ------------------- | -------------------------------------------------------------------------- |
| `lib/network.ts`    | the single StudioNet definition, explorer links, chain switching            |
| `lib/contract.ts`   | typed views, `LATEST_FINAL` reads, write submission and receipt following   |
| `lib/tx.ts`         | pure transaction-status classification and error humanising                 |
| `lib/crypto.ts`     | CSPRNG salt and the commitment, byte-aligned with the contract              |
| `lib/recovery.ts`   | versioned recovery bundle: build, serialize, parse, validate                |
| `lib/storage.ts`    | durable local bundle store, pending-transaction log, history store          |
| `lib/derive.ts`     | pure state derivation: which action is available and why not                |
| `lib/economics.ts`  | display-only payout projections from `get_config`                           |
| `lib/simulation.ts` | scripted offline scenarios, fully separated from live state                 |
| `lib/format.ts`     | amounts, addresses, timestamps, countdowns                                  |

### Reads are explicitly final

Every authoritative read passes
`transactionHashVariant: TransactionHashVariant.LATEST_FINAL`. The SDK's default
is `latest-nonfinal`, which can surface state that consensus has not settled.

### Writes are followed, not assumed

`submitWrite` moves through *awaiting signature → submitted → pending/proposing/
committing/revealing → accepted/finalized* or *failed/rejected/timed-out*. A
decided state is not enough: `classifyTransaction` also inspects
`consensus_data.leader_receipt[0].execution_result`, because GenLayer can accept
a transaction whose contract execution reverted, and `UNDETERMINED`,
`CANCELED`, `LEADER_TIMEOUT` and `VALIDATORS_TIMEOUT` are decided states that
mean failure.

Success requires `execution_result === "SUCCESS"`; a decided transaction with
no receipt yet is pending, not done. Acceptance is **not** terminal — the watch
continues to `FINALIZED`, because authoritative reads use the finalized
variant and stopping early left the board on pre-transaction state. Submitted
hashes are written to local storage so a reload reconciles them.

## Repository isolation

All Reality Bridge code and configuration stays under `apps/reality-bridge`. It
shares no package, lockfile or deployment configuration with any other
application in this repository.
