# ProofPlay Base contracts

The current MVP contract is [ProofPlayBaseDuel.sol](src/ProofPlayBaseDuel.sol).

It runs one football ticket duel at a time:

- Escrows one Base Sepolia test-USDC entry from the creator and challenger.
- Locks a six-pick ticket for each player before fixture kickoff.
- Supports wallet-restricted friend invitations and open matchmaking.
- Stores a normalized probability schedule and awards more points to correct
  lower-probability calls.
- Derives each of the six market results independently from GenLayer's raw
  fixture facts.
- Uses a deterministic tie-break chain and refunds both entries on an exact
  final draw.
- Verifies a configured bridge receiver, source chain, resolver, and fixture
  commitment before accepting a result.
- Lets users claim their own prize or refund without any unbounded loop.

Compile the contract:

~~~powershell
node scripts/compile.mjs
~~~

Run the Foundry test suite when Foundry is available:

~~~powershell
forge test
~~~

Deploy to Base Sepolia:

~~~powershell
$env:BASE_SEPOLIA_RPC_URL = "https://sepolia.base.org"
$env:PRIVATE_KEY = "0x..."
# Defaults to 172800 seconds (two days); allowed range is one hour to 30 days.
$env:PROOFPLAY_RESOLUTION_TIMEOUT_SECONDS = "172800"
forge script script/Deploy.s.sol:Deploy --rpc-url $env:BASE_SEPOLIA_RPC_URL --broadcast
~~~

The script is locked to Base Sepolia chain 84532 and uses Circle's canonical
test-USDC address: 0x036CbD53842c5426634e7929541eC2318f3dCF7e.

Configure the bridge only after independently verifying its official beta
sender and receiver addresses and deploying the matching GenLayer resolver.
For every duel, the Base fixture commitment must match the commitment
registered in the resolver. The callback result has seven ABI words:

1. Duel ID
2. Fixture commitment
3. Home goals
4. Away goals
5. First team to score: home, away, or no goals
6. Total corners
7. Total cards
