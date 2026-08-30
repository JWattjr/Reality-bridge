# Known limitations

Honest list of what Reality Bridge does not do, and where the evidence stops.

## Product scope

- **StudioNet only.** Chain id `61999`. Other environments and real-value play
  are out of scope. Every asset is a test asset with no value.
- **Curated publisher.** Players cannot create rounds. Permissionless authoring
  needs creator bonds, source allowlists, duplicate detection and dispute
  handling, none of which exist here.
- **Hard caps.** One to three panels, two to eight players, one seat per
  address. These keep the state machine auditable.
- **Not Sybil-resistant.** Join order is the risk curve, so an operator with
  several addresses can buy the early seats and the discovery credits with them.
  Acceptable for a test-asset build; blocking for real value.

## Economics

- **Later seats can profit without running.** A survivor who never became the
  runner keeps a base weight of 1. The `×3` credit weight makes that
  unprofitable rather than impossible — with three seats and a full crossing a
  passive survivor recovers 25 of a 100 entry. This is the intended shape, not
  an oversight.
- **Terminal expiry refunds eliminated seats too.** An expired round has no
  complete result to pay out on, so every joined seat reclaims exactly its own
  entry. An eliminated player can never *profit* from expiry, but they do get
  their entry back. The alternative — paying an unfinished round out to
  survivors — was rejected as gameable and not conservation-exact.
- **No protocol fee.** `PROTOCOL_FEE_BPS = 0`. There is no fee accrual account
  and no admin withdrawal path at all.

## Evidence and consensus

- **Consensus is agreement, not truth.** An honest validator majority that reads
  a page the same wrong way writes a wrong outcome.
- **Extraction fields are model-derived.** `event_id` and `effective_date` are
  normalised hard (uppercase, fixed alphabet, 48 characters, day granularity),
  but a page with an ambiguous identifier can still make validators disagree.
  The failure mode is a retryable non-write, never a wrong write.
- **Corroboration is best-effort.** A corroborating source can only downgrade a
  `FINAL` primary to `VOID`. An unavailable corroborating source is ignored
  rather than blocking the primary.
- **Source revocation is forward-only.** Revoking a host never rewrites a panel
  that already froze it, because opened rounds are immutable.
- **No appeal flow.** The contract does not expose GenLayer's appeal mechanism.
  A disputed outcome stands, and the only recourse is the terminal deadline.

## Interface

- **Read-only without a wallet.** Anyone can watch a round; signing needs an
  injected EVM wallet on StudioNet.
- **Local history only.** Transaction history and recovery bundles live in the
  browser. Clearing site data loses the history; the exported bundle is the
  durable artifact and the interface says so before every commit.
- **No reminders or notifications.** The app shows countdowns for every deadline
  but deliberately adds no centralised keeper, scheduler or push service. Every
  overdue action is permissionless, so anyone — including you, later — can
  recover the round.
- **No indexer.** Round lists come from contract views, which is fine at these
  caps and would need an indexer beyond them.

## Testing and tooling

- **Reentrancy is asserted, not exercised.** `claim`/`refund` write state before
  transferring, and the duplicate-collection guard is tested. GenLayer direct
  mode does not execute an external recipient, so a genuinely hostile recipient
  contract cannot be run here.
- **Windows harness shim.** `genlayer-test`'s direct runner unlinks a temporary
  calldata file while its handle is open, which Windows rejects.
  `genlayer/tests/conftest.py` tolerates exactly that unlink; on Linux it is a
  no-op passthrough, so CI runs the identical suite.
- **`genvm-lint validate` needs `GENVMROOT`.** The published latest artifact
  bundle no longer ships the runner this contract pins, so validation needs the
  local SDK mirror from `genlayer/scripts/make_genvmroot.py`. The pin itself is
  deliberate and is not relaxed.

## Deployment

- **The publisher key still matters.** Round authoring is owner-only. The role
  can now be rotated (`transfer_ownership` then `accept_ownership` from the
  nominee), but only by the *current* owner — so losing the key with no
  rotation already in flight still means no further round can be published on
  that deployment. Redeploying is the recourse; it costs nothing on StudioNet
  but orphans any round already running.
- **Published rounds expire.** They carry real deadlines, so a demonstration
  round stops being joinable after its join window. Publish another with
  `--contract` rather than assuming the recorded round is still open.
- **No hosting workflow.** The repository has no authorised hosting pipeline for
  this application, so the build stops at a verified production bundle. The
  manifest carries a `frontendUrl` field for whoever hosts it.
- **The published round uses half-hour windows.** Not because StudioNet is slow
  — a scripted journey finishes in about four minutes — but because a human
  signing each step through a wallet popup needs the room.
- **IPv6 reachability affects StudioNet clients.** Where AAAA records are
  advertised but unroutable, Python's sequential connect adds about 43 seconds
  to *every* RPC call and a hosted run looks hung.
  `genlayer/scripts/netprefs.py` orders IPv4 first without removing IPv6; it is
  wired into the test conftest and the deploy script.
