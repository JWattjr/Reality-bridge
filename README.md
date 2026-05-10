# ProofPlay

Proof-backed event participation with real 0G Storage uploads.

Live app: `https://proofplayed.vercel.app`

Live proof ledger: `https://proofplayed.vercel.app/proofs`

Hackathon verification page: `https://proofplayed.vercel.app/0g-proof`

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
6. Streams uploaded media back from 0G through `/api/proofs/{proofId}/media`.
7. Can generate a portable Proof Agent reputation summary and upload that JSON back to 0G Storage through `/api/reputation/summary`.

### Live proof receipt

This repo has produced real 0G Storage receipts for BlockNova mission proofs:

- 0G mainnet contract: `0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526`
- Latest photo proof JSON root: `0x476fac3e60519bb80e6bd87b4d7278e11ad7fa3bbd38ddaec7154d7af32ff9dc`
- Latest photo media root: `0xbcd7b8b5e1d7e563e7e4019f4d4c74ef7a70ffffe9173acad444cf9d96134177`
- Proof JSON explorer: `https://chainscan.0g.ai/tx/0x1925f2efa5e384bc227460803f99b16eb405055c6dddbfa3446f67923ee1627f`
- Media explorer: `https://chainscan.0g.ai/tx/0x54f6c37cbd1aa6a62539a8312cc1127003071782fa6fa874dc1ef9ac7aa29454`
- Browser media retrieval: `https://proofplayed.vercel.app/api/proofs/proof_m5_66ad2f6e66ad/media`
- Supabase index: `/api/proofs` returns `database.provider = "supabase"` with the stored proof receipt.

## Hackathon Reviewer Flow

1. Open `https://proofplayed.vercel.app`.
2. Sign in with Privy.
3. Register for BlockNova Event from `/app`.
4. Complete a QR or photo mission.
5. Open `/proofs` to inspect proof root hashes, transaction links, and uploaded media.
6. Open `/0g-proof` for the judge-facing 0G integration summary.
7. Click `Generate 0G reputation summary` to upload a portable Proof Agent summary JSON to 0G Storage.

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
