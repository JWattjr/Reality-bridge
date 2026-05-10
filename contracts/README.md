# ProofRegistry Deployment

`ProofRegistry.sol` is the ProofPlay-owned contract for MVP proof anchoring.

Deploy it to 0G mainnet with:

- RPC: `https://evmrpc.0g.ai`
- Chain ID: `16661`
- Native gas token: `0G`

0G mainnet deployment:

```text
Contract: 0xbEE85061D8CAd149006977d7943cBf6063A57cb0
Transaction: 0xea7addff68dca0d2f8f89776cd7a5d3d83c7641dbd74e32e4c6286f6515db629
Explorer: https://chainscan.0g.ai/address/0xbEE85061D8CAd149006977d7943cBf6063A57cb0
```

Add the contract address to:

```bash
NEXT_PUBLIC_PROOF_REGISTRY_ADDRESS=0xbEE85061D8CAd149006977d7943cBf6063A57cb0
```

Then redeploy the app. Mission completion will:

1. prepare a canonical proof payload,
2. upload proof JSON/media to 0G Storage from the user's Privy wallet,
3. call `anchorProof` from the same Privy wallet,
4. save both 0G Storage receipts and the ProofRegistry transaction in Supabase.
