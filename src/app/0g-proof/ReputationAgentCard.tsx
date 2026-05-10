"use client";

import { useState } from "react";
import { Brain, ExternalLink, Loader2 } from "lucide-react";
import { shortHash, type StorageReference } from "@/lib/mock-data";
import type { ReputationAgentSummary } from "@/lib/reputation-agent";

type AgentResponse =
  | {
      status: "stored";
      summary: ReputationAgentSummary;
      storage: StorageReference;
    }
  | {
      status: string;
      issues?: string[];
    };

export default function ReputationAgentCard({ defaultUserId }: { defaultUserId?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AgentResponse | null>(null);

  async function generateSummary() {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/reputation/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: defaultUserId }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        status: "request_failed",
        issues: [error instanceof Error ? error.message : "Could not generate reputation summary"],
      });
    } finally {
      setIsLoading(false);
    }
  }

  const stored = isStoredResult(result) ? result : undefined;

  return (
    <div className="bubbly-card bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-purple)]">
          <Brain size={22} />
        </div>
        <div>
          <p className="font-display text-2xl font-bold">Proof Agent Snapshot</p>
          <p className="mt-1 text-sm font-bold leading-relaxed opacity-65">
            Packages completed proof records into a portable reputation summary and uploads the summary JSON to 0G Storage.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={generateSummary}
        disabled={isLoading}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-4 py-3 text-sm font-bold shadow-[3px_3px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
      >
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
        {isLoading ? "Uploading summary to 0G" : "Generate 0G reputation summary"}
      </button>

      {stored && (
        <div className="mt-4 space-y-3 rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] p-3">
          <div>
            <p className="text-[10px] font-bold uppercase opacity-50">Agent label</p>
            <p className="font-display text-xl font-bold">{stored.summary.agentAssessment.reputationLabel}</p>
          </div>
          <div className="grid gap-2 text-xs font-bold sm:grid-cols-3">
            <Stat label="Proofs" value={stored.summary.metrics.totalProofs.toString()} />
            <Stat label="XP" value={stored.summary.metrics.totalXp.toString()} />
            <Stat label="Media" value={stored.summary.metrics.mediaProofs.toString()} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase opacity-50">0G summary root</p>
            <p className="break-all text-xs font-bold text-green-700">{stored.storage.rootHash}</p>
          </div>
          {stored.storage.explorerUrl && (
            <a
              href={stored.storage.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-primary-500)] underline"
            >
              Open summary transaction {shortHash(stored.storage.txHash ?? stored.storage.rootHash)}
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}

      {result && !isStoredResult(result) && (
        <p className="mt-3 rounded-2xl border-2 border-red-700 bg-red-50 p-3 text-xs font-bold text-red-700">
          {result.issues?.join(" ") ?? "Could not generate summary."}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border-2 border-[var(--color-primary-900)] bg-white p-2">
      <p className="text-[9px] uppercase opacity-50">{label}</p>
      <p className="text-base">{value}</p>
    </div>
  );
}

function isStoredResult(result: AgentResponse | null): result is Extract<AgentResponse, { status: "stored" }> {
  return Boolean(result && result.status === "stored" && "summary" in result && "storage" in result);
}
