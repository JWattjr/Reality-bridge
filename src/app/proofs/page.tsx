"use client";

import AuthenticatedImage from "@/components/AuthenticatedImage";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { ArrowLeft, ExternalLink, LockKeyhole, ShieldCheck, Trophy, Wallet } from "lucide-react";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";
import { EVENTS, MISSIONS, PROOF_TYPE_COPY, shortHash, type ProofRecord } from "@/lib/mock-data";

const ZERO_G_NETWORK = "0G Mainnet";
const ZERO_G_FLOW_CONTRACT = "0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526";
const PROOF_REGISTRY_CONTRACT = "0xbEE85061D8CAd149006977d7943cBf6063A57cb0";

type ProofsResponse = {
  proofs?: ProofRecord[];
  issues?: string[];
};

export default function ProofsPage() {
  const auth = useProofPlayAuth();
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [issue, setIssue] = useState("");

  useEffect(() => {
    if (!auth.ready) return;

    if (!auth.authenticated || !auth.userId) {
      setProofs([]);
      setStatus("idle");
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ userId: auth.userId });

    setStatus("loading");

    (async () => {
      try {
        const headers = await auth.authHeaders();
        const response = await fetch(`/api/proofs?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
          headers,
        });
        const data = (await response.json()) as ProofsResponse;
        if (!response.ok) throw new Error(data.issues?.join(", ") ?? "Could not load your proofs");
        setProofs(data.proofs ?? []);
        setStatus("idle");
        setIssue("");
      } catch (error) {
        if (controller.signal.aborted) return;
        setProofs([]);
        setStatus("error");
        setIssue(error instanceof Error ? error.message : "Could not load your proofs");
      }
    })();

    return () => controller.abort();
  }, [auth]);

  const scopedProofs = useMemo(() => {
    if (!auth.userId) return [];
    const userId = auth.userId.toLowerCase();
    return proofs.filter((proof) => proof.userId.toLowerCase() === userId);
  }, [auth.userId, proofs]);

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--color-primary-900)] bg-white px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
        >
          <ArrowLeft size={14} />
          Back home
        </Link>

        <section className="mt-8 grid gap-5 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-3 py-1.5 text-xs font-bold">
              <ShieldCheck size={14} />
              Wallet-scoped proof vault
            </p>
            <h1
              className="mt-5 font-display text-5xl font-bold leading-[0.95] text-[var(--color-primary-900)] sm:text-6xl"
              style={{ textShadow: "3px 3px 0px #fff" }}
            >
              Proofs signed by your Privy wallet.
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-bold leading-relaxed opacity-70 sm:text-base">
              This page only loads proof records whose owner matches your signed-in wallet. Other accounts do not appear here.
            </p>
          </div>

          <div className="bubbly-card bg-white p-4">
            <p className="text-xs font-bold opacity-60">Signed-in wallet</p>
            <p className="mt-2 break-all rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-purple)] p-3 text-xs font-bold">
              {auth.authenticated ? auth.userId : "Sign in to load your proofs"}
            </p>
            <p className="mt-3 text-xs font-bold opacity-60">ProofPlay registry contract</p>
            <p className="mt-2 break-all rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] p-3 text-xs font-bold">
              {PROOF_REGISTRY_CONTRACT}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Metric label="Network" value={ZERO_G_NETWORK} />
              <Metric label="Your proofs" value={scopedProofs.length.toString()} />
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-3">
          {!auth.authenticated ? (
            <GateCard onLogin={auth.login} />
          ) : status === "loading" ? (
            <EmptyCard title="Loading your proofs" body="Reading proof records for your signed-in Privy wallet." />
          ) : status === "error" ? (
            <EmptyCard title="Could not load proofs" body={issue} />
          ) : scopedProofs.length === 0 ? (
            <EmptyCard
              title="No proofs for this wallet yet"
              body="Complete a mission from this account to create a 0G Storage receipt and ProofRegistry anchor."
              actionHref="/app/missions"
              actionLabel="Open missions"
            />
          ) : (
            scopedProofs.map((proof) => <ProofCard key={proof.id} proof={proof} />)
          )}
        </section>
      </div>
    </main>
  );
}

function ProofCard({ proof }: { proof: ProofRecord }) {
  const event = EVENTS.find((item) => item.id === proof.eventId);
  const mission = MISSIONS.find((item) => item.id === proof.missionId);
  const proofCopy = PROOF_TYPE_COPY[proof.proofType];
  const mediaUrl = `/api/proofs/${proof.id}/media?${new URLSearchParams({ userId: proof.userId }).toString()}`;

  return (
    <article className="bubbly-card premium-glint bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-2.5 py-1 text-[10px] font-bold">
              {proofCopy.label}
            </span>
            <span className="rounded-full border-2 border-[var(--color-primary-900)] bg-white px-2.5 py-1 text-[10px] font-bold">
              {proof.xpEarned} XP
            </span>
            {proof.status === "pending_anchor" && (
              <span className="rounded-full border-2 border-amber-600 bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                ⚠ Pending anchor
              </span>
            )}
          </div>
          <h2 className="mt-3 font-display text-2xl font-bold text-[var(--color-primary-900)]">
            {mission?.title ?? proof.missionId}
          </h2>
          <p className="mt-1 text-xs font-bold opacity-60">
            {event?.title ?? proof.eventId} - {proof.location}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {proof.mediaStorage && (
            <a
              href={`#media-${proof.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
            >
              View media
              <ExternalLink size={13} />
            </a>
          )}
          {proof.storage.explorerUrl && (
            <ProofLink href={proof.storage.explorerUrl} label="0G tx" color="var(--color-pastel-blue)" />
          )}
          {proof.chainAnchor?.explorerUrl && (
            <ProofLink href={proof.chainAnchor.explorerUrl} label="Registry tx" color="var(--color-pastel-yellow)" />
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <ProofField label="Root hash" value={proof.storage.rootHash} />
        <ProofField label="Storage tx" value={proof.storage.txHash ?? "pending"} />
        <ProofField label="Timestamp" value={new Date(proof.timestamp).toLocaleString()} />
      </div>

      {proof.chainAnchor && (
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <ProofField label="ProofPlay contract" value={proof.chainAnchor.contractAddress} />
          <ProofField label="Anchor tx" value={proof.chainAnchor.txHash} />
          <ProofField label="Proof key" value={proof.chainAnchor.proofKey} />
        </div>
      )}

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <ProofField icon={<Wallet size={13} />} label="Wallet" value={proof.userId} />
        <ProofField icon={<Trophy size={13} />} label="Proof id" value={proof.id} />
      </div>

      {proof.mediaStorage && (
        <div id={`media-${proof.id}`} className="mt-3 grid gap-3 md:grid-cols-[0.8fr_1.2fr] md:items-start">
          <ProofField label="Media root" value={proof.mediaStorage.rootHash} />
          <div className="overflow-hidden rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)]">
            <AuthenticatedImage
              src={mediaUrl}
              alt={`Uploaded proof media for ${proof.id}`}
              width={640}
              height={360}
              className="h-auto w-full object-cover"
            />
          </div>
        </div>
      )}

      <p className="mt-3 rounded-2xl border-2 border-dashed border-[var(--color-primary-900)]/30 bg-[var(--color-bg-base)] p-3 text-xs font-bold opacity-70">
        {proof.evidenceLabel}
      </p>
    </article>
  );
}

function GateCard({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="bubbly-card bg-white p-6 text-center">
      <LockKeyhole className="mx-auto text-[var(--color-primary-900)]" size={28} />
      <p className="mt-3 font-display text-2xl font-bold">Sign in to view your proofs</p>
      <p className="mt-2 text-sm font-bold opacity-60">
        Proof records are scoped to the Privy wallet that created them.
      </p>
      <button
        type="button"
        onClick={onLogin}
        className="mt-5 inline-flex rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-5 py-2 text-sm font-bold shadow-[3px_3px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
      >
        Sign in
      </button>
    </div>
  );
}

function EmptyCard({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="bubbly-card bg-white p-6 text-center">
      <p className="font-display text-2xl font-bold">{title}</p>
      <p className="mt-2 text-sm font-bold opacity-60">{body}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-pink)] px-5 py-2 text-sm font-bold shadow-[3px_3px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

function ProofLink({ href, label, color }: { href: string; label: string; color: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[var(--color-primary-900)] px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
      style={{ background: color }}
    >
      {label}
      <ExternalLink size={13} />
    </a>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] p-3">
      <p className="text-[10px] font-bold opacity-60">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function ProofField({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  const displayValue = value.startsWith("0x") && value.length > 18 ? shortHash(value) : value;

  return (
    <div className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase opacity-50">
        {icon}
        {label}
      </p>
      <p className="mt-1 break-all text-xs font-bold">{displayValue}</p>
    </div>
  );
}
