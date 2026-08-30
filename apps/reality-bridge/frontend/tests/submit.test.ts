import { beforeEach, describe, expect, it, vi } from "vitest";

import { ALICE } from "./fixtures";

/**
 * The write path itself: nothing may be signed from the wrong chain, and a
 * returned hash is only reported as success once StudioNet says the leader
 * executed it successfully.
 */

const sdk = vi.hoisted(() => ({
  writeContract: vi.fn(),
  getTransaction: vi.fn(),
}));

vi.mock("genlayer-js", () => ({
  createClient: () => ({
    writeContract: sdk.writeContract,
    getTransaction: sdk.getTransaction,
  }),
}));

vi.mock("genlayer-js/chains", () => ({
  studionet: {
    id: 61999,
    name: "Genlayer Studio Network",
    rpcUrls: { default: { http: ["https://studio.genlayer.com/api"] } },
    nativeCurrency: { name: "GEN Token", symbol: "GEN", decimals: 18 },
    blockExplorers: { default: { name: "GenLayer Explorer", url: "https://explorer.invalid" } },
    defaultConsensusMaxRotations: 3,
  },
}));

const STUDIONET = "0xf22f";

function installWallet(chainIdHex: string) {
  Object.defineProperty(window, "ethereum", {
    configurable: true,
    writable: true,
    value: {
      request: vi.fn(async ({ method }: { method: string }) =>
        method === "eth_chainId" ? chainIdHex : null,
      ),
    },
  });
}

async function loadContractModule() {
  vi.stubEnv(
    "NEXT_PUBLIC_REALITY_BRIDGE_CONTRACT",
    "0x1111111111111111111111111111111111111111",
  );
  vi.resetModules();
  return import("@/lib/contract");
}

beforeEach(() => {
  sdk.writeContract.mockReset();
  sdk.getTransaction.mockReset();
  Reflect.deleteProperty(window, "ethereum");
  vi.unstubAllEnvs();
});

describe("submitWrite", () => {
  it("refuses to sign when the wallet is on another chain", async () => {
    installWallet("0x1");
    const { submitWrite } = await loadContractModule();

    const state = await submitWrite({ action: "join_round", account: ALICE });

    expect(state.phase).toBe("failed");
    expect(state.message).toMatch(/chain 1/);
    expect(state.message).toMatch(/GenLayer StudioNet/);
    expect(sdk.writeContract).not.toHaveBeenCalled();
  });

  it("refuses to sign with no injected wallet at all", async () => {
    const { submitWrite } = await loadContractModule();

    const state = await submitWrite({ action: "claim", account: ALICE });

    expect(state.phase).toBe("failed");
    expect(state.message).toMatch(/No injected wallet/i);
    expect(sdk.writeContract).not.toHaveBeenCalled();
  });

  it("reports a wallet dismissal as rejected, not failed", async () => {
    installWallet(STUDIONET);
    sdk.writeContract.mockRejectedValue({ code: 4001, message: "User rejected" });
    const { submitWrite } = await loadContractModule();

    const state = await submitWrite({ action: "commit_choice", account: ALICE });

    expect(state.phase).toBe("rejected");
    expect(state.message).toMatch(/dismissed the wallet request/i);
  });

  it("follows a submitted transaction all the way to finality", async () => {
    installWallet(STUDIONET);
    sdk.writeContract.mockResolvedValue("0xabc123");
    sdk.getTransaction
      .mockResolvedValueOnce({ status: 2 })
      .mockResolvedValueOnce({
        status: 5,
        consensus_data: { leader_receipt: [{ execution_result: "SUCCESS" }] },
      })
      .mockResolvedValue({
        status: 7,
        consensus_data: { leader_receipt: [{ execution_result: "SUCCESS" }] },
      });
    const { submitWrite } = await loadContractModule();

    const phases: string[] = [];
    const state = await submitWrite(
      { action: "reveal_choice", account: ALICE },
      { intervalMs: 1, onUpdate: (next) => phases.push(next.phase) },
    );

    // Acceptance is observed but is not the end: authoritative reads use the
    // finalized variant, so the watch continues until finality.
    expect(state.phase).toBe("finalized");
    expect(state.hash).toBe("0xabc123");
    expect(phases).toEqual([
      "awaiting-signature",
      "submitted",
      "proposing",
      "accepted",
      "finalized",
    ]);
  });

  it("reports acceptance honestly when finality outlasts the wait budget", async () => {
    installWallet(STUDIONET);
    sdk.writeContract.mockResolvedValue("0xslowfinal");
    sdk.getTransaction.mockResolvedValue({
      status: 5,
      consensus_data: { leader_receipt: [{ execution_result: "SUCCESS" }] },
    });
    const { submitWrite } = await loadContractModule();

    const state = await submitWrite(
      { action: "join_round", account: ALICE },
      { intervalMs: 1, timeoutMs: 5 },
    );

    // Accepted-but-not-yet-final is not a failure and must not be called one.
    expect(state.phase).toBe("accepted");
    expect(state.phase).not.toBe("timed-out");
    expect(state.message).toMatch(/finality was not observed/i);
  });

  it("does not treat a decided transaction without a receipt as done", async () => {
    installWallet(STUDIONET);
    sdk.writeContract.mockResolvedValue("0xnoreceipt");
    sdk.getTransaction.mockResolvedValue({ status: 5 });
    const { submitWrite } = await loadContractModule();

    const state = await submitWrite(
      { action: "claim", account: ALICE },
      { intervalMs: 1, timeoutMs: 5 },
    );

    expect(state.phase).toBe("timed-out");
    expect(state.phase).not.toBe("accepted");
  });

  it("reports an accepted transaction whose execution reverted as failed", async () => {
    installWallet(STUDIONET);
    sdk.writeContract.mockResolvedValue("0xdead");
    sdk.getTransaction.mockResolvedValue({
      status: 5,
      consensus_data: {
        leader_receipt: [
          {
            execution_result: "ERROR",
            error: "[EXPECTED] Only the active runner may commit",
          },
        ],
      },
    });
    const { submitWrite } = await loadContractModule();

    const state = await submitWrite(
      { action: "commit_choice", account: ALICE },
      { intervalMs: 1 },
    );

    expect(state.phase).toBe("failed");
    expect(state.message).toBe("Only the active runner may commit");
  });

  it("times out rather than waiting forever on an undecided transaction", async () => {
    installWallet(STUDIONET);
    sdk.writeContract.mockResolvedValue("0xslow");
    sdk.getTransaction.mockResolvedValue({ status: 1 });
    const { submitWrite } = await loadContractModule();

    const state = await submitWrite(
      { action: "resolve_tile", account: ALICE },
      { intervalMs: 1, timeoutMs: 5 },
    );

    expect(state.phase).toBe("timed-out");
    expect(state.message).toMatch(/reload to reconcile/i);
  });

  it("survives a transient RPC failure while polling", async () => {
    installWallet(STUDIONET);
    sdk.writeContract.mockResolvedValue("0xflaky");
    sdk.getTransaction
      .mockRejectedValueOnce(new Error("RPC unreachable"))
      .mockResolvedValue({
        status: 7,
        consensus_data: { leader_receipt: [{ execution_result: "SUCCESS" }] },
      });
    const { submitWrite } = await loadContractModule();

    const state = await submitWrite(
      { action: "claim", account: ALICE },
      { intervalMs: 1 },
    );

    expect(state.phase).toBe("finalized");
  });
});
