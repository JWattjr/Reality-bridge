# ProofPlay Contracts

`FootballPredictionGame.sol` is the new ProofPlay X Cup contract foundation.

It supports:

- admin-only `createGameEvent`
- admin-only `createMarket`
- USDT-backed `placePrediction`
- `closeMarket`
- admin `resolveMarket`
- exactly 1 point for each correct prediction
- 0 points for wrong predictions
- pari-mutuel `claimWinnings`
- `refundMarket` and user refund claims

`ProofRegistry.sol` is legacy proof-of-participation infrastructure. It should remain available during migration only, but it is no longer part of the main football prediction UX.
