# Consensus Noir reproduction record

The repository contains a StudioNet-only MVP. There is no deployed address or
transaction hash yet; [`deployment/studionet.json`](../deployment/studionet.json)
is the explicit not-deployed record. Do not point the UI at an address until the
contract has been deployed to StudioNet (chain `61999`) and the hashes have been
recorded.

## Contract checks

From `apps/consensus-noir` (PowerShell):

```powershell
genvm-lint check contracts/consensus_noir.py --json
python -m pytest tests/direct -v
```

The first command must report the pinned runner in the source and a successful
semantic validation. On Windows, run it as
`$env:PYTHONIOENCODING = "utf-8"; genvm-lint check contracts/consensus_noir.py --json`
-- the default console codepage cannot encode the linter's check mark, and the
JSON form avoids that entirely. The direct suite exercises lifecycle, commitment/reveal,
custom leader/validator outcomes, deterministic payout remainder handling,
underfilled cancellation, refunds, malformed-output rotation, and retry-safe
UNRESOLVED handling.

## Hosted consensus check

Add two funded private keys to the local `studionet.accounts` list in
`gltest.config.yaml` (the file is intentionally inert in this repository), then
explicitly opt in:

```powershell
$env:CONSENSUS_NOIR_RUN_INTEGRATION = "1"
python -m pytest tests/integration/test_consensus_noir_studionet.py -m integration -v -s
```

The test deploys a fresh contract, creates and publishes a frozen dossier,
enters two accounts, reveals both commitments, advances the fixed windows, and
calls `resolve_case` with `consensus_max_rotations=5`. It requires a terminal
`FINAL` or `VOID` result from the real validators; no model or web response is
mocked. It prints `CONSENSUS_NOIR_STUDIONET_RESULT=...` with the address and
transaction hashes for the deployment record.

With the checked-in inert config, the test intentionally skips before any
network write. In a restricted environment it also reports a skip when the
StudioNet RPC is unreachable; this workspace has no permitted hosted egress.

## Frontend

```powershell
cd frontend
npm install
npm run lint
npm run typecheck
npm run build
npm run dev -- --port 3000
```

Without `NEXT_PUBLIC_CONSENSUS_NOIR_CONTRACT`, the app deliberately renders a
read-only preview dossier. To connect the real app, copy `.env.example` to
`.env.local`, set the deployed StudioNet contract address (and optionally the
RPC endpoint), then reload. Wallet writes are browser-signed through GenLayerJS;
the browser never supplies a culprit or payout result.

## Limitations

- Curator creation is an owner-only one-call payload; there is no editing path
  after publication.
- Source URLs are optional and only re-rendered as untrusted supporting text;
  temporary model/source failures remain `UNRESOLVED` and never extend a
  deadline or settle funds.
- The UI keeps the reveal salt in local browser storage and offers a download
  backup. Clearing storage or losing the backup makes a valid reveal impossible.
- Native GEN accounting is testnet-only in this MVP. There is no protocol fee,
  mainnet deployment, indexer, or real-value guarantee.
