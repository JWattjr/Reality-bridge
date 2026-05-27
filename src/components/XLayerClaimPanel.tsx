"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";
import { claimRefundOnXLayer, claimWinningsOnXLayer, isXLayerContractsConfigured, type XLayerWallet } from "@/lib/xlayer";

export function XLayerClaimPanel() {
  const auth = useProofPlayAuth();
  const [predictionId, setPredictionId] = useState("");
  const [status, setStatus] = useState("");
  const [txUrl, setTxUrl] = useState("");
  const [busy, setBusy] = useState<"claim" | "refund" | null>(null);
  const wallet = auth.wallets[0] as XLayerWallet | undefined;
  const configured = isXLayerContractsConfigured();
  const canSubmit = Boolean(configured && auth.authenticated && wallet && predictionId.trim());

  async function run(action: "claim" | "refund") {
    if (!wallet) return;
    setBusy(action);
    setTxUrl("");
    setStatus(action === "claim" ? "Claiming winnings on X Layer..." : "Claiming refund on X Layer...");

    try {
      const result =
        action === "claim"
          ? await claimWinningsOnXLayer(wallet, predictionId)
          : await claimRefundOnXLayer(wallet, predictionId);
      setStatus(action === "claim" ? "Winnings claimed." : "Refund claimed.");
      setTxUrl(result.explorerUrl);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "X Layer claim failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="bubbly-card bg-white p-4">
      <h2 className="font-display text-xl font-bold">Claim Winnings</h2>
      <p className="mt-1 text-xs font-bold opacity-60">
        After admin resolution, enter your on-chain prediction ID to claim winnings or refunds.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={predictionId}
          onChange={(event) => setPredictionId(event.target.value.replace(/[^0-9]/g, ""))}
          placeholder="Prediction ID"
          className="min-w-0 flex-1 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] px-3 py-2 text-xs font-bold outline-none"
        />
        <button
          type="button"
          disabled={!canSubmit || busy !== null}
          onClick={() => run("claim")}
          className="rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-4 py-2 text-xs font-bold disabled:opacity-50"
        >
          {busy === "claim" ? "Claiming..." : "Claim Winnings"}
        </button>
        <button
          type="button"
          disabled={!canSubmit || busy !== null}
          onClick={() => run("refund")}
          className="rounded-full border-2 border-[var(--color-primary-900)] bg-white px-4 py-2 text-xs font-bold disabled:opacity-50"
        >
          {busy === "refund" ? "Refunding..." : "Claim Refund"}
        </button>
      </div>
      {!configured && (
        <p className="mt-2 text-xs font-bold text-amber-700">Deploy X Layer contracts to enable claiming.</p>
      )}
      {status && (
        <p className="mt-3 rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] p-3 text-xs font-bold">
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
