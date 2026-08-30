"use client";

import { AlertTriangle, Check, LoaderCircle, X } from "lucide-react";

import { ACTION_LABEL, type WriteAction } from "@/lib/contract";
import { shortHash } from "@/lib/format";
import { explorerTxUrl } from "@/lib/network";
import type { HistoryEntry } from "@/lib/storage";
import { PHASE_LABEL, PHASE_TONE, type TxState } from "@/lib/tx";
import { ExternalLinkOut, StatusPill } from "@/components/ui";

function actionLabel(action: string): string {
  return ACTION_LABEL[action as WriteAction] ?? action;
}

function ToneIcon({ tone }: { tone: "idle" | "busy" | "good" | "bad" }) {
  if (tone === "busy") {
    return <LoaderCircle className="spin" size={14} aria-hidden="true" />;
  }
  if (tone === "good") return <Check size={14} aria-hidden="true" />;
  if (tone === "bad") return <X size={14} aria-hidden="true" />;
  return <AlertTriangle size={14} aria-hidden="true" />;
}

export function TransactionCard({ state }: { state: TxState }) {
  const tone = PHASE_TONE[state.phase];
  const explorer = state.hash ? explorerTxUrl(state.hash) : null;
  return (
    <div className={`tx-card tone-${tone}`}>
      <div className="tx-card-head">
        <span className="tx-action">{actionLabel(state.action)}</span>
        <StatusPill
          tone={tone === "good" ? "good" : tone === "bad" ? "bad" : "busy"}
        >
          <ToneIcon tone={tone} /> {PHASE_LABEL[state.phase]}
        </StatusPill>
      </div>
      {state.statusName && (
        <p className="tx-status">
          GenLayer status: <code>{state.statusName}</code>
        </p>
      )}
      {state.message && <p className="tx-message">{state.message}</p>}
      {state.hash && (
        <p className="tx-hash">
          <code>{shortHash(state.hash, 14, 10)}</code>
          {explorer && <ExternalLinkOut href={explorer}>StudioNet explorer</ExternalLinkOut>}
        </p>
      )}
    </div>
  );
}

export default function TransactionMonitor({
  current,
  history,
}: {
  current: TxState | null;
  history: HistoryEntry[];
}) {
  return (
    <section className="panel tx-panel" aria-labelledby="tx-heading">
      <div className="panel-heading">
        <div>
          <span className="panel-kicker">TRANSACTIONS</span>
          <h3 id="tx-heading">What StudioNet reported</h3>
        </div>
      </div>

      <div aria-live="polite" aria-atomic="false">
        {current ? (
          <TransactionCard state={current} />
        ) : (
          <p className="muted-copy">No transaction is in flight.</p>
        )}
      </div>

      {history.length > 0 && (
        <>
          <h4 className="tx-history-heading">History on this device</h4>
          <ul className="tx-history">
            {history.map((entry) => {
              const explorer = explorerTxUrl(entry.hash);
              const tone = PHASE_TONE[entry.phase];
              return (
                <li key={entry.hash} className={`tone-${tone}`}>
                  <div>
                    <strong>{actionLabel(entry.action)}</strong>
                    <span className="tx-history-meta">
                      Round {entry.roundId} · {PHASE_LABEL[entry.phase]}
                    </span>
                    {entry.message && (
                      <span className="tx-history-message">{entry.message}</span>
                    )}
                  </div>
                  {explorer ? (
                    <ExternalLinkOut href={explorer}>
                      {shortHash(entry.hash, 8, 6)}
                    </ExternalLinkOut>
                  ) : (
                    <code>{shortHash(entry.hash, 8, 6)}</code>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
