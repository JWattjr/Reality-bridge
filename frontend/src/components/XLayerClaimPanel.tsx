"use client";

import { useState } from "react";
import { CircleDollarSign, ExternalLink, RotateCcw, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { claimRefundOnXLayer, claimWinningsOnXLayer, getPrivyEmbeddedXLayerWallet, isXLayerContractsConfigured, type XLayerWallet } from "@/lib/xlayer";
import { formatUSDT } from "@/lib/football-data";

type ClaimablePrediction = {
  id: string;
  chainPredictionId?: string;
  gameId?: string;
  marketId?: string;
  optionLabel?: string;
  amountUSDT?: number | string;
  winningsUSDT?: number | string;
  status?: string;
  claimed?: boolean;
};

export function XLayerClaimPanel({ predictions = [] }: { predictions?: ClaimablePrediction[] }) {
  const auth = useAuthStore();
  const [status, setStatus] = useState("");
  const [txUrl, setTxUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Record<string, "claim" | "refund">>({});
  const wallet = getPrivyEmbeddedXLayerWallet(auth.wallets as XLayerWallet[]);
  const configured = isXLayerContractsConfigured();
  const visiblePredictions = predictions
    .filter((prediction) => prediction.chainPredictionId)
    .filter((prediction) => ["WON", "REFUNDED", "CLAIMED", "ACTIVE"].includes(prediction.status ?? "ACTIVE"))
    .sort((a, b) => claimPriority(a) - claimPriority(b));

  async function run(action: "claim" | "refund", prediction: ClaimablePrediction) {
    if (!wallet) return;
    const predictionId = prediction.chainPredictionId;
    if (!predictionId) return;

    setBusy(`${action}:${prediction.id}`);
    setTxUrl("");
    setStatus(action === "claim" ? "Claiming winnings on X Layer..." : "Claiming refund on X Layer...");

    try {
      const result =
        action === "claim"
          ? await claimWinningsOnXLayer(wallet, predictionId)
          : await claimRefundOnXLayer(wallet, predictionId);
      setStatus(action === "claim" ? "Winnings claimed." : "Refund claimed.");
      setTxUrl(result.explorerUrl);
      setCompleted((current) => ({ ...current, [prediction.id]: action }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "X Layer claim failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="bubbly-card bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Claim Center</h2>
          <p className="mt-1 text-xs font-bold opacity-60">
            Won or refundable bets appear here automatically. No prediction ID typing needed.
          </p>
        </div>
        <ShieldCheck size={20} className="mt-1 shrink-0" />
      </div>

      <div className="mt-3 space-y-2">
        {visiblePredictions.map((prediction) => {
          const action = getPredictionAction(prediction, completed[prediction.id]);
          const isBusy = busy === `${action.type}:${prediction.id}`;
          const disabled = !configured || !auth.authenticated || !wallet || !action.type || isBusy;

          return (
            <div key={prediction.id} className="rounded-2xl border-2 border-primary-900 bg-bg-base p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{prediction.gameId ?? "Match"}</p>
                    <span className={`rounded-full border-2 border-primary-900 px-2 py-0.5 text-[10px] font-bold ${action.badgeClass}`}>
                      {action.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold opacity-65">
                    {prediction.marketId ?? "Market"} - Your Pick: {prediction.optionLabel ?? "Outcome"}
                  </p>
                  <p className="mt-1 text-[10px] font-bold opacity-55">
                    Staked {formatUSDT(Number(prediction.amountUSDT ?? 0))}
                    {prediction.winningsUSDT ? ` - Estimated winnings ${formatUSDT(Number(prediction.winningsUSDT))}` : ""}
                  </p>
                </div>

                {action.type ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => run(action.type, prediction)}
                    className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-full border-2 border-primary-900 px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${
                      action.type === "claim" ? "bg-pastel-green" : "bg-pastel-yellow"
                    }`}
                  >
                    {action.type === "claim" ? <CircleDollarSign size={14} /> : <RotateCcw size={14} />}
                    {isBusy ? action.busyLabel : action.buttonLabel}
                  </button>
                ) : (
                  <span className="shrink-0 rounded-full border-2 border-primary-900 bg-white px-3 py-1.5 text-[10px] font-bold opacity-70">
                    {action.buttonLabel}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {visiblePredictions.length === 0 && (
          <p className="rounded-2xl border-2 border-dashed border-primary-900/40 bg-bg-base p-4 text-sm font-bold opacity-60">
            No claimable bets yet. Won or refundable predictions will show up here after markets resolve.
          </p>
        )}
      </div>

      {!configured && (
        <p className="mt-2 text-xs font-bold text-amber-700">Deploy X Layer contracts to enable claiming.</p>
      )}
      {!auth.authenticated && (
        <p className="mt-2 text-xs font-bold text-amber-700">Connect your wallet to claim winnings or refunds.</p>
      )}
      {status && (
        <p className="mt-3 rounded-2xl border-2 border-primary-900 bg-pastel-blue p-3 text-xs font-bold">
          {status}
          {txUrl && (
            <a href={txUrl} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 underline">
              View tx <ExternalLink size={11} />
            </a>
          )}
        </p>
      )}
    </section>
  );
}

function getPredictionAction(prediction: ClaimablePrediction, completed?: "claim" | "refund") {
  if (completed === "claim") {
    return { type: null, label: "Claimed", buttonLabel: "Done", busyLabel: "", badgeClass: "bg-pastel-green" } as const;
  }
  if (completed === "refund") {
    return { type: null, label: "Refunded", buttonLabel: "Done", busyLabel: "", badgeClass: "bg-pastel-green" } as const;
  }
  if (prediction.claimed || prediction.status === "CLAIMED") {
    return { type: null, label: "Claimed", buttonLabel: "Done", busyLabel: "", badgeClass: "bg-pastel-green" } as const;
  }
  if (prediction.status === "WON") {
    return { type: "claim", label: "Won", buttonLabel: "Claim Winnings", busyLabel: "Claiming...", badgeClass: "bg-pastel-green" } as const;
  }
  if (prediction.status === "REFUNDED") {
    return { type: "refund", label: "Refund available", buttonLabel: "Claim Refund", busyLabel: "Refunding...", badgeClass: "bg-pastel-yellow" } as const;
  }
  if (prediction.status === "ACTIVE") {
    return { type: null, label: "Waiting", buttonLabel: "Not resolved", busyLabel: "", badgeClass: "bg-white" } as const;
  }
  return { type: null, label: prediction.status ?? "Open", buttonLabel: "No action", busyLabel: "", badgeClass: "bg-white" } as const;
}

function claimPriority(prediction: ClaimablePrediction) {
  if (prediction.status === "WON" && !prediction.claimed) return 0;
  if (prediction.status === "REFUNDED" && !prediction.claimed) return 1;
  if (prediction.status === "ACTIVE") return 2;
  return 3;
}
