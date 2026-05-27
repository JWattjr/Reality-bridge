"use client";

import Link from "next/link";
import { Swords, Trophy } from "lucide-react";
import {
  FOOTBALL_GAMES,
  formatMatchTime,
  getPlayerLeaderboard,
  getPvPLeaderboard,
} from "@/lib/football-data";

export default function LeaderboardPage() {
  const pvpLeaders = getPvPLeaderboard();

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold">Leaderboards</h1>
        <p className="text-sm font-bold opacity-60">World Cup PvP points stack across matches. Each game also has a match leaderboard.</p>
      </div>

      <section className="bubbly-card bg-[var(--color-pastel-green)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Swords size={18} />
          <h2 className="font-display text-2xl font-bold">World Cup PvP Leaderboard</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs font-bold">
            <thead className="opacity-55">
              <tr>
                <th className="py-2 pr-3">Rank</th>
                <th className="py-2 pr-3">Player</th>
                <th className="py-2 pr-3">PvP points</th>
                <th className="py-2 pr-3">Tier</th>
                <th className="py-2 pr-3">Wins / Draws / Losses</th>
              </tr>
            </thead>
            <tbody>
              {pvpLeaders.map((entry) => (
                <tr key={entry.userId} className="border-t-2 border-[var(--color-primary-900)]/15">
                  <td className="py-3 pr-3">#{entry.rank}</td>
                  <td className="py-3 pr-3">{entry.player}</td>
                  <td className="py-3 pr-3">{entry.totalPvPPoints.toLocaleString()}</td>
                  <td className="py-3 pr-3">{entry.rankTitle}</td>
                  <td className="py-3 pr-3">{entry.wins} / {entry.draws} / {entry.losses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[10px] font-bold opacity-65">
          Automatic PvP only: back at least 1 USDT pick, get paired at match start, compare correct-pick hits after resolution.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        {FOOTBALL_GAMES.map((game) => {
          const players = getPlayerLeaderboard(game.id);

          return (
            <article key={game.id} className="bubbly-card bg-white p-4">
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase opacity-50">{formatMatchTime(game.matchStartTime)}</p>
                <h2 className="font-display text-2xl font-bold">{game.title}</h2>
              </div>

              <section>
                <div className="mb-2 flex items-center gap-2">
                  <Trophy size={16} />
                  <h3 className="font-bold">Match Leaderboard</h3>
                </div>
                <div className="space-y-2">
                  {players.slice(0, 5).map((entry) => (
                    <div key={entry.userId} className="flex items-center justify-between rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] px-3 py-2 text-xs font-bold">
                      <span className="truncate">#{entry.rank} {entry.player}</span>
                      <span>{entry.points} pts</span>
                    </div>
                  ))}
                  {players.length === 0 && <p className="text-xs font-bold opacity-60">No resolved picks yet.</p>}
                </div>
              </section>

              <Link
                href={`/app/event/${game.id}`}
                className="mt-4 inline-flex w-full justify-center rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
              >
                Open Game
              </Link>
            </article>
          );
        })}
      </div>

      <div className="bubbly-card bg-white p-4 text-xs font-bold opacity-75">
        Ranking rule: players sort by points descending. Ties sort by total winnings, then earliest final prediction.
      </div>
    </div>
  );
}
