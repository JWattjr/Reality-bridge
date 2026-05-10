import Link from "next/link";
import Image from "next/image";
import { connection } from "next/server";
import { ArrowLeft, ExternalLink, ShieldCheck, Trophy, Wallet } from "lucide-react";
import { EVENTS, MISSIONS, PROOF_TYPE_COPY, shortHash } from "@/lib/mock-data";
import { readProofRecords } from "@/lib/proof-store";
import { ZERO_G_MAINNET } from "@/lib/zero-g";

export default async function ProofsPage() {
  await connection();

  const proofs = await readProofRecords();
  const contractAddress =
    process.env.ZERO_G_FLOW_CONTRACT_ADDRESS ?? ZERO_G_MAINNET.flowContractAddress;
  const registryAddress = process.env.NEXT_PUBLIC_PROOF_REGISTRY_ADDRESS;

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
              Public 0G proof ledger
            </p>
            <h1
              className="mt-5 font-display text-5xl font-bold leading-[0.95] text-[var(--color-primary-900)] sm:text-6xl"
              style={{ textShadow: "3px 3px 0px #fff" }}
            >
              Stored evidence for real-world missions.
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-bold leading-relaxed opacity-70 sm:text-base">
              Each verified action creates a proof record, uploads that proof to 0G Storage, and stores the returned root hash for badges and reputation.
            </p>
          </div>

          <div className="bubbly-card bg-white p-4">
            <p className="text-xs font-bold opacity-60">0G mainnet Flow contract</p>
            <p className="mt-2 break-all rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-purple)] p-3 text-xs font-bold">
              {contractAddress}
            </p>
            <p className="mt-3 text-xs font-bold opacity-60">ProofPlay registry contract</p>
            <p className="mt-2 break-all rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] p-3 text-xs font-bold">
              {registryAddress ?? "Deploy ProofRegistry to enable anchors"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] p-3">
                <p className="text-[10px] font-bold opacity-60">Network</p>
                <p className="font-bold">{ZERO_G_MAINNET.network}</p>
              </div>
              <div className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-yellow)] p-3">
                <p className="text-[10px] font-bold opacity-60">Receipts</p>
                <p className="font-bold">{proofs.length}</p>
              </div>
            </div>
            <Link
              href="/0g-proof"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
            >
              Reviewer 0G integration view
              <ExternalLink size={13} />
            </Link>
          </div>
        </section>

        <section className="mt-8 space-y-3">
          {proofs.length === 0 ? (
            <div className="bubbly-card bg-white p-6 text-center">
              <p className="font-display text-2xl font-bold">No proof receipts yet</p>
              <p className="mt-2 text-sm font-bold opacity-60">
                Complete a mission from the app to create a live 0G Storage receipt.
              </p>
              <Link
                href="/app/missions"
                className="mt-5 inline-flex rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-pink)] px-5 py-2 text-sm font-bold shadow-[3px_3px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
              >
                Open missions
              </Link>
            </div>
          ) : (
            proofs.map((proof) => {
              const event = EVENTS.find((item) => item.id === proof.eventId);
              const mission = MISSIONS.find((item) => item.id === proof.missionId);
              const proofCopy = PROOF_TYPE_COPY[proof.proofType];

              return (
                <article key={proof.id} className="bubbly-card premium-glint bg-white p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-2.5 py-1 text-[10px] font-bold">
                          {proofCopy.label}
                        </span>
                        <span className="rounded-full border-2 border-[var(--color-primary-900)] bg-white px-2.5 py-1 text-[10px] font-bold">
                          {proof.xpEarned} XP
                        </span>
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
                          href={`/api/proofs/${proof.id}/media`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
                        >
                          View media
                          <ExternalLink size={13} />
                        </a>
                      )}
                      {proof.storage.explorerUrl && (
                        <a
                          href={proof.storage.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
                        >
                          Explorer
                          <ExternalLink size={13} />
                        </a>
                      )}
                      {proof.chainAnchor?.explorerUrl && (
                        <a
                          href={proof.chainAnchor.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-yellow)] px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
                        >
                          Registry tx
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-3">
                    <ProofField label="Root hash" value={proof.storage.rootHash} />
                    <ProofField label="Transaction" value={proof.storage.txHash ?? "pending"} />
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
                    <ProofField icon={<Wallet size={13} />} label="User" value={proof.userId} />
                    <ProofField icon={<Trophy size={13} />} label="Proof id" value={proof.id} />
                  </div>

                  {proof.mediaStorage && (
                    <div className="mt-3 grid gap-3 md:grid-cols-[0.8fr_1.2fr] md:items-start">
                      <ProofField label="Media root" value={proof.mediaStorage.rootHash} />
                      <div className="overflow-hidden rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)]">
                        <Image
                          src={`/api/proofs/${proof.id}/media`}
                          alt={`Uploaded proof media for ${proof.id}`}
                          width={640}
                          height={360}
                          className="h-auto w-full object-cover"
                          unoptimized
                        />
                      </div>
                    </div>
                  )}

                  <p className="mt-3 rounded-2xl border-2 border-dashed border-[var(--color-primary-900)]/30 bg-[var(--color-bg-base)] p-3 text-xs font-bold opacity-70">
                    {proof.evidenceLabel}
                  </p>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
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
