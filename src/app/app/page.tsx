"use client";

import Link from "next/link";
import { ArrowRight, Gem, Search, ShieldCheck, Trophy, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { FOOTBALL_GAMES, formatMatchTime, formatUSDT, getMarketsForGame, statusLabel } from "@/lib/football-data";

export default function AppDashboard() {
  const [query, setQuery] = useState("");
  const games = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return FOOTBALL_GAMES;
    return FOOTBALL_GAMES.filter((game) =>
      `${game.teamA} ${game.teamB} ${game.title} ${game.competition}`.toLowerCase().includes(normalized),
    );
  }, [query]);

  return (
    <div className="space-y-5">
      <section className="bubbly-card overflow-hidden bg-white">
        <div
          className="bg-cover bg-center p-5 text-white"
          style={{ backgroundImage: `linear-gradient(100deg, rgba(0,0,0,.72), rgba(0,0,0,.25)), url(${FOOTBALL_GAMES[0].image})` }}
        >
          <div className="max-w-xl py-8">
            <p className="inline-flex rounded-full border border-white/70 bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
              ProofPlay X Cup
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-none sm:text-5xl">Back Your Picks</h1>
            <p className="mt-3 text-sm font-bold opacity-85">
              Official football markets only. Every correct prediction gives exactly 1 point toward the match leaderboard.
            </p>
            <div className="mt-5 grid max-w-lg grid-cols-3 gap-2 text-center text-[10px] font-bold sm:text-xs">
              <div className="rounded-2xl border border-white/60 bg-white/15 p-2 backdrop-blur">USDT-backed</div>
              <div className="rounded-2xl border border-white/60 bg-white/15 p-2 backdrop-blur">1 point per correct pick</div>
              <div className="rounded-2xl border border-white/60 bg-white/15 p-2 backdrop-blur">Auto PvP battles</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<Trophy size={18} />} label="Open games" value={FOOTBALL_GAMES.filter((game) => game.status === "OPEN").length.toString()} />
        <StatCard icon={<ShieldCheck size={18} />} label="Total pool" value={formatUSDT(FOOTBALL_GAMES.reduce((sum, game) => sum + game.totalPool, 0))} />
        <StatCard icon={<Gem size={18} />} label="Reward games" value={FOOTBALL_GAMES.filter((game) => game.rewardMode !== "NONE").length.toString()} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Football Game Events</h2>
            <p className="text-xs font-bold opacity-60">Pick match, back predictions, follow the leaderboard.</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border-2 border-[var(--color-primary-900)] bg-white px-3 py-2 sm:w-72">
            <Search size={16} className="opacity-50" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search teams"
              className="min-w-0 flex-1 bg-transparent text-xs font-bold outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {games.map((game) => {
            const markets = getMarketsForGame(game.id);
            const openMarkets = markets.filter((market) => market.status === "OPEN").length;

            return (
              <article key={game.id} className="bubbly-card overflow-hidden bg-white">
                <div className="h-36 bg-cover bg-center" style={{ backgroundImage: `url(${game.image})` }} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-50">{game.competition}</p>
                      <h3 className="font-display text-2xl font-bold">{game.teamA} vs {game.teamB}</h3>
                    </div>
                    <span className="rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-yellow)] px-2 py-1 text-[10px] font-bold">
                      {statusLabel(game.status)}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold">
                    <InfoTile label="Match time" value={formatMatchTime(game.matchStartTime)} />
                    <InfoTile label="Markets" value={`${markets.length} total`} />
                    <InfoTile label="Open" value={`${openMarkets} markets`} />
                    <InfoTile label="Pool" value={formatUSDT(game.totalPool)} />
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[10px] font-bold opacity-70">
                    <Users size={13} />
                    <span>Match and PvP leaderboards</span>
                    {game.rewardMode !== "NONE" && <span className="ml-auto">NFT reward</span>}
                  </div>

                  <Link
                    href={`/app/event/${game.id}`}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-4 py-2.5 text-sm font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
                  >
                    {game.status === "OPEN" ? "Back Picks" : "Enter Game"} <ArrowRight size={15} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bubbly-card bg-white p-4">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)]">
        {icon}
      </div>
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="text-xs font-bold opacity-60">{label}</p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] p-2">
      <p className="text-[9px] font-bold uppercase opacity-50">{label}</p>
      <p className="truncate text-xs font-bold">{value}</p>
    </div>
  );
}
