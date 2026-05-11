"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Filter, ShieldCheck } from "lucide-react";
import { MISSIONS, PROOF_TYPE_COPY, shortHash } from "@/lib/mock-data";
import type { Mission, MissionStatus, MissionType, ProofRecord } from "@/lib/mock-data";
import { MissionIconBadge } from "@/components/ProofPlayIcons";
import { MissionVerifyAction } from "@/components/MissionVerifyAction";
import { useMissionVerification } from "@/hooks/useMissionVerification";

const TYPE_FILTERS: { label: string; value: MissionType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "QR Scan", value: "qr" },
  { label: "NFC", value: "nfc" },
  { label: "Text", value: "text" },
  { label: "Photo", value: "photo" },
  { label: "Manual", value: "manual" },
];

const STATUS_FILTERS: { label: string; value: MissionStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Available", value: "available" },
  { label: "Completed", value: "completed" },
  { label: "Locked", value: "locked" },
];

export default function MissionsPage() {
  const {
    auth,
    proofsLoading,
    getMissionProof,
    submissionStatus,
    verifyMission,
    withProofStatus,
  } = useMissionVerification();
  const [typeFilter, setTypeFilter] = useState<MissionType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<MissionStatus | "all">("all");
  const [expandedMission, setExpandedMission] = useState<string | null>(null);

  const missions = MISSIONS.map(withProofStatus);
  const filteredMissions = missions.filter((m) => {
    if (typeFilter !== "all" && m.type !== typeFilter) return false;
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    return true;
  });

  const totalXp = missions.reduce((sum, m) => sum + m.xpReward, 0);
  const earnedXp = missions.filter((m) => m.status === "completed").reduce((sum, m) => sum + m.xpReward, 0);

  return (
    <div className="space-y-5">
      {/* Header Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bubbly-card p-4 bg-gradient-to-br from-[var(--color-pastel-purple)] to-[var(--color-pastel-pink)]"
      >
        <h1 className="font-display text-xl font-bold mb-2">Mission Board</h1>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/60 rounded-xl border-2 border-[var(--color-primary-900)] p-2 text-center backdrop-blur-sm">
            <p className="font-bold text-lg">{missions.length}</p>
            <p className="text-[10px] font-bold opacity-70">Total</p>
          </div>
          <div className="bg-white/60 rounded-xl border-2 border-[var(--color-primary-900)] p-2 text-center backdrop-blur-sm">
            <p className="font-bold text-lg text-green-600">{missions.filter((m) => m.status === "completed").length}</p>
            <p className="text-[10px] font-bold opacity-70">Done</p>
          </div>
          <div className="bg-white/60 rounded-xl border-2 border-[var(--color-primary-900)] p-2 text-center backdrop-blur-sm">
            <p className="font-bold text-lg">{earnedXp}/{totalXp}</p>
            <p className="text-[10px] font-bold opacity-70">XP</p>
          </div>
        </div>
      </motion.div>

      {proofsLoading && (
        <p className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-white p-3 text-xs font-bold opacity-70">
          Syncing your proof receipts from Supabase...
        </p>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-1 text-xs font-bold opacity-60">
          <Filter size={12} /> Filter by type
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full border-2 border-[var(--color-primary-900)] text-xs font-bold transition-all ${
                typeFilter === f.value
                  ? "bg-[var(--color-primary-900)] text-white"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full border-2 border-[var(--color-primary-900)] text-xs font-bold transition-all ${
                statusFilter === f.value
                  ? "bg-[var(--color-primary-900)] text-white"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Mission List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredMissions.map((mission, i) => {
            const proofCopy = PROOF_TYPE_COPY[mission.proofType];
            const proof = getMissionProof(mission.id);

            return (
              <motion.div
                key={mission.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={mission.status === "available" ? { y: -3, scale: 1.01 } : undefined}
                whileTap={{ scale: 0.985 }}
                transition={{ delay: i * 0.03, type: "spring", stiffness: 300, damping: 24 }}
                onClick={() => setExpandedMission(expandedMission === mission.id ? null : mission.id)}
                className={`bubbly-card premium-glint p-3 cursor-pointer transition-all ${
                  mission.status === "completed"
                    ? "bg-green-50 opacity-70"
                    : mission.status === "locked"
                    ? "bg-gray-50 opacity-50"
                    : "bg-white active:translate-y-0.5 active:shadow-none"
                }`}
              >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <MissionIconBadge title={mission.title} type={mission.type} proofType={mission.proofType} size="md" />
                  <div className="min-w-0">
                    <p className={`font-bold text-sm truncate ${mission.status === "completed" ? "line-through" : ""}`}>
                      {mission.title}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <motion.span
                        className="text-xs font-bold text-[var(--color-primary-500)] flex items-center gap-0.5"
                        animate={mission.status === "available" ? { scale: [1, 1.08, 1] } : undefined}
                        transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
                      >
                        <Zap size={10} /> +{mission.xpReward} XP
                      </motion.span>
                      {mission.sponsorTag && (
                        <span className="text-[10px] font-bold bg-[var(--color-pastel-yellow)] px-1.5 py-0.5 rounded-full border border-[var(--color-primary-900)]">
                          {mission.sponsorTag}
                        </span>
                      )}
                      {mission.badgeReward && (
                        <span className="text-[10px] font-bold bg-[var(--color-pastel-pink)] px-1.5 py-0.5 rounded-full border border-[var(--color-primary-900)]">
                          Badge
                        </span>
                      )}
                      <motion.span
                        className="text-[10px] font-bold bg-white px-1.5 py-0.5 rounded-full border border-[var(--color-primary-900)] flex items-center gap-0.5"
                        whileHover={{ scale: 1.06 }}
                      >
                        <ShieldCheck size={9} /> {proofCopy.label}
                      </motion.span>
                    </div>
                  </div>
                </div>
                <MissionVerifyAction
                  mission={mission}
                  status={submissionStatus[mission.id]}
                  onVerify={verifyMission}
                />
              </div>

              {/* Expanded details */}
              <AnimatePresence>
                {expandedMission === mission.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t-2 border-dashed border-[var(--color-primary-900)]/20 text-xs">
                      <p className="font-bold opacity-80 mb-2">{mission.description}</p>
                      <div className="flex justify-between">
                        <span className="opacity-60">Type: {mission.type.toUpperCase()}</span>
                        <span className="opacity-60">Max: {mission.maxCompletions}x</span>
                      </div>
                            <MissionProofDetails mission={mission} proof={proof ?? undefined} userId={auth.userId} />
                      {submissionStatus[mission.id]?.message && (
                        <p
                          className={`mt-2 font-bold ${
                            submissionStatus[mission.id].state === "error"
                              ? "text-red-600"
                              : "text-green-700"
                          }`}
                        >
                          {submissionStatus[mission.id].message}
                        </p>
                      )}
                      {mission.completedAt && (
                        <p className="mt-1 text-green-600 font-bold">
                          Completed {new Date(mission.completedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredMissions.length === 0 && (
          <div className="text-center py-12 opacity-50">
            <p className="font-bold text-sm">No missions match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MissionProofDetails({
  mission,
  proof,
  userId,
}: {
  mission: Mission;
  proof?: ProofRecord;
  userId: string | null;
}) {
  const mediaUrl = proof && userId
    ? `/api/proofs/${proof.id}/media?${new URLSearchParams({ userId }).toString()}`
    : undefined;

  return (
    <div className="mt-2 rounded-xl border-2 border-[var(--color-primary-900)] bg-white/70 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">{PROOF_TYPE_COPY[mission.proofType].storedAs}</span>
        <span className="font-bold opacity-60">{mission.proofLocation ?? "Event venue"}</span>
      </div>
      {proof ? (
        <div className="mt-1 space-y-1">
          <p className="font-bold text-green-600">0G root: {shortHash(proof.storage.rootHash)}</p>
          <p className="opacity-60 truncate">{proof.storage.storageRef}</p>
          {proof.mediaStorage && mediaUrl && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-green-600">Media root: {shortHash(proof.mediaStorage.rootHash)}</p>
              <a
                href={mediaUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-2 py-0.5 text-[10px] font-bold"
              >
                View media
              </a>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-1 opacity-60">A validated proof record will be uploaded before XP and badges are saved.</p>
      )}
    </div>
  );
}
