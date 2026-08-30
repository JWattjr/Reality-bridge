import type { ConfigView, PlayerView, RoundView } from "@/lib/contract";

/**
 * Display-only projections of the settlement rules.
 *
 * The contract is the only authority for real payouts; these helpers exist so
 * the interface can show an honest range *before* a signature. Every constant
 * used here comes from the contract's own `get_config` view, so the UI never
 * hard-codes a second copy of the economics.
 */

export function survivorWeight(credits: number, config: ConfigView): number {
  return config.base_weight + config.credit_weight * credits;
}

export interface PayoutProjection {
  /** Sum of survivor weights, given current state. */
  totalWeight: number;
  survivors: number;
  /** Pro-rata share of the pool for a survivor with these credits, in wei. */
  shareForCredits: (credits: number) => bigint;
}

export function projectSettlement(
  round: RoundView,
  players: PlayerView[],
  config: ConfigView,
): PayoutProjection {
  const survivors = players.filter((player) => player.status === "ACTIVE");
  const totalWeight = survivors.reduce(
    (sum, player) => sum + survivorWeight(player.discovery_credits, config),
    0,
  );
  const pool = safeBigInt(round.pool);
  return {
    totalWeight,
    survivors: survivors.length,
    shareForCredits(credits: number): bigint {
      if (totalWeight <= 0) return BigInt(0);
      return (
        (pool * BigInt(survivorWeight(credits, config))) / BigInt(totalWeight)
      );
    },
  };
}

function safeBigInt(value: string): bigint {
  try {
    return BigInt(value || "0");
  } catch {
    return BigInt(0);
  }
}

export interface EntryDisclosure {
  entryWei: bigint;
  /** Maximum loss is exactly the entry: the contract can never take more. */
  maximumLossWei: bigint;
  protocolFeeWei: bigint;
  protocolFeeBps: number;
  /** Pool if the round fills to the current player count plus this entry. */
  projectedPoolWei: bigint;
  /** Best case: sole survivor who opened every remaining panel. */
  bestCaseWei: bigint;
  /** Worst surviving case: a survivor with no discovery credits. */
  passiveSurvivorWei: bigint;
  expectedTransactions: string[];
}

/**
 * Everything a player must be shown before the join signature.
 *
 * Ranges are computed against the pool that would exist immediately after the
 * join, which is the smallest pool the player can end up sharing.
 */
export function describeEntry(
  round: RoundView,
  config: ConfigView,
): EntryDisclosure {
  const entry = safeBigInt(round.entry_amount);
  const seats = BigInt(Math.max(round.player_count + 1, config.min_players));
  const pool = entry * seats;
  const maxCredits = round.tile_count;

  const bestWeight = survivorWeight(maxCredits, config);
  const passiveWeight = survivorWeight(0, config);
  // Worst realistic split for an active runner: every other seat survives with
  // no credits while the runner holds every discovery credit.
  const contestedWeight = bestWeight + (Number(seats) - 1) * passiveWeight;
  const allPassiveWeight = Number(seats) * passiveWeight;

  return {
    entryWei: entry,
    maximumLossWei: entry,
    protocolFeeWei: BigInt(0),
    protocolFeeBps: config.protocol_fee_bps,
    projectedPoolWei: pool,
    bestCaseWei: pool,
    passiveSurvivorWei:
      allPassiveWeight > 0
        ? (pool * BigInt(passiveWeight)) / BigInt(contestedWeight)
        : BigInt(0),
    expectedTransactions: [
      "join_round — pays the exact entry into the contract",
      "commit_choice — seals your YES/NO as a hash (no value)",
      "reveal_choice — opens the same choice (no value)",
      "resolve_tile — asks validators to read the evidence (no value)",
      "claim or refund — withdraws your final amount (no value)",
    ],
  };
}

export function claimableAmount(player: PlayerView | null): bigint {
  if (!player) return BigInt(0);
  return safeBigInt(player.claim_amount);
}

export function refundableAmount(player: PlayerView | null): bigint {
  if (!player) return BigInt(0);
  return safeBigInt(player.refund_amount);
}
