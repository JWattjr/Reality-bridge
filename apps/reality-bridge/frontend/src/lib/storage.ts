import type { RecoveryBundle } from "@/lib/recovery";
import type { TxState } from "@/lib/tx";

/**
 * Local durability only.
 *
 * Recovery bundles and pending transaction records stay in this browser. They
 * are a convenience layer on top of the exported bundle, never a substitute
 * for it, and nothing here is ever uploaded.
 */
const BUNDLE_KEY = "reality-bridge:bundles:v1";
const TX_KEY = "reality-bridge:pending-tx:v1";
const HISTORY_KEY = "reality-bridge:tx-history:v1";
const HISTORY_LIMIT = 40;

export interface PendingTransaction {
  hash: string;
  action: string;
  roundId: string;
  account: string;
  startedAt: number;
}

export interface HistoryEntry extends PendingTransaction {
  phase: TxState["phase"];
  statusName: string | null;
  message: string | null;
  settledAt: number;
}

function store(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const probe = window.localStorage;
    const key = "reality-bridge:probe";
    probe.setItem(key, "1");
    probe.removeItem(key);
    return probe;
  } catch {
    return null;
  }
}

function readJson<T>(key: string, fallback: T): T {
  const target = store();
  if (!target) return fallback;
  try {
    const raw = target.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return (parsed as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  const target = store();
  if (!target) return;
  try {
    target.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or private-mode failures must never break the game loop.
  }
}

export function bundleKey(params: {
  contract: string;
  roundId: string;
  tileIndex: number;
  account: string;
}): string {
  return [
    params.contract.toLowerCase(),
    String(params.roundId),
    String(params.tileIndex),
    params.account.toLowerCase(),
  ].join("|");
}

export function loadBundles(): Record<string, RecoveryBundle> {
  return readJson<Record<string, RecoveryBundle>>(BUNDLE_KEY, {});
}

export function saveBundle(bundle: RecoveryBundle): void {
  const all = loadBundles();
  all[bundleKey(bundle)] = bundle;
  writeJson(BUNDLE_KEY, all);
}

export function findBundle(params: {
  contract: string;
  roundId: string;
  tileIndex: number;
  account: string;
}): RecoveryBundle | null {
  if (!params.account) return null;
  return loadBundles()[bundleKey(params)] ?? null;
}

export function forgetBundle(params: {
  contract: string;
  roundId: string;
  tileIndex: number;
  account: string;
}): void {
  const all = loadBundles();
  delete all[bundleKey(params)];
  writeJson(BUNDLE_KEY, all);
}

export function loadPending(): PendingTransaction[] {
  const value = readJson<PendingTransaction[]>(TX_KEY, []);
  return Array.isArray(value) ? value : [];
}

export function rememberPending(entry: PendingTransaction): void {
  const pending = loadPending().filter((item) => item.hash !== entry.hash);
  pending.push(entry);
  writeJson(TX_KEY, pending);
}

export function clearPending(hash: string): void {
  writeJson(
    TX_KEY,
    loadPending().filter((item) => item.hash !== hash),
  );
}

const EMPTY_HISTORY: HistoryEntry[] = [];
const listeners = new Set<() => void>();
let cachedHistory: HistoryEntry[] | null = null;

function notify(): void {
  for (const listener of listeners) listener();
}

export function loadHistory(): HistoryEntry[] {
  const value = readJson<HistoryEntry[]>(HISTORY_KEY, EMPTY_HISTORY);
  return Array.isArray(value) ? value : EMPTY_HISTORY;
}

export function recordHistory(entry: HistoryEntry): void {
  const history = loadHistory().filter((item) => item.hash !== entry.hash);
  history.unshift(entry);
  const next = history.slice(0, HISTORY_LIMIT);
  writeJson(HISTORY_KEY, next);
  cachedHistory = next;
  notify();
}

/**
 * `useSyncExternalStore` plumbing.
 *
 * Transaction history lives in this browser, not in React, so the app
 * subscribes to it instead of copying it into state from an effect.
 */
export function subscribeHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function historySnapshot(): HistoryEntry[] {
  if (cachedHistory === null) cachedHistory = loadHistory();
  return cachedHistory;
}

export function historyServerSnapshot(): HistoryEntry[] {
  return EMPTY_HISTORY;
}
