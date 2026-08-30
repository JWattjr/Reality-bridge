/**
 * GenLayer transaction lifecycle.
 *
 * A write returning a hash means the transaction was *submitted*, nothing
 * more. GenLayer can still leave it undetermined, time the leader out, or
 * accept a transaction whose contract execution reverted. This module turns a
 * raw StudioNet transaction record into an honest phase so the UI never
 * claims a success the chain did not report.
 */

export type TxPhase =
  | "idle"
  | "awaiting-signature"
  | "submitted"
  | "pending"
  | "proposing"
  | "committing"
  | "revealing"
  | "accepted"
  | "finalized"
  | "failed"
  | "rejected"
  | "timed-out";

/** Numeric status codes as emitted by the consensus contract. */
const STATUS_BY_NUMBER: Record<string, string> = {
  "0": "UNINITIALIZED",
  "1": "PENDING",
  "2": "PROPOSING",
  "3": "COMMITTING",
  "4": "REVEALING",
  "5": "ACCEPTED",
  "6": "UNDETERMINED",
  "7": "FINALIZED",
  "8": "CANCELED",
  "9": "APPEAL_REVEALING",
  "10": "APPEAL_COMMITTING",
  "11": "READY_TO_FINALIZE",
  "12": "VALIDATORS_TIMEOUT",
  "13": "LEADER_TIMEOUT",
};

const IN_FLIGHT: Record<string, TxPhase> = {
  UNINITIALIZED: "submitted",
  PENDING: "pending",
  ACTIVATED: "pending",
  PROPOSING: "proposing",
  COMMITTING: "committing",
  REVEALING: "revealing",
  APPEAL_COMMITTING: "committing",
  APPEAL_REVEALING: "revealing",
  READY_TO_FINALIZE: "accepted",
};

const CONSENSUS_FAILURES = new Set([
  "UNDETERMINED",
  "CANCELED",
  "VALIDATORS_TIMEOUT",
  "LEADER_TIMEOUT",
]);

/**
 * Phases that end a watch.
 *
 * `accepted` is deliberately **not** terminal. Authoritative reads use the
 * finalized transaction variant, so stopping at acceptance leaves the UI
 * reading pre-transaction state until something else happens to refresh it.
 */
export const TERMINAL_PHASES: ReadonlySet<TxPhase> = new Set<TxPhase>([
  "finalized",
  "failed",
  "rejected",
  "timed-out",
]);

export interface TxClassification {
  phase: TxPhase;
  /** Raw consensus status name, when the node reported one. */
  statusName: string | null;
  /** Leader execution result: SUCCESS, ERROR, ROLLBACK, … */
  executionResult: string | null;
  /** Contract revert text or consensus failure explanation. */
  message: string | null;
}

export const PHASE_LABEL: Record<TxPhase, string> = {
  idle: "Not started",
  "awaiting-signature": "Awaiting wallet signature",
  submitted: "Submitted to StudioNet",
  pending: "Pending consensus",
  proposing: "Leader proposing",
  committing: "Validators committing",
  revealing: "Validators revealing",
  accepted: "Accepted by consensus",
  finalized: "Finalized",
  failed: "Failed on chain",
  rejected: "Rejected in wallet",
  "timed-out": "Timed out waiting for consensus",
};

export const PHASE_TONE: Record<TxPhase, "idle" | "busy" | "good" | "bad"> = {
  idle: "idle",
  "awaiting-signature": "busy",
  submitted: "busy",
  pending: "busy",
  proposing: "busy",
  committing: "busy",
  revealing: "busy",
  accepted: "good",
  finalized: "good",
  failed: "bad",
  rejected: "bad",
  "timed-out": "bad",
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export function statusName(transaction: unknown): string | null {
  const raw = record(transaction);
  const named = raw.statusName;
  if (typeof named === "string" && named.length > 0) return named.toUpperCase();
  const status = raw.status;
  if (typeof status === "string" && status.length > 0) {
    return STATUS_BY_NUMBER[status] ?? status.toUpperCase();
  }
  if (typeof status === "number") {
    return STATUS_BY_NUMBER[String(status)] ?? null;
  }
  return null;
}

/** Pull the first leader receipt, tolerating both array and object shapes. */
function leaderReceipt(transaction: unknown): Record<string, unknown> {
  const consensus = record(record(transaction).consensus_data);
  const receipt = consensus.leader_receipt;
  if (Array.isArray(receipt) && receipt.length > 0) return record(receipt[0]);
  if (receipt && typeof receipt === "object") return record(receipt);
  return {};
}

function readableError(receipt: Record<string, unknown>): string | null {
  const direct = receipt.error;
  if (typeof direct === "string" && direct.trim().length > 0) return direct.trim();

  const genvm = record(receipt.genvm_result);
  for (const key of ["stderr", "stdout", "message"]) {
    const value = genvm[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }

  const result = receipt.result;
  if (typeof result === "string" && result.trim().length > 0) return result.trim();
  const resultRecord = record(result);
  for (const key of ["message", "error", "readable"]) {
    const value = resultRecord[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

/**
 * Strip the contract's error class prefix so players read a plain sentence.
 * `[EXPECTED] Join deadline has passed` becomes `Join deadline has passed`.
 */
export function humaniseContractError(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(
    /\[(EXPECTED|TRANSIENT|LLM_ERROR|EXTERNAL)\]\s*([^"'\n]+)/,
  );
  if (match) return match[2].trim();
  return trimmed.split("\n")[0].slice(0, 240);
}

/**
 * Decide what a StudioNet transaction record actually means.
 *
 * A decided state is not enough: a transaction can be ACCEPTED while its
 * contract execution reverted, so the leader receipt is always inspected.
 */
export function classifyTransaction(transaction: unknown): TxClassification {
  const name = statusName(transaction);
  const receipt = leaderReceipt(transaction);
  const executionRaw = receipt.execution_result;
  const executionResult =
    typeof executionRaw === "string" ? executionRaw.toUpperCase() : null;

  if (!name) {
    return {
      phase: "pending",
      statusName: null,
      executionResult,
      message: null,
    };
  }

  if (CONSENSUS_FAILURES.has(name)) {
    return {
      phase: "failed",
      statusName: name,
      executionResult,
      message:
        name === "UNDETERMINED"
          ? "Validators did not reach a majority. Nothing was written; you can retry."
          : `Consensus ended in ${name.toLowerCase().replace(/_/g, " ")}.`,
    };
  }

  if (name === "ACCEPTED" || name === "FINALIZED") {
    if (executionResult && executionResult !== "SUCCESS") {
      const raw = readableError(receipt);
      return {
        phase: "failed",
        statusName: name,
        executionResult,
        message: raw
          ? humaniseContractError(raw)
          : "The contract rejected this action.",
      };
    }
    if (executionResult !== "SUCCESS") {
      // Decided, but the leader receipt has not arrived. Absence of evidence
      // is not evidence of success, so this stays pending rather than being
      // reported as a completed action.
      return {
        phase: "pending",
        statusName: name,
        executionResult,
        message: "Decided by consensus; waiting for the execution receipt.",
      };
    }
    return {
      phase: name === "FINALIZED" ? "finalized" : "accepted",
      statusName: name,
      executionResult,
      message: null,
    };
  }

  return {
    phase: IN_FLIGHT[name] ?? "pending",
    statusName: name,
    executionResult,
    message: null,
  };
}

export interface TxState {
  phase: TxPhase;
  /** Which contract action this transaction belongs to. */
  action: string;
  hash: string | null;
  statusName: string | null;
  message: string | null;
  startedAt: number;
  updatedAt: number;
}

export function initialTxState(action: string): TxState {
  const now = Date.now();
  return {
    phase: "awaiting-signature",
    action,
    hash: null,
    statusName: null,
    message: null,
    startedAt: now,
    updatedAt: now,
  };
}

export function isSettled(state: TxState | null): boolean {
  return state === null || TERMINAL_PHASES.has(state.phase);
}

export function isBusy(state: TxState | null): boolean {
  return state !== null && !TERMINAL_PHASES.has(state.phase);
}

export function isSuccess(state: TxState | null): boolean {
  return state !== null && (state.phase === "accepted" || state.phase === "finalized");
}

/** True when the wallet popup was dismissed rather than the chain failing. */
export function isUserRejection(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  if (code === 4001 || code === "ACTION_REJECTED") return true;
  const message = (error as { message?: unknown }).message;
  return (
    typeof message === "string" &&
    /user rejected|user denied|request rejected/i.test(message)
  );
}
