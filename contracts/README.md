# ProofPlay contracts

The current MVP contract is [ProofPlayBaseMarket.sol](src/ProofPlayBaseMarket.sol).

It holds the PvP pari-mutuel market on Base Sepolia:

- Escrows official Base Sepolia test USDC.
- Allows one `HOME`, `DRAW`, or `AWAY` position per player/market.
- Requests resolution from a configured GenLayer resolver through the official
  beta bridge interface.
- Binds the Base market and registered GenLayer fixture with one 256-bit
  commitment carried in every request.
- Accepts results only from the configured bridge receiver, source chain, and
  resolver.
- Allows any caller to retry a premature or failed resolution request without
  extending the original timeout-refund deadline.
- Lets winners claim their own pro-rata payout without looping through users.
- Opens individual refunds when no one picked the final outcome, the market is
  cancelled, or the bridge times out.

`FootballPredictionGame.sol` and `TestUSDT.sol` are legacy X Layer demo
contracts and are retained only as historical references.

Compile the MVP contract with:

```bash
node scripts/compile.mjs
```

Deploy it to Base Sepolia with Foundry (the bridge is intentionally not
configured by this script):

```powershell
$env:BASE_SEPOLIA_RPC_URL = "https://sepolia.base.org"
$env:PRIVATE_KEY = "0x..."
# Optional; defaults to 172800 seconds (2 days), allowed range is 1 hour–30 days.
$env:PROOFPLAY_RESOLUTION_TIMEOUT_SECONDS = "172800"
forge script script/Deploy.s.sol:Deploy --rpc-url $env:BASE_SEPOLIA_RPC_URL --broadcast
```

The deploy script is locked to Base Sepolia (`84532`) and uses Circle's
canonical test-USDC address (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`).
After deployment, call `configureBridge` only with the verified official beta
bridge sender/receiver and deployed GenLayer resolver addresses.

When creating a market, pass a nonzero `fixtureCommitment` (`bytes32`) and
register the identical numeric 256-bit value as `fixture_commitment` in the
GenLayer resolver. The bridge carries both fields; a mismatch fails before a
result is evaluated.
