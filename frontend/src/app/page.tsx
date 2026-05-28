"use client";

import Link from "next/link";
import { ArrowRight, Gem, ShieldCheck, Trophy } from "lucide-react";
import Navbar from "@/components/Navbar";
import DottedGlobe from "@/components/DottedGlobe";
import { formatMatchTime, formatUSDT, statusLabel } from "@/lib/football-data";
import { useGames } from "@/hooks/useApi";

export default function Home() {
  const { data: games = [] } = useGames();
  const displayGames = games;
  const featuredGame = displayGames[0];

  return (
    <main className="min-h-screen bg-bg-base">
      <Navbar />

      <section className="relative isolate min-h-[92svh] overflow-hidden px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <DottedGlobe />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-44 bg-gradient-to-t from-bg-base to-transparent" />
        <div className="mx-auto grid min-h-[calc(92svh-7rem)] max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-5 text-center lg:text-left">
            <p className="inline-flex rounded-full border-2 border-primary-900 bg-white/85 px-3 py-1 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] backdrop-blur">
              ProofPlay X Cup
            </p>
            <div>
              <h1
                className="font-display text-[clamp(3rem,13vw,7.6rem)] font-bold leading-[0.86] text-primary-900"
                style={{
                  textShadow:
                    "3px 3px 0px #fff, -1.5px -1.5px 0px #fff, 1.5px -1.5px 0px #fff, -1.5px 1.5px 0px #fff",
                  WebkitTextStroke: "1px var(--color-primary-900)",
                }}
              >
                <span className="block">BACK YOUR</span>
                <span className="block text-pastel-purple">PICKS</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base font-bold leading-relaxed opacity-75 sm:text-lg lg:mx-0">
                Back official match picks in a minimal USDT-backed football prediction game. Every correct pick scores exactly 1 point.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded-full border-2 border-primary-900 bg-pastel-green px-5 py-3 text-sm font-bold shadow-[3px_3px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
              >
                Place Bets <ArrowRight size={16} />
              </Link>
              <Link
                href="/app/leaderboard"
                className="inline-flex items-center gap-2 rounded-full border-2 border-primary-900 bg-white/90 px-5 py-3 text-sm font-bold shadow-[3px_3px_0px_0px_#312e81] backdrop-blur transition-all hover:translate-y-0.5 hover:shadow-none"
              >
                View Leaderboards
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] font-bold opacity-70 lg:justify-start">
              <span>USDT-backed</span>
              <span>1 point per correct pick</span>
              <span>Auto PvP battles</span>
            </div>
          </div>

          {featuredGame ? (
            <div className="bubbly-card overflow-hidden bg-white">
              <div
                className="min-h-72 bg-cover bg-center p-5 text-white"
                style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.28), rgba(0,0,0,.68)), url(${featuredGame.image})` }}
              >
                <div className="flex h-full min-h-60 flex-col justify-between">
                  <div className="flex justify-between gap-3">
                    <span className="rounded-full border border-white/70 bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                      Featured Match
                    </span>
                    <span className="rounded-full border border-white/70 bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                      {statusLabel(featuredGame.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold opacity-80">{featuredGame.competition}</p>
                    <h2 className="font-display text-4xl font-bold">{featuredGame.title}</h2>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                      <div className="rounded-2xl border border-white/60 bg-white/15 p-2 backdrop-blur">
                        {featuredGame.marketCount ?? 0} markets
                      </div>
                      <div className="rounded-2xl border border-white/60 bg-white/15 p-2 backdrop-blur">
                        {formatUSDT(featuredGame.totalPool)}
                      </div>
                      <div className="rounded-2xl border border-white/60 bg-white/15 p-2 backdrop-blur">
                        NFT rewards
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bubbly-card bg-white p-6 text-center text-xs font-bold opacity-60">
              No active games found.
            </div>
          )}
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl font-bold">Football Game Events</h2>
              <p className="text-sm font-bold opacity-60">One match. Official markets. One player board. Auto PvP.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {displayGames.map((game) => (
              <article key={game.id} className="bubbly-card overflow-hidden bg-white">
                <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${game.image})` }} />
                <div className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-50">{game.competition}</p>
                      <h3 className="font-display text-2xl font-bold">{game.title}</h3>
                    </div>
                    <span className="rounded-full border-2 border-primary-900 bg-pastel-blue px-2 py-1 text-[10px] font-bold">
                      {statusLabel(game.status)}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs font-bold opacity-70">
                    <p>{formatMatchTime(game.matchStartTime)}</p>
                    <p>{game.marketCount ?? 0} markets</p>
                    <p>{formatUSDT(game.totalPool)} pool</p>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[10px] font-bold">
                    <ShieldCheck size={13} />
                    <span>USDT required</span>
                    {game.rewardMode !== "NONE" && (
                      <>
                        <Gem size={13} />
                        <span>NFT reward</span>
                      </>
                    )}
                  </div>
                  <Link
                    href={`/app/event/${game.id}`}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary-900 bg-pastel-green px-4 py-2.5 text-sm font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
                  >
                    {game.status === "OPEN" ? "Place Bet" : "Enter Game"} <ArrowRight size={15} />
                  </Link>
                </div>
              </article>
            ))}
            {displayGames.length === 0 && (
              <div className="col-span-full py-12 text-center text-sm font-bold opacity-60">
                No game events scheduled at this time.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-3">
          {[
            ["Place bets", "Choose an official admin-created market and stake USDT."],
            ["Score points", "Every correct prediction gives exactly 1 point."],
            ["Win rewards", "Winners share pools and selected matches include NFT rewards."],
          ].map(([title, copy], index) => (
            <div key={title} className="bubbly-card bg-white p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-primary-900 bg-pastel-yellow font-bold">
                {index + 1}
              </div>
              <p className="font-display text-xl font-bold">{title}</p>
              <p className="mt-1 text-xs font-bold opacity-60">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t-4 border-primary-900 bg-white px-6 py-6 text-center text-xs font-bold opacity-70">
        <span className="inline-flex items-center gap-2">
          <Trophy size={15} /> ProofPlay X Cup - Predict football. Score points. Win rewards.
        </span>
      </footer>
    </main>
  );
}
