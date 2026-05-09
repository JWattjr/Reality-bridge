"use client";

import { motion } from "framer-motion";
import { LEADERBOARD, CURRENT_USER, getLevelForXp } from "@/lib/mock-data";

const PODIUM_COLORS = [
  "var(--color-pastel-yellow)", // 1st
  "var(--color-pastel-blue)",   // 2nd
  "var(--color-pastel-pink)",   // 3rd
];

const PODIUM_LABELS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const topThree = LEADERBOARD.slice(0, 3);
  const rest = LEADERBOARD.slice(3);

  return (
    <div className="space-y-5">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-xl font-bold">🏆 Leaderboard</h1>
        <p className="text-xs font-bold opacity-60 mt-0.5">BlockNova Event - Live Rankings</p>
      </motion.div>

      {/* Podium */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-end justify-center gap-3 pt-4"
      >
        {/* 2nd place */}
        <PodiumCard entry={topThree[1]} rank={2} height="h-28" delay={0.3} />
        {/* 1st place */}
        <PodiumCard entry={topThree[0]} rank={1} height="h-36" delay={0.2} />
        {/* 3rd place */}
        <PodiumCard entry={topThree[2]} rank={3} height="h-24" delay={0.4} />
      </motion.div>

      {/* Your Rank */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="bubbly-card p-3 bg-[var(--color-pastel-purple)] flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white bubbly-border flex items-center justify-center text-lg">
            {CURRENT_USER.avatar}
          </div>
          <div>
            <p className="font-bold text-sm">You — {CURRENT_USER.name}</p>
            <p className="text-xs font-bold opacity-70">Level {getLevelForXp(CURRENT_USER.totalXp).level} • {getLevelForXp(CURRENT_USER.totalXp).title}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display font-bold text-lg">#4</p>
          <p className="text-xs font-bold opacity-70">{CURRENT_USER.totalXp} XP</p>
        </div>
      </motion.div>

      {/* Rest of Leaderboard */}
      <div className="space-y-1.5">
        {rest.map((entry, i) => (
          <motion.div
            key={entry.userId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.04 }}
            className={`rounded-2xl border-2 border-[var(--color-primary-900)] p-3 flex items-center justify-between transition-all ${
              entry.userId === CURRENT_USER.id
                ? "bg-[var(--color-pastel-purple)]/30 border-[var(--color-primary-500)]"
                : "bg-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="font-display font-bold text-sm w-6 text-center opacity-60">
                {entry.rank}
              </span>
              <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-[var(--color-primary-900)] flex items-center justify-center text-sm">
                {entry.avatar}
              </div>
              <div>
                <p className={`font-bold text-sm ${entry.userId === CURRENT_USER.id ? "text-[var(--color-primary-700)]" : ""}`}>
                  {entry.name} {entry.userId === CURRENT_USER.id && "(You)"}
                </p>
                <p className="text-[10px] font-bold opacity-50">
                  Lv.{entry.level} • {entry.missionsCompleted} missions
                </p>
              </div>
            </div>
            <span className="font-bold text-sm">{entry.xp.toLocaleString()} XP</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PodiumCard({ entry, rank, height, delay }: { entry: typeof LEADERBOARD[0]; rank: number; height: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", bounce: 0.4 }}
      className="flex flex-col items-center w-24"
    >
      <div className="relative mb-2">
        <div className="w-14 h-14 rounded-full border-3 border-[var(--color-primary-900)] flex items-center justify-center text-2xl bg-white shadow-[2px_2px_0px_0px_#312e81]">
          {entry.avatar}
        </div>
        <span className="absolute -bottom-1 -right-1 text-lg">{PODIUM_LABELS[rank - 1]}</span>
      </div>
      <p className="font-bold text-xs text-center truncate w-full">{entry.name.split(" ")[0]}</p>
      <p className="text-[10px] font-bold opacity-60">{entry.xp.toLocaleString()} XP</p>
      <div
        className={`w-full ${height} mt-2 rounded-t-2xl border-2 border-[var(--color-primary-900)] flex items-center justify-center`}
        style={{ backgroundColor: PODIUM_COLORS[rank - 1] }}
      >
        <span className="font-display font-bold text-2xl">#{rank}</span>
      </div>
    </motion.div>
  );
}
