import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft, Brain, Database, ExternalLink, FileJson, ImageIcon, ShieldCheck, Wallet } from "lucide-react";
import ReputationAgentCard from "@/app/0g-proof/ReputationAgentCard";
import { EVENTS, MISSIONS, PROOF_TYPE_COPY, shortHash } from "@/lib/mock-data";
import { readProofRecords } from "@/lib/proof-store";
import { buildReputationAgentSummary } from "@/lib/reputation-agent";
import { ZERO_G_MAINNET } from "@/lib/zero-g";

export default async function ZeroGProofPage() {
  await connection();

  const proofs: Awaited<ReturnType<typeof readProofRecords>> = [];
  const latestProof = proofs[0];
  const latestMediaProof = proofs.find((proof) => proof.mediaStorage);
  const contractAddress = process.env.ZERO_G_FLOW_CONTRACT_ADDRESS ?? ZERO_G_MAINNET.flowContractAddress;
  const registryAddress = process.env.NEXT_PUBLIC_PROOF_REGISTRY_ADDRESS;
  const summary = buildReputationAgentSummary(proofs, latestProof?.userId);

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--color-primary-900)] bg-white px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
        >
          <ArrowLeft size={14} />
          Back home
        </Link>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-3 py-1.5 text-xs font-bold">
              <ShieldCheck size={14} />
              0G APAC Hackathon verification
            </p>
            <h1
              className="mt-5 font-display text-5xl font-bold leading-[0.92] text-[var(--color-primary-900)] sm:text-6xl"
              style={{ textShadow: "3px 3px 0px #fff" }}
            >
              Real proof records, stored evidence, retrievable media.
            </h1>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-relaxed opacity-70 sm:text-base">
              ProofPlay integrates 0G Storage as the permanent evidence layer for mission proof JSON,
              uploaded photos, and portable summaries generated through a 0G Compute reputation agent.
            </p>
          </div>

          <div className="bubbly-card bg-white p-4">
            <p className="text-xs font-bold opacity-60">Mainnet Flow contract</p>
            <p className="mt-2 break-all rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-purple)] p-3 text-xs font-bold">
              {contractAddress}
            </p>
            <p className="mt-3 text-xs font-bold opacity-60">ProofPlay registry contract</p>
            <p className="mt-2 break-all rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] p-3 text-xs font-bold">
              {registryAddress ?? "Pending deployment"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Metric label="Network" value={ZERO_G_MAINNET.network} />
              <Metric label="Proof receipts" value={proofs.length.toString()} />
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <RequirementCard
            icon={<Wallet size={18} />}
            title="Contract Addresses"
            body={`0G Flow: ${contractAddress}${registryAddress ? ` | ProofRegistry: ${registryAddress}` : ""}`}
          />
          <RequirementCard
            icon={<ExternalLink size={18} />}
            title="Explorer Activity"
            body={latestProof?.chainAnchor?.txHash ?? latestProof?.storage.txHash ?? "Complete a mission to generate a tx"}
            href={latestProof?.chainAnchor?.explorerUrl ?? latestProof?.storage.explorerUrl}
          />
          <RequirementCard
            icon={<Database size={18} />}
            title="0G Component"
            body="0G Storage persists evidence. 0G Compute generates the reputation agent summary."
          />
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            <div className="bubbly-card bg-white p-5">
              <p className="font-display text-2xl font-bold">Architecture</p>
              <div className="mt-4 grid gap-2 text-xs font-bold">
                {[
                  "Frontend: Privy sign-in, event registration, mission proof submission",
                  "Backend: proof validation, XP/badge write, receipt indexing",
                  "Supabase: fast index for users, events, registrations, leaderboard",
                  "0G Storage: permanent proof JSON, photos, credential snapshots",
                  "ProofRegistry: user-paid on-chain anchor for every mission proof root",
                  "0G Compute: reputation agent inference with TEE verification requested",
                  "0G Explorer: on-chain upload transactions and contract activity",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] p-3">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <ReputationAgentCard defaultUserId={latestProof?.userId} />
          </div>

          <div className="space-y-5">
            {latestProof && (
              <ProofReceiptCard proof={latestProof} />
            )}

            {latestMediaProof && (
              <div className="bubbly-card bg-white p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl font-bold">Retrieved Media</p>
                    <p className="text-xs font-bold opacity-60">Loaded through `/api/proofs/[id]/media` from the 0G media root.</p>
                  </div>
                  <ImageIcon size={22} />
                </div>
                <div className="overflow-hidden rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)]">
                  <Image
                    src={`/api/proofs/${latestMediaProof.id}/media`}
                    alt={`Uploaded proof media for ${latestMediaProof.id}`}
                    width={900}
                    height={540}
                    className="h-auto w-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="mt-3 grid gap-2 text-xs font-bold sm:grid-cols-2">
                  <ProofField label="Media root" value={latestMediaProof.mediaStorage?.rootHash ?? ""} />
                  <ProofField label="Media tx" value={latestMediaProof.mediaStorage?.txHash ?? "pending"} href={latestMediaProof.mediaStorage?.explorerUrl} />
                </div>
              </div>
            )}

            <div className="bubbly-card bg-white p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-purple)]">
                  <Brain size={18} />
                </span>
                <p className="font-display text-2xl font-bold">Agent Preview</p>
              </div>
              <p className="mt-1 text-sm font-bold opacity-65">
                The live action above calls 0G Compute, merges model output with verified proof records, and stores the resulting credential on 0G Storage.
              </p>
              <div className="mt-3 rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] p-3">
                <p className="text-[10px] font-bold uppercase opacity-50">Current assessment</p>
                <p className="font-display text-xl font-bold">{summary.agentAssessment.reputationLabel}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {summary.claims.slice(0, 3).map((claim) => (
                    <span key={claim} className="rounded-full border border-[var(--color-primary-900)] bg-white px-2 py-1 text-[10px] font-bold">
                      {claim}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ProofReceiptCard({ proof }: { proof: Awaited<ReturnType<typeof readProofRecords>>[number] }) {
  const event = EVENTS.find((item) => item.id === proof.eventId);
  const mission = MISSIONS.find((item) => item.id === proof.missionId);

  return (
    <div className="bubbly-card bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-3 py-1 text-[10px] font-bold">
            <FileJson size={12} />
            Latest proof JSON
          </p>
          <h2 className="mt-3 font-display text-2xl font-bold">{mission?.title ?? proof.missionId}</h2>
          <p className="text-xs font-bold opacity-60">{event?.title ?? proof.eventId} - {PROOF_TYPE_COPY[proof.proofType].label}</p>
        </div>
        {proof.storage.explorerUrl && (
          <a
            href={proof.storage.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
          >
            Explorer
            <ExternalLink size={13} />
          </a>
        )}
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <ProofField label="Proof root" value={proof.storage.rootHash} />
        <ProofField label="Proof tx" value={proof.storage.txHash ?? "pending"} href={proof.storage.explorerUrl} />
        <ProofField label="Storage ref" value={proof.storage.storageRef} />
        <ProofField label="User" value={proof.userId} />
        {proof.chainAnchor && (
          <>
            <ProofField label="ProofRegistry tx" value={proof.chainAnchor.txHash} href={proof.chainAnchor.explorerUrl} />
            <ProofField label="Proof key" value={proof.chainAnchor.proofKey} />
          </>
        )}
      </div>
    </div>
  );
}

function RequirementCard({
  icon,
  title,
  body,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href?: string;
}) {
  return (
    <div className="bubbly-card bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-yellow)]">
          {icon}
        </span>
        <p className="font-display text-xl font-bold">{title}</p>
      </div>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="mt-3 block break-all text-xs font-bold text-[var(--color-primary-500)] underline">
          {body}
        </a>
      ) : (
        <p className="mt-3 break-all text-xs font-bold opacity-70">{body}</p>
      )}
    </div>
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

function ProofField({ label, value, href }: { label: string; value: string; href?: string }) {
  const displayValue = value.startsWith("0x") && value.length > 18 ? shortHash(value) : value;

  return (
    <div className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] p-3">
      <p className="text-[10px] font-bold uppercase opacity-50">{label}</p>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs font-bold text-[var(--color-primary-500)] underline">
          {displayValue}
        </a>
      ) : (
        <p className="mt-1 break-all text-xs font-bold">{displayValue}</p>
      )}
    </div>
  );
}
