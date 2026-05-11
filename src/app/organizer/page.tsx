"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { EVENTS, ANALYTICS, MISSIONS, PROOF_TYPE_COPY, shortHash } from "@/lib/mock-data";
import type { ProofRecord } from "@/lib/mock-data";
import { Users, Target, TrendingUp, BarChart3, ArrowRight, ShieldCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";

export default function OrganizerDashboard() {
  const auth = useProofPlayAuth();
  const [proofRecords, setProofRecords] = useState<ProofRecord[]>([]);
  const [zeroGContract, setZeroGContract] = useState("0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526");

  useEffect(() => {
    if (!auth.ready || !auth.authenticated || !auth.userId) {
      setProofRecords([]);
      return;
    }

    const userId = auth.userId;

    (async () => {
      try {
        const headers = await auth.authHeaders();
        const params = new URLSearchParams({ userId });
        const response = await fetch(`/api/proofs?${params.toString()}`, { headers });
        const data: { proofs?: ProofRecord[]; zeroG?: { contractAddress?: string } } = await response.json();
        setProofRecords(data.proofs ?? []);
        if (data.zeroG?.contractAddress) setZeroGContract(data.zeroG.contractAddress);
      } catch {
        setProofRecords([]);
      }
    })();
  }, [auth]);

  const statCards = [
    { label: "Check-ins", value: ANALYTICS.totalCheckIns.toLocaleString(), icon: <Users size={18} />, color: "var(--color-pastel-blue)" },
    { label: "Attendees", value: ANALYTICS.activeAttendees.toLocaleString(), icon: <TrendingUp size={18} />, color: "var(--color-pastel-green)" },
    { label: "Missions", value: ANALYTICS.totalMissionsCompleted.toLocaleString(), icon: <Target size={18} />, color: "var(--color-pastel-pink)" },
    { label: "Avg/User", value: ANALYTICS.avgMissionsPerAttendee.toString(), icon: <BarChart3 size={18} />, color: "var(--color-pastel-yellow)" },
    { label: "0G Proofs", value: proofRecords.length.toString(), icon: <ShieldCheck size={18} />, color: "var(--color-pastel-purple)" },
  ];

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-xl font-bold sm:text-3xl">Organizer Dashboard</h1>
        <p className="text-xs font-bold opacity-60 mt-1 sm:text-sm">Here&apos;s your event overview</p>
      </motion.div>

      {/* Stats — horizontal scroll on mobile, grid on desktop */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="-mx-4 px-4 sm:mx-0 sm:px-0"
      >
        <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-5 sm:gap-3 sm:overflow-visible sm:pb-0">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -4, scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="bubbly-card premium-glint snap-start shrink-0 w-[7.5rem] p-3 sm:w-auto sm:p-4"
              style={{ backgroundColor: stat.color }}
            >
              <div className="mb-1.5 sm:mb-2">{stat.icon}</div>
              <p className="font-display text-lg font-bold sm:text-2xl">{stat.value}</p>
              <p className="text-[10px] font-bold leading-tight opacity-70 sm:text-xs">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Your Events — full width on mobile */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex justify-between items-end mb-3">
          <h2 className="font-display text-lg font-bold sm:text-xl">Your Events</h2>
          <Link href="/organizer/create" className="text-[10px] font-bold opacity-60 hover:opacity-100 flex items-center gap-1 sm:text-xs">
            Create <ArrowRight size={12} />
          </Link>
        </div>
        <div className="space-y-2 sm:space-y-3">
          {EVENTS.map((event) => (
            <div key={event.id} className="bubbly-card flex items-center gap-2.5 bg-white p-2.5 transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#312e81] sm:gap-4 sm:p-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border-2 border-[var(--color-primary-900)] shrink-0 sm:w-12 sm:h-12 sm:rounded-2xl sm:text-2xl" style={{ backgroundColor: event.color }}>
                {event.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs truncate sm:text-sm">{event.title}</p>
                <p className="truncate text-[10px] font-bold opacity-50 sm:text-xs">{event.startDate} · {event.location}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[9px] font-bold bg-[var(--color-pastel-blue)] px-1.5 py-0.5 rounded-full border border-[var(--color-primary-900)] sm:text-[10px]">
                    {event.attendees} attendees
                  </span>
                  <span className="text-[9px] font-bold bg-[var(--color-pastel-green)] px-1.5 py-0.5 rounded-full border border-[var(--color-primary-900)] sm:text-[10px]">
                    {event.missions} missions
                  </span>
                </div>
              </div>
              <ArrowRight size={14} className="opacity-40 shrink-0 sm:size-4" />
            </div>
          ))}
        </div>
      </motion.section>

      {/* 0G Integration Proof */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h2 className="font-display text-lg font-bold mb-3 sm:text-xl">0G Integration Proof</h2>
        <div className="bubbly-card p-3 bg-white space-y-2.5 sm:p-4 sm:space-y-3">
          <div className="rounded-xl bg-[var(--color-pastel-purple)] border-2 border-[var(--color-primary-900)] p-2.5 sm:p-3">
            <p className="text-[9px] font-bold opacity-60 sm:text-[10px]">0G mainnet Flow contract</p>
            <p className="break-all text-[10px] font-bold leading-relaxed sm:text-xs">{zeroGContract}</p>
          </div>
          {proofRecords.length === 0 && (
            <p className="text-[10px] font-bold opacity-50 sm:text-xs">
              Real 0G upload receipts will appear here after attendees complete user-paid mission uploads.
            </p>
          )}
          {proofRecords.map((proof) => {
            const mission = MISSIONS.find((item) => item.id === proof.missionId);

            return (
              <motion.div
                key={proof.id}
                initial={{ opacity: 0, y: 12, rotate: -0.6 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                whileHover={{ y: -3, scale: 1.01 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
                className="premium-glint rounded-xl bg-[var(--color-bg-base)] border-2 border-[var(--color-primary-900)] p-2.5 sm:p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-[11px] truncate sm:text-xs">{mission?.title ?? proof.missionId}</p>
                    <p className="truncate text-[9px] font-bold opacity-50 sm:text-[10px]">
                      {PROOF_TYPE_COPY[proof.proofType].label} · {proof.location}
                    </p>
                  </div>
                  <motion.span
                    initial={{ scale: 1.35, rotate: -8 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 18 }}
                    className="font-bold text-[9px] text-green-700 shrink-0 rounded-full border border-green-700 bg-green-100 px-1.5 py-0.5 sm:text-[10px] sm:px-2 sm:py-1"
                  >
                    {proof.xpEarned} XP
                  </motion.span>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-[9px] font-bold sm:mt-2 sm:text-[10px]">
                  <span className="opacity-50 truncate min-w-0">{proof.storage.storageRef}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {proof.storage.explorerUrl ? (
                      <a href={proof.storage.explorerUrl} target="_blank" rel="noreferrer" className="text-[var(--color-primary-500)] underline inline-flex items-center gap-0.5">
                        Explorer <ExternalLink size={8} />
                      </a>
                    ) : (
                      <span className="proof-shimmer">{shortHash(proof.storage.rootHash)}</span>
                    )}
                    {proof.chainAnchor?.explorerUrl && (
                      <a href={proof.chainAnchor.explorerUrl} target="_blank" rel="noreferrer" className="text-[var(--color-primary-500)] underline inline-flex items-center gap-0.5">
                        Registry <ExternalLink size={8} />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Analytics grid — stacks on mobile, side-by-side on desktop */}
      <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
        {/* Top Missions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-display text-lg font-bold mb-3 sm:text-xl">Top Missions</h2>
          <div className="bubbly-card p-3 bg-white space-y-2.5 sm:p-4 sm:space-y-3">
            {ANALYTICS.topMissions.map((mission, i) => (
              <motion.div key={i} className="flex items-center gap-2.5 rounded-xl p-1 sm:gap-3" whileHover={{ x: 3 }}>
                <span className="font-bold text-xs w-4 text-center opacity-50 sm:w-5 sm:text-sm">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[11px] truncate sm:text-xs">{mission.name}</p>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden sm:h-2">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: i === 0 ? "var(--color-pastel-purple)" : i === 1 ? "var(--color-pastel-pink)" : "var(--color-pastel-blue)",
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${ANALYTICS.topMissions[0].completions ? (mission.completions / ANALYTICS.topMissions[0].completions) * 100 : 0}%` }}
                      whileHover={{ filter: "brightness(1.08)" }}
                      transition={{ type: "spring", stiffness: 85, damping: 18, delay: 0.4 + i * 0.1 }}
                    />
                  </div>
                </div>
                <motion.span className="font-bold text-[10px] opacity-60 shrink-0 sm:text-xs" whileHover={{ scale: 1.15 }}>
                  {mission.completions}
                </motion.span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Sponsor Visits */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h2 className="font-display text-lg font-bold mb-3 sm:text-xl">Sponsor Booth Visits</h2>
          <div className="bubbly-card p-3 bg-white space-y-2 sm:p-4 sm:space-y-3">
            {ANALYTICS.sponsorVisits.map((sponsor, i) => (
              <motion.div key={i} className="flex items-center justify-between gap-2 rounded-xl p-1" whileHover={{ x: 3, backgroundColor: "rgba(255,255,255,0.55)" }}>
                <div className="flex min-w-0 items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[var(--color-pastel-yellow)] border-2 border-[var(--color-primary-900)] flex items-center justify-center text-[10px] font-bold sm:w-8 sm:h-8 sm:text-xs">
                    {sponsor.sponsor[0]}
                  </div>
                  <span className="truncate text-xs font-bold sm:text-sm">{sponsor.sponsor}</span>
                </div>
                <motion.span className="shrink-0 text-[10px] font-bold sm:text-sm" whileHover={{ scale: 1.08 }}>{sponsor.visits}</motion.span>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>

      {/* Hourly Activity — full width */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="font-display text-lg font-bold mb-3 sm:text-xl">Today&apos;s Activity</h2>
        <div className="bubbly-card p-3 bg-white sm:p-4">
          <div className="flex h-24 items-end gap-[3px] sm:h-28 sm:gap-1">
            {ANALYTICS.hourlyActivity.map((hour, i) => {
              const maxMissions = Math.max(...ANALYTICS.hourlyActivity.map((h) => h.missions));
              const height = maxMissions ? (hour.missions / maxMissions) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5 sm:gap-1">
                  <motion.div
                    className="w-full rounded-t-md border border-[var(--color-primary-900)] bg-[var(--color-pastel-purple)] sm:rounded-t-lg sm:border-2"
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    whileHover={{ scaleY: 1.04, filter: "brightness(1.08)" }}
                    title={`${hour.hour}: ${hour.missions} missions`}
                    transition={{ type: "spring", stiffness: 95, damping: 17, delay: 0.5 + i * 0.05 }}
                  />
                  <span className="text-[6px] font-bold opacity-40 sm:text-[8px]">{hour.hour}</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>
    </div>
  );
}
