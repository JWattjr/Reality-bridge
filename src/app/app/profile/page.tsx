"use client";

import { motion } from "framer-motion";
import { CURRENT_USER, BADGES, MISSIONS, PROOF_TYPE_COPY, getLevelForXp, getRarityColor, shortHash } from "@/lib/mock-data";
import type { ProofRecord } from "@/lib/mock-data";
import { Calendar, Award, Target, Star, Share2, Settings, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

const levelInfo = getLevelForXp(CURRENT_USER.totalXp);

const STATS = [
  { label: "Events", value: CURRENT_USER.eventsAttended, icon: <Calendar size={16} />, color: "var(--color-pastel-blue)" },
  { label: "Missions", value: CURRENT_USER.missionsCompleted, icon: <Target size={16} />, color: "var(--color-pastel-green)" },
  { label: "Badges", value: CURRENT_USER.badgesEarned, icon: <Award size={16} />, color: "var(--color-pastel-pink)" },
  { label: "Level", value: levelInfo.level, icon: <Star size={16} />, color: "var(--color-pastel-yellow)" },
];

const RARITY_ORDER = ["legendary", "epic", "rare", "common"] as const;

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"badges" | "activity" | "proofs">("badges");
  const [proofRecords, setProofRecords] = useState<ProofRecord[]>([]);

  const sortedBadges = [...BADGES].sort((a, b) => {
    return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
  });
  const proofBackedBadges = sortedBadges.filter((badge) => proofRecords.some((proof) => proof.badgeId === badge.id));

  useEffect(() => {
    fetch("/api/proofs")
      .then((response) => response.json())
      .then((data: { proofs?: ProofRecord[] }) => setProofRecords(data.proofs ?? []))
      .catch(() => setProofRecords([]));
  }, []);

  return (
    <div className="space-y-5">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bubbly-card p-5 bg-gradient-to-br from-[var(--color-pastel-purple)] to-[var(--color-pastel-blue)] text-center relative overflow-hidden"
      >
        <div className="absolute -left-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="w-20 h-20 mx-auto rounded-full bg-white bubbly-border flex items-center justify-center text-4xl shadow-[3px_3px_0px_0px_#312e81]">
            {CURRENT_USER.avatar}
          </div>

          <h1 className="font-display text-2xl font-bold mt-3">{CURRENT_USER.name}</h1>
          <p className="text-xs font-bold opacity-70 mt-1">{CURRENT_USER.bio}</p>

          <div className="mt-3 inline-flex items-center gap-1.5 bg-white/60 backdrop-blur-sm px-3 py-1 rounded-full border-2 border-[var(--color-primary-900)] text-xs font-bold">
            <Star size={12} fill="currentColor" /> Level {levelInfo.level} — {levelInfo.title}
          </div>
        </div>

        {/* XP Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[10px] font-bold opacity-60 mb-1">
            <span>{CURRENT_USER.totalXp} XP</span>
            {levelInfo.nextLevel && <span>{levelInfo.nextLevel.minXp} XP</span>}
          </div>
          <div className="w-full h-3 bg-white/40 rounded-full border-2 border-[var(--color-primary-900)] overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${levelInfo.progress}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 18, delay: 0.3 }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 justify-center mt-4">
          <button className="bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full border-2 border-[var(--color-primary-900)] text-xs font-bold flex items-center gap-1 hover:bg-white transition-colors">
            <Share2 size={12} /> Share
          </button>
          <button className="bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full border-2 border-[var(--color-primary-900)] text-xs font-bold flex items-center gap-1 hover:bg-white transition-colors">
            <Settings size={12} /> Edit
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-4 gap-2"
      >
        {STATS.map((stat) => (
          <div key={stat.label} className="bubbly-card p-2.5 text-center" style={{ backgroundColor: stat.color }}>
            <div className="flex justify-center mb-1">{stat.icon}</div>
            <p className="font-bold text-lg leading-none">{stat.value}</p>
            <p className="text-[10px] font-bold opacity-70 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl border-2 border-[var(--color-primary-900)]">
          <button
            onClick={() => setActiveTab("badges")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "badges"
                ? "bg-white shadow-sm border-2 border-[var(--color-primary-900)]"
                : "opacity-60"
            }`}
          >
            🏅 Badges ({BADGES.length})
          </button>
          <button
            onClick={() => setActiveTab("proofs")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "proofs"
                ? "bg-white shadow-sm border-2 border-[var(--color-primary-900)]"
                : "opacity-60"
            }`}
          >
            Proofs ({proofRecords.length})
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "activity"
                ? "bg-white shadow-sm border-2 border-[var(--color-primary-900)]"
                : "opacity-60"
            }`}
          >
            📋 Activity
          </button>
        </div>
      </motion.div>

      {/* Badge Grid */}
      {activeTab === "badges" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-3 gap-2"
        >
          {sortedBadges.map((badge, i) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -4, rotate: badge.rarity === "legendary" ? 1.4 : 0.8, scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="bubbly-card premium-glint p-3 text-center cursor-pointer active:translate-y-0.5 active:shadow-none transition-all"
              style={{ backgroundColor: getRarityColor(badge.rarity) }}
            >
              <motion.div
                className="text-3xl mb-1"
                animate={badge.rarity === "legendary" ? { rotate: [-2, 2, -2] } : undefined}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              >
                {badge.emoji}
              </motion.div>
              <p className="font-bold text-[10px] leading-tight">{badge.name}</p>
              <p className="text-[8px] font-bold opacity-50 mt-0.5 uppercase">{badge.rarity}</p>
              {proofRecords.some((proof) => proof.badgeId === badge.id) && (
                <p className="mt-1 inline-flex items-center gap-0.5 rounded-full border border-[var(--color-primary-900)] bg-white/70 px-1 py-0.5 text-[8px] font-bold">
                  <ShieldCheck size={8} /> Proof
                </p>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Proof Ledger */}
      {activeTab === "proofs" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2"
        >
          {proofBackedBadges.map((badge, i) => {
            const proof = proofRecords.find((item) => item.badgeId === badge.id);
            const mission = proof ? MISSIONS.find((item) => item.id === proof.missionId) : undefined;

            if (!proof) return null;

            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ x: 3, scale: 1.01 }}
                transition={{ delay: 0.15 + i * 0.04 }}
                className="rounded-2xl border-2 border-[var(--color-primary-900)] p-3 bg-white"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-xs truncate">{badge.name}</p>
                    <p className="text-[10px] font-bold opacity-50 truncate">{mission?.title ?? proof.missionId}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-[var(--color-pastel-green)] px-2 py-1 rounded-full border border-[var(--color-primary-900)] shrink-0">
                    {PROOF_TYPE_COPY[proof.proofType].label}
                  </span>
                </div>
                <div className="mt-2 rounded-xl bg-[var(--color-bg-base)] border-2 border-[var(--color-primary-900)] p-2 text-[10px] font-bold">
                  <div className="flex justify-between gap-2">
                    <span>Proof root</span>
                    <span className="text-green-700">{shortHash(proof.storage.rootHash)}</span>
                  </div>
                  {proof.storage.explorerUrl && (
                    <div className="flex justify-between gap-2 mt-1">
                      <span>Explorer</span>
                      <a href={proof.storage.explorerUrl} target="_blank" rel="noreferrer" className="text-[var(--color-primary-500)] underline">
                        Open tx
                      </a>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Activity Feed */}
      {activeTab === "activity" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2"
        >
          {[
            { action: "Checked in", event: "Web3 Summit 2026", time: "Today, 9:15 AM", emoji: "📍" },
            { action: "Attended Keynote", event: "Web3 Summit 2026", time: "Today, 10:00 AM", emoji: "🎤" },
            { action: "Earned Badge", event: "Brain Power", time: "Today, 11:30 AM", emoji: "🧠" },
            { action: "Completed Mission", event: "Visit Polygon Booth", time: "Yesterday", emoji: "✅" },
            { action: "Joined Event", event: "Creator Economy Meetup", time: "Apr 20, 2026", emoji: "🎫" },
            { action: "Won Prize", event: "ETH Hackathon Lagos", time: "Mar 17, 2026", emoji: "🏆" },
            { action: "Submitted Project", event: "ETH Hackathon Lagos", time: "Mar 17, 2026", emoji: "🏗️" },
            { action: "Helped a Team", event: "ETH Hackathon Lagos", time: "Mar 16, 2026", emoji: "🤝" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.04 }}
              className="rounded-2xl border-2 border-[var(--color-primary-900)] p-3 bg-white flex items-center gap-3"
            >
              <span className="text-lg">{item.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs">{item.action}</p>
                <p className="text-[10px] font-bold opacity-50 truncate">{item.event}</p>
              </div>
              <span className="text-[10px] font-bold opacity-40 shrink-0">{item.time}</span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
