"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { EVENTS, ANALYTICS, MISSIONS, PROOF_TYPE_COPY, shortHash } from "@/lib/mock-data";
import type { ProofRecord } from "@/lib/mock-data";
import { Users, Target, TrendingUp, BarChart3, ArrowRight, ShieldCheck } from "lucide-react";
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
    { label: "Check-ins", value: ANALYTICS.totalCheckIns.toLocaleString(), icon: <Users size={20} />, color: "var(--color-pastel-blue)" },
    { label: "Active Attendees", value: ANALYTICS.activeAttendees.toLocaleString(), icon: <TrendingUp size={20} />, color: "var(--color-pastel-green)" },
    { label: "Missions Done", value: ANALYTICS.totalMissionsCompleted.toLocaleString(), icon: <Target size={20} />, color: "var(--color-pastel-pink)" },
    { label: "Avg/Attendee", value: ANALYTICS.avgMissionsPerAttendee.toString(), icon: <BarChart3 size={20} />, color: "var(--color-pastel-yellow)" },
    { label: "0G Proofs", value: proofRecords.length.toString(), icon: <ShieldCheck size={20} />, color: "var(--color-pastel-purple)" },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Organizer Dashboard</h1>
        <p className="text-sm font-bold opacity-60 mt-1">Here&apos;s your event overview</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-2 min-[380px]:gap-3 sm:gap-4 md:grid-cols-5"
      >
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="bubbly-card premium-glint min-h-28 p-3 sm:p-4"
            style={{ backgroundColor: stat.color }}
          >
            <div className="flex justify-between items-start mb-2">
              {stat.icon}
            </div>
            <p className="font-display text-xl font-bold min-[380px]:text-2xl">{stat.value}</p>
            <p className="text-[11px] font-bold leading-tight opacity-70 min-[380px]:text-xs">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Your Events */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex justify-between items-end mb-3">
            <h2 className="font-display text-xl font-bold">Your Events</h2>
            <Link href="/organizer/create" className="text-xs font-bold opacity-60 hover:opacity-100 flex items-center gap-1">
              Create <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {EVENTS.map((event) => (
              <div key={event.id} className="bubbly-card flex items-center gap-3 bg-white p-3 transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#312e81] min-[380px]:gap-4 min-[380px]:p-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border-2 border-[var(--color-primary-900)] shrink-0" style={{ backgroundColor: event.color }}>
                  {event.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate">{event.title}</p>
                  <p className="truncate text-xs font-bold opacity-50">{event.startDate} - {event.location}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 min-[380px]:gap-2">
                    <span className="text-[10px] font-bold bg-[var(--color-pastel-blue)] px-1.5 py-0.5 rounded-full border border-[var(--color-primary-900)]">
                      {event.attendees} attendees
                    </span>
                    <span className="text-[10px] font-bold bg-[var(--color-pastel-green)] px-1.5 py-0.5 rounded-full border border-[var(--color-primary-900)]">
                      {event.missions} missions
                    </span>
                  </div>
                </div>
                <ArrowRight size={16} className="opacity-40 shrink-0" />
              </div>
            ))}
          </div>
        </motion.section>

        {/* Analytics */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {/* Top Missions */}
          <div>
            <h2 className="font-display text-xl font-bold mb-3">0G Integration Proof</h2>
            <div className="bubbly-card p-4 bg-white space-y-3">
              <motion.div
                className="rounded-xl bg-[var(--color-pastel-purple)] border-2 border-[var(--color-primary-900)] p-3"
                whileHover={{ scale: 1.01 }}
              >
                <p className="text-[10px] font-bold opacity-60">0G mainnet Flow contract</p>
                <p className="break-all text-[11px] font-bold min-[380px]:text-xs">{zeroGContract}</p>
              </motion.div>
              {proofRecords.length === 0 && (
                <p className="text-xs font-bold opacity-50">
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
                    className="premium-glint rounded-xl bg-[var(--color-bg-base)] border-2 border-[var(--color-primary-900)] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate">{mission?.title ?? proof.missionId}</p>
                        <p className="truncate text-[10px] font-bold opacity-50">
                          {PROOF_TYPE_COPY[proof.proofType].label} - {proof.location}
                        </p>
                      </div>
                      <motion.span
                        initial={{ scale: 1.35, rotate: -8 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 18 }}
                        className="font-bold text-[10px] text-green-700 shrink-0 rounded-full border border-green-700 bg-green-100 px-2 py-1"
                      >
                        {proof.xpEarned} XP
                      </motion.span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-bold">
                      <span className="opacity-50 truncate">{proof.storage.storageRef}</span>
                      {proof.storage.explorerUrl ? (
                        <a href={proof.storage.explorerUrl} target="_blank" rel="noreferrer" className="text-[var(--color-primary-500)] shrink-0 underline">
                          Explorer
                        </a>
                      ) : (
                        <span className="proof-shimmer shrink-0">{shortHash(proof.storage.rootHash)}</span>
                      )}
                      {proof.chainAnchor?.explorerUrl && (
                        <a href={proof.chainAnchor.explorerUrl} target="_blank" rel="noreferrer" className="text-[var(--color-primary-500)] shrink-0 underline">
                          Registry
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Top Missions */}
          <div>
            <h2 className="font-display text-xl font-bold mb-3">Top Missions</h2>
            <div className="bubbly-card p-4 bg-white space-y-3">
              {ANALYTICS.topMissions.map((mission, i) => (
                <motion.div key={i} className="flex items-center gap-3 rounded-xl p-1" whileHover={{ x: 3 }}>
                  <span className="font-bold text-sm w-5 text-center opacity-50">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs truncate">{mission.name}</p>
                    <div className="w-full h-2 bg-gray-100 rounded-full mt-1 overflow-hidden">
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
                  <motion.span className="font-bold text-xs opacity-60 shrink-0" whileHover={{ scale: 1.15 }}>
                    {mission.completions}
                  </motion.span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Sponsor Visits */}
          <div>
            <h2 className="font-display text-xl font-bold mb-3">Sponsor Booth Visits</h2>
            <div className="bubbly-card p-4 bg-white space-y-3">
              {ANALYTICS.sponsorVisits.map((sponsor, i) => (
                <motion.div key={i} className="flex items-center justify-between gap-2 rounded-xl p-1" whileHover={{ x: 3, backgroundColor: "rgba(255,255,255,0.55)" }}>
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-pastel-yellow)] border-2 border-[var(--color-primary-900)] flex items-center justify-center text-xs font-bold">
                      {sponsor.sponsor[0]}
                    </div>
                    <span className="truncate text-sm font-bold">{sponsor.sponsor}</span>
                  </div>
                  <motion.span className="shrink-0 text-sm font-bold" whileHover={{ scale: 1.08 }}>{sponsor.visits} visits</motion.span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Hourly Activity */}
          <div>
            <h2 className="font-display text-xl font-bold mb-3">Today&apos;s Activity</h2>
            <div className="bubbly-card p-4 bg-white">
              <div className="flex h-28 items-end gap-0.5 min-[380px]:gap-1">
                {ANALYTICS.hourlyActivity.map((hour, i) => {
                  const maxMissions = Math.max(...ANALYTICS.hourlyActivity.map((h) => h.missions));
                  const height = maxMissions ? (hour.missions / maxMissions) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <motion.div
                        className="w-full rounded-t-lg border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-purple)]"
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        whileHover={{ scaleY: 1.04, filter: "brightness(1.08)" }}
                        title={`${hour.hour}: ${hour.missions} missions`}
                        transition={{ type: "spring", stiffness: 95, damping: 17, delay: 0.5 + i * 0.05 }}
                      />
                      <span className="text-[7px] font-bold opacity-40 min-[380px]:text-[8px]">{hour.hour}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
