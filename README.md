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
4. Stores the returned root hash, transaction hash, contract address, and explorer URL in Supabase.
5. Exposes those receipts through `/api/proofs` and the organizer proof panel.

### Live proof receipt

This repo has produced a real 0G Storage receipt for the `Chainlink Booth NFC` mission:

- 0G mainnet contract: `0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526`
- 0G root hash: `0x6f23996f4cc22bd72cced9d867ba33bce188a3c82d1ba2f7274e2670128edf91`
- 0G transaction hash: `0xe72a331780628efba258340db64077b8d11d43308e161d6f86cd4d458038b395`
- 0G explorer: `https://chainscan.0g.ai/tx/0xe72a331780628efba258340db64077b8d11d43308e161d6f86cd4d458038b395`
- Supabase index: `/api/proofs` returns `database.provider = "supabase"` with the stored proof receipt.

## Supabase Proof Index

0G Storage remains the permanent evidence layer. Supabase stores the fast app index used by the UI:

- proof record id
- user id / wallet id
- event id
- mission id
- XP earned
- 0G root hash
- 0G transaction hash
- explorer URL

Create the table by running:

```sql
-- supabase/schema.sql
```

## Environment

Copy `.env.example` to `.env.local` and set:

```bash
ZERO_G_PRIVATE_KEY=0x...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
NEXT_PUBLIC_PRIVY_CLIENT_ID=your-optional-privy-client-id
```

The private key must be funded on 0G mainnet for gas/storage fees. Without it, the API returns `503 not_configured` instead of generating fake proof data. Without Supabase env vars, local development uses an in-memory proof index; production should use Supabase.

Privy is used for wallet/email/social login. Mission submissions from the app use the authenticated wallet address when available, then fall back to the Privy user id.

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
