import { describe, expect, it } from "vitest";

import {
  classifyTransaction,
  humaniseContractError,
  isBusy,
  isSuccess,
  isUserRejection,
  statusName,
  TERMINAL_PHASES,
} from "@/lib/tx";

function accepted(executionResult: string, extra: Record<string, unknown> = {}) {
  return {
    status: 5,
    consensus_data: {
      leader_receipt: [{ execution_result: executionResult, ...extra }],
    },
  };
}

describe("transaction classification", () => {
  it("reads a numeric status the same way as a named one", () => {
    expect(statusName({ status: 7 })).toBe("FINALIZED");
    expect(statusName({ status: "5" })).toBe("ACCEPTED");
    expect(statusName({ statusName: "proposing" })).toBe("PROPOSING");
    expect(statusName({})).toBeNull();
  });

  it("does not call a submitted transaction successful", () => {
    const result = classifyTransaction({ status: 1 });
    expect(result.phase).toBe("pending");
    expect(isSuccess({ ...base(), phase: result.phase })).toBe(false);
  });

  it("reports consensus progress without claiming acceptance", () => {
    expect(classifyTransaction({ status: 2 }).phase).toBe("proposing");
    expect(classifyTransaction({ status: 3 }).phase).toBe("committing");
    expect(classifyTransaction({ status: 4 }).phase).toBe("revealing");
  });

  it("treats an accepted transaction with a failed execution as a failure", () => {
    const result = classifyTransaction(
      accepted("ERROR", { error: '[EXPECTED] Join deadline has passed' }),
    );
    expect(result.phase).toBe("failed");
    expect(result.message).toBe("Join deadline has passed");
  });

  it("accepts only a successful leader execution", () => {
    expect(classifyTransaction(accepted("SUCCESS")).phase).toBe("accepted");
    expect(
      classifyTransaction({
        status: 7,
        consensus_data: { leader_receipt: [{ execution_result: "SUCCESS" }] },
      }).phase,
    ).toBe("finalized");
  });

  it("does not call a decided transaction successful without a receipt", () => {
    // Absence of evidence is not evidence of success.
    for (const status of [5, 7]) {
      const result = classifyTransaction({ status });
      expect(result.phase).toBe("pending");
      expect(result.message).toMatch(/waiting for the execution receipt/i);
    }
    expect(
      classifyTransaction({ status: 5, consensus_data: { leader_receipt: [] } })
        .phase,
    ).toBe("pending");
  });

  it("keeps watching after acceptance so finality can be observed", () => {
    // Authoritative reads use the finalized variant. Ending the watch at
    // acceptance would leave the board on pre-transaction state.
    expect(TERMINAL_PHASES.has("accepted")).toBe(false);
    expect(TERMINAL_PHASES.has("finalized")).toBe(true);
    expect(TERMINAL_PHASES.has("failed")).toBe(true);
    expect(TERMINAL_PHASES.has("rejected")).toBe(true);
    expect(TERMINAL_PHASES.has("timed-out")).toBe(true);

    expect(isBusy({ ...base(), phase: "accepted" })).toBe(true);
    expect(isBusy({ ...base(), phase: "finalized" })).toBe(false);
    expect(isSuccess({ ...base(), phase: "accepted" })).toBe(true);
    expect(isSuccess({ ...base(), phase: "finalized" })).toBe(true);
  });

  it("treats an undetermined round as a recoverable failure", () => {
    const result = classifyTransaction({ status: 6 });
    expect(result.phase).toBe("failed");
    expect(result.message).toMatch(/did not reach a majority/i);
  });

  it("treats leader and validator timeouts as failures", () => {
    expect(classifyTransaction({ status: 13 }).phase).toBe("failed");
    expect(classifyTransaction({ status: 12 }).phase).toBe("failed");
    expect(classifyTransaction({ status: 8 }).phase).toBe("failed");
  });

  it("falls back to pending when the node reports nothing usable", () => {
    expect(classifyTransaction(null).phase).toBe("pending");
    expect(classifyTransaction({ status: 99 }).phase).toBe("pending");
  });

  it("finds a revert message in the genvm result when there is no error field", () => {
    const result = classifyTransaction(
      accepted("ROLLBACK", {
        genvm_result: { stderr: "[EXPECTED] Only the active runner may commit" },
      }),
    );
    expect(result.phase).toBe("failed");
    expect(result.message).toBe("Only the active runner may commit");
  });
});

describe("error humanising", () => {
  it("strips the contract error class prefix", () => {
    expect(humaniseContractError("[EXPECTED] Exact entry amount required")).toBe(
      "Exact entry amount required",
    );
    expect(
      humaniseContractError("[TRANSIENT] Evidence is not ready or temporarily unavailable"),
    ).toBe("Evidence is not ready or temporarily unavailable");
  });

  it("leaves an unprefixed message alone", () => {
    expect(humaniseContractError("network unreachable")).toBe(
      "network unreachable",
    );
  });
});

describe("wallet rejection", () => {
  it("recognises the standard rejection code and message", () => {
    expect(isUserRejection({ code: 4001 })).toBe(true);
    expect(isUserRejection({ message: "User rejected the request." })).toBe(true);
    expect(isUserRejection(new Error("RPC unavailable"))).toBe(false);
  });
});

function base() {
  return {
    phase: "pending" as const,
    action: "join_round",
    hash: null,
    statusName: null,
    message: null,
    startedAt: 0,
    updatedAt: 0,
  };
}
