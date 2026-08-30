import { describe, expect, it } from "vitest";

import { deriveState } from "@/lib/derive";
import { actionById } from "@/lib/derive";
import {
  SCENARIOS,
  SIMULATION_ACCOUNT,
  SIMULATION_CONFIG,
  createSimulation,
  simulateClaim,
  simulateCommit,
  simulateForfeit,
  simulateLapse,
  simulateRefund,
  simulateResolve,
  simulateReveal,
  simulationClock,
  type SimulationState,
} from "@/lib/simulation";

/**
 * Every scenario must be completable immediately.
 *
 * Simulated panels sit far in the future, and action availability is
 * time-gated, so gating the simulation on the wall clock stalled the happy
 * path at "the evidence timestamp has not arrived". These tests drive each
 * scenario to a terminal state using only the simulation's own clock.
 */

const BASE = 1_800_000_000;

function derive(state: SimulationState) {
  return deriveState({
    round: state.round,
    tiles: state.tiles,
    players: state.players,
    config: SIMULATION_CONFIG,
    account: SIMULATION_ACCOUNT,
    networkOk: true,
    nowSeconds: simulationClock(state),
    txPending: false,
    hasRecoveryBundle: true,
    commitmentReady: true,
  });
}

/** Play the active panel to a resolution, retrying an UNRESOLVED attempt. */
function playPanel(state: SimulationState, choice: "YES" | "NO"): SimulationState {
  let next = simulateCommit(state, choice, "0".repeat(64));
  next = simulateReveal(next, choice);

  // Resolution must be unlocked purely by the simulation's own clock.
  expect(actionById(derive(next), "resolve_tile").enabled).toBe(true);

  const before = next.round.current_tile_index;
  next = simulateResolve(next);
  if (
    next.round.status === "ACTIVE" &&
    next.round.current_tile_index === before &&
    next.tiles[before].status === "PENDING"
  ) {
    // The scripted first attempt reported UNRESOLVED; retrying costs nothing.
    next = simulateResolve(next);
  }
  return next;
}

function playToTerminal(scenarioId: SimulationState["scenarioId"]): SimulationState {
  let state = createSimulation(scenarioId, BASE);
  for (let guard = 0; guard < 8 && state.round.status === "ACTIVE"; guard += 1) {
    state = playPanel(state, "YES");
  }
  return state;
}

describe("simulation completes without waiting on the wall clock", () => {
  it("unlocks commit immediately on entry", () => {
    const state = createSimulation("clean-crossing", BASE);
    const actions = derive(state);
    expect(actionById(actions, "commit_choice").enabled).toBe(true);
    // The scripted clock, not the real one, is what makes this reachable.
    expect(simulationClock(state)).toBeLessThan(state.tiles[0].choice_deadline);
  });

  it("unlocks resolution as soon as the choice is revealed", () => {
    let state = createSimulation("clean-crossing", BASE);
    expect(actionById(derive(state), "resolve_tile").enabled).toBe(false);

    state = simulateCommit(state, "YES", "0".repeat(64));
    state = simulateReveal(state, "YES");

    expect(simulationClock(state)).toBe(state.tiles[0].resolution_time);
    expect(actionById(derive(state), "resolve_tile").enabled).toBe(true);
  });

  it.each(SCENARIOS.filter((s) => s.id !== "missed-reveal").map((s) => s.id))(
    "drives %s to a terminal state",
    (scenarioId) => {
      const state = playToTerminal(scenarioId);
      expect(["SETTLED", "REFUNDABLE"]).toContain(state.round.status);
    },
  );

  it("reaches the forfeit path through a deliberate lapse", () => {
    let state = createSimulation("missed-reveal", BASE);
    state = simulateCommit(state, "YES", "0".repeat(64));

    // Before lapsing, forfeiting is not offered.
    expect(actionById(derive(state), "forfeit_missed_reveal").enabled).toBe(false);

    state = simulateLapse(state);
    expect(actionById(derive(state), "forfeit_missed_reveal").enabled).toBe(true);
    expect(state.journal.join(" ")).toMatch(/let the reveal window lapse/i);

    const firstRunner = state.round.active_player_index;
    state = simulateForfeit(state);
    expect(state.players[firstRunner].status).toBe("ELIMINATED");
    expect(state.round.active_player_index).toBeGreaterThan(firstRunner);
    // The lapse is cleared so the replacement seat gets a clean window.
    expect(state.lapsed).toBe(false);
    expect(state.round.attempt_deadline).toBe(state.tiles[0].choice_deadline);

    // The seat that took over is a different simulated account, so the viewer
    // correctly stops being the runner and is told why.
    const afterForfeit = actionById(derive(state), "commit_choice");
    expect(afterForfeit.enabled).toBe(false);
    expect(afterForfeit.blockedReason).toMatch(/only the active runner/i);
    // The panel itself is untouched: a forfeit hands it on, it does not void it.
    expect(state.tiles[0].status).toBe("PENDING");
  });
});

describe("simulation outcomes are fixed in advance", () => {
  it("resolves against the player when the script says so", () => {
    // Panel 1 of "wrong-answer" is scripted NO. Choosing NO would be correct,
    // so choose YES and confirm the script does not bend to the choice.
    let state = createSimulation("wrong-answer", BASE);
    state = playPanel(state, "YES");
    expect(state.tiles[0].outcome).toBe("NO");
    expect(state.players[0].status).toBe("ELIMINATED");
  });

  it("keeps a VOID panel free of eliminations and credits", () => {
    let state = createSimulation("void-panel", BASE);
    state = playPanel(state, "YES");
    expect(state.tiles[0].outcome).toBe("VOID");
    expect(state.tiles[0].reason_code).toBe("VOID_CONTRADICTION");
    expect(state.players[0].status).toBe("ACTIVE");
    expect(state.players[0].discovery_credits).toBe(0);
  });

  it("retries an unresolved panel without moving any deadline", () => {
    let state = createSimulation("unresolved-retry", BASE);
    const deadlinesBefore = state.tiles.map((tile) => [
      tile.choice_deadline,
      tile.resolution_time,
    ]);

    state = simulateCommit(state, "YES", "0".repeat(64));
    state = simulateReveal(state, "YES");
    state = simulateResolve(state);

    expect(state.tiles[0].status).toBe("PENDING");
    expect(state.journal.join(" ")).toMatch(/UNRESOLVED/);
    expect(
      state.tiles.map((tile) => [tile.choice_deadline, tile.resolution_time]),
    ).toEqual(deadlinesBefore);

    state = simulateResolve(state);
    expect(state.tiles[0].status).toBe("RESOLVED");
  });

  it("settles a clean crossing with weighted claims that sum to the pool", () => {
    const state = playToTerminal("clean-crossing");
    expect(state.round.status).toBe("SETTLED");

    const total = state.players.reduce(
      (sum, player) => sum + BigInt(player.claim_amount),
      BigInt(0),
    );
    expect(total).toBe(BigInt(state.round.pool));

    const collected = simulateClaim(state);
    expect(collected.players[0].claimed).toBe(true);
    // Collecting twice must not double-pay.
    expect(simulateClaim(collected).round.claimed_amount).toBe(
      collected.round.claimed_amount,
    );
  });

  it("refunds every seat when the terminal scenario unwinds", () => {
    const state = playToTerminal("terminal-refund");
    expect(state.round.status).toBe("REFUNDABLE");
    for (const player of state.players) {
      expect(player.refund_amount).toBe(state.round.entry_amount);
    }

    const refunded = simulateRefund(state);
    expect(refunded.players[0].refunded).toBe(true);
    expect(simulateRefund(refunded).round.refunded_amount).toBe(
      refunded.round.refunded_amount,
    );
  });
});
