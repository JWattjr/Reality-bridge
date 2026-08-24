# ProofPlay GenLayer MVP

## Goal

ProofPlay settles a football prediction duel, rather than a pooled prediction
market. Two players submit full six-pick tickets for the same fixture. The
Base Sepolia contract compares their independently settled picks after
GenLayer verifies the real-world match facts.

This is a testnet prototype. Base Sepolia USDC and all other testnet assets
have no financial value.

## Responsibility boundary

- **Frontend owns:** Privy login, Base Sepolia wallet switching, ticket
  construction, direct-invite links, and non-authoritative previews.
- **Base Sepolia contract owns:** ticket lock at kickoff, one entry escrowed
  from each player, fixed probability weights, deterministic score comparison,
  payouts, and timeout refunds.
- **GenLayer contract owns:** the minimum non-deterministic decision: read the
  configured public result source and persist the final score, first scoring
  side, aggregate corners, and aggregate cards.
- **External source owns:** raw football facts. It is evidence, not trusted
  state; validators independently fetch and compare it.
- **Bridge owns:** asynchronous delivery only. It cannot select the winner,
  alter a ticket, or choose a score.

## Duel model

The Base contract stores one choice in each of these markets:

| Market | Outcomes |
| --- | --- |
| Match winner | Home, draw, away |
| First team to score | Home, away, no goals |
| Total goals | Over or under configured line |
| Total corners | Over or under configured line |
| Total cards | Over or under configured line |
| Both teams to score | Yes or no |

The two tickets are not opposite positions. They may agree on any or all
markets. Each pick resolves independently, then Base compares total weighted
points.

The probability schedule is set and validated at duel creation. Each outcome
is normalized within its own market to 10,000 basis points. A correct pick gets
1,000,000 divided by its implied probability in basis points. The fixed
tie-break sequence is:

1. Highest weighted score
2. Most correct picks
3. Highest-value single correct pick
4. Earlier submitted ticket
5. Draw; each player claims their own entry

## Cross-chain flow

1. The creator writes fixture metadata, a nonzero fixture commitment, complete
   probability schedule, and one ticket to Base. They either name a direct
   opponent or leave the invitation open.
2. A matching opponent submits their own complete ticket before kickoff. Base
   escrows exactly one test-USDC entry from each player.
3. The same duel ID and fixture commitment are registered in the GenLayer
   resolver with an HTTPS source that exposes final score and aggregate match
   stats.
4. After kickoff, a Base resolution request sends ABI words containing the duel
   ID and fixture commitment through the configured beta bridge.
5. GenLayer validators independently render the source and agree on home
   goals, away goals, first scoring side, total corners, and total cards.
6. The resolver sends those five facts plus duel ID and fixture commitment back
   to Base. Base accepts only its configured bridge receiver, source chain,
   and resolver address.
7. Base derives all six actual outcomes and scores both tickets. The winning
   player claims the two-entry pot. A draw or bridge failure uses individual
   refunds.

## Network choices

| Responsibility | Network | Asset |
| --- | --- | --- |
| Escrow and payouts | Base Sepolia, chain 84532 | Circle test USDC |
| Intelligent resolution | GenLayer hosted Studionet | Hosted development environment |
| Cross-chain transport | GenLayer bridge beta | Operated relay |

Bradbury and Base mainnet are intentionally outside this MVP.

## Resolver consensus design

The leader renders the registered public result page and asks an LLM to return
strict JSON. The response can be final only when it provides every fact:

~~~json
{
  "status": "FINAL",
  "home_goals": 2,
  "away_goals": 1,
  "first_team_to_score": "HOME",
  "total_corners": 12,
  "total_cards": 4
}
~~~

Validators rerun the same web and LLM task and compare every stored decision
field. Free-form reasoning is neither stored nor compared. An unfinished
fixture, malformed facts, inconsistent first scorer, unavailable source, or
unverifiable output leaves the match unresolved.

## Safety gates

- No real-value asset and no mainnet deployment.
- Pinned GenVM runner in the resolver source.
- Base verifies the caller, source chain, resolver, duel ID, and fixture
  commitment before it accepts a bridge result.
- Identical result callbacks are harmless; conflicting callbacks revert.
- A resolution retry never extends the original refund deadline.
- A pre-kickoff unmatched duel can be cancelled, while a post-kickoff unmatched
  entry can be refunded permissionlessly.
- An unavailable bridge can only open individual refunds; it cannot create a
  winner.
