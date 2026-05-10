"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";
import { getLevelForXp, type LeaderboardEntry } from "@/lib/mock-data";

const PODIUM_COLORS = [
  "var(--color-pastel-yellow)",
  "var(--color-pastel-blue)",
  "var(--color-pastel-pink)",
];

const PODIUM_LABELS = ["#1", "#2", "#3"];

export default function LeaderboardPage() {
  const auth = useProofPlayAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard?eventId=evt_1", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { entries?: LeaderboardEntry[] }) => setEntries(data.entries ?? []))
      .catch(() => setEntries([]))
      .finally(() => setIsLoading(false));
  }, []);

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);
  const currentEntry = useMemo(() => {
    if (!auth.userId) return undefined;
    return entries.find((entry) => entry.userId.toLowerCase() === auth.userId?.toLowerCase());
  }, [auth.userId, entries]);

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <Trophy size={22} /> Leaderboard
        </h1>
        <p className="text-xs font-bold opacity-60 mt-0.5">BlockNova Event - Real proof rankings</p>
      </motion.div>

      {isLoading && (
        <p className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-white p-3 text-xs font-bold opacity-70">
          Loading proof-backed rankings...
        </p>
      )}

      {!isLoading && entries.length === 0 && (
        <div className="bubbly-card bg-white p-5 text-center">
          <p className="font-display text-lg font-bold">No completed missions yet</p>
          <p className="mt-1 text-xs font-bold opacity-60">
            The leaderboard fills from real 0G proof records after signed-in users complete missions.
          </p>
        </div>
      )}

      {topThree.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-end justify-center gap-3 pt-4"
        >
          {topThree[1] && <PodiumCard entry={topThree[1]} rank={2} height="h-28" delay={0.3} />}
          {topThree[0] && <PodiumCard entry={topThree[0]} rank={1} height="h-36" delay={0.2} />}
          {topThree[2] && <PodiumCard entry={topThree[2]} rank={3} height="h-24" delay={0.4} />}
        </motion.div>
      )}

      {auth.authenticated && currentEntry && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bubbly-card p-3 bg-[var(--color-pastel-purple)] flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white bubbly-border flex items-center justify-center text-lg">
              {currentEntry.avatar}
            </div>
            <div>
              <p className="font-bold text-sm">You - {currentEntry.name}</p>
              <p className="text-xs font-bold opacity-70">
                Level {currentEntry.level} - {getLevelForXp(currentEntry.xp).title}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display font-bold text-lg">#{currentEntry.rank}</p>
            <p className="text-xs font-bold opacity-70">{currentEntry.xp.toLocaleString()} XP</p>
          </div>
        </motion.div>
      )}

      {auth.authenticated && !currentEntry && !isLoading && entries.length > 0 && (
        <p className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-white p-3 text-xs font-bold opacity-70">
          Complete a mission to enter the live ranking.
        </p>
      )}

      <div className="space-y-1.5">
        {rest.map((entry, index) => {
          const isCurrentUser = entry.userId.toLowerCase() === auth.userId?.toLowerCase();

          return (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.04 }}
              className={`rounded-2xl border-2 border-[var(--color-primary-900)] p-3 flex items-center justify-between transition-all ${
                isCurrentUser ? "bg-[var(--color-pastel-purple)]/30 border-[var(--color-primary-500)]" : "bg-white"
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
                  <p className={`font-bold text-sm ${isCurrentUser ? "text-[var(--color-primary-700)]" : ""}`}>
                    {entry.name} {isCurrentUser && "(You)"}
                  </p>
                  <p className="text-[10px] font-bold opacity-50">
                    Lv.{entry.level} - {entry.missionsCompleted} missions
                  </p>
                </div>
              </div>
              <span className="font-bold text-sm">{entry.xp.toLocaleString()} XP</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function PodiumCard({
  entry,
  rank,
  height,
  delay,
}: {
  entry: LeaderboardEntry;
  rank: number;
  height: string;
  delay: number;
}) {
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
        <span className="absolute -bottom-1 -right-1 rounded-full border-2 border-[var(--color-primary-900)] bg-white px-1 text-[10px] font-bold">
          {PODIUM_LABELS[rank - 1]}
        </span>
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
