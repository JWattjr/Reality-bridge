# ProofPlay

Proof-backed event participation with real 0G Storage uploads.

## 0G Integration Proof

The verification backend integrates the official 0G Storage TypeScript SDK:

- SDK: `@0gfoundation/0g-storage-ts-sdk`
- Mainnet chain ID: `16661`
- Mainnet RPC: `https://evmrpc.0g.ai`
- Storage indexer: `https://indexer-storage-turbo.0g.ai`
- Mainnet Flow contract: `0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526`
- Explorer links returned as `https://chainscan.0g.ai/tx/{txHash}`

When `/api/verification` receives a valid mission submission, it:

1. Validates the proof method for that mission.
2. Uploads the proof JSON to 0G Storage through `Indexer.upload`.
3. Uploads photo bytes to 0G Storage when the mission uses photo proof.
4. Stores the returned root hash, transaction hash, contract address, and explorer URL in `data/proof-records.json`.
5. Exposes those receipts through `/api/proofs` and the organizer proof panel.

## Environment

Copy `.env.example` to `.env.local` and set:

```bash
ZERO_G_PRIVATE_KEY=0x...
```

The private key must be funded on 0G mainnet for gas/storage fees. Without it, the API returns `503 not_configured` instead of generating fake proof data.

## Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm run build
```
