"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, Clock, Gem, MousePointerClick, ShieldCheck, Trophy } from "lucide-react";
import { PredictionModal } from "@/components/PredictionModal";
import { PvPMatchCard } from "@/components/PvPMatchCard";
import { useAuthStore } from "@/store/useAuthStore";
import { useUserPredictions, useGameDetails, useGameMarkets, useMatchLeaderboard, useGameNFTRewards } from "@/hooks/useApi";
import {
  type FootballMarket,
  formatMatchTime,
  formatUSDT,
  statusLabel,
} from "@/lib/football-data";

export default function GameEventPage() {
  const params = useParams();
  const gameId = String(params.id ?? "");

  const { data: game, isLoading: isGameLoading } = useGameDetails(gameId);
  const { data: dbMarkets, isLoading: isMarketsLoading } = useGameMarkets(gameId);
  const markets = (dbMarkets ?? []) as FootballMarket[];


  const [activeMarket, setActiveMarket] = useState<FootballMarket | null>(null);

  const auth = useAuthStore();
  const { data: userDbPredictions = [] } = useUserPredictions(auth);

  const predictions = useMemo(() => {
    if (!auth.authenticated || !auth.userId) return [];
    return userDbPredictions.filter((pick: any) => pick.gameId === gameId);
  }, [userDbPredictions, gameId, auth.authenticated, auth.userId]);
  const pvpUserId = predictions[0]?.userId ?? auth.userId ?? "";
  const currentUserKeys = useMemo(() => {
    const keys = [
      auth.userId,
      auth.walletAddress,
      ...(auth.wallets ?? []).map((wallet: any) => wallet.address),
      ...predictions.flatMap((pick: any) => [pick.userId, pick.walletAddress]),
    ];

    return new Set(keys.filter(Boolean).map((key) => String(key).toLowerCase()));
  }, [auth.userId, auth.walletAddress, auth.wallets, predictions]);

  const { data: playerBoard = [] } = useMatchLeaderboard(gameId);
  const { data: rewards = [] } = useGameNFTRewards(gameId);


  if (isGameLoading || isMarketsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-900 border-t-pastel-blue" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-2xl font-bold">Game not found</p>
        <Link href="/app" className="mt-3 inline-flex text-sm font-bold text-primary-500">
          Back to games
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link href="/app" className="inline-flex items-center gap-1 text-xs font-bold opacity-60 hover:opacity-100">
        <ArrowLeft size={14} /> Back to games
      </Link>

      <section className="bubbly-card overflow-hidden bg-white">
        <div
          className="bg-cover bg-center p-5 text-white"
          style={{ backgroundImage: `linear-gradient(95deg, rgba(0,0,0,.78), rgba(0,0,0,.18)), url(${game.image})` }}
        >
          <div className="grid gap-5 py-8 lg:grid-cols-[1fr_280px] lg:items-end">
            <div>
              <p className="inline-flex rounded-full border border-white/70 bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                {game.competition}
              </p>
              <h1 className="mt-3 font-display text-5xl font-bold leading-none">{game.title}</h1>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full border border-white/70 bg-white/15 px-3 py-1 backdrop-blur">{statusLabel(game.status)}</span>
                <span className="rounded-full border border-white/70 bg-white/15 px-3 py-1 backdrop-blur">
                  <Clock size={12} className="mr-1 inline" /> {formatMatchTime(game.matchStartTime)}
                </span>
                <span className="rounded-full border border-white/70 bg-white/15 px-3 py-1 backdrop-blur">{formatUSDT(game.totalPool)} pool</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/15 p-4 text-sm font-bold backdrop-blur">
              <p className="text-xs uppercase opacity-70">Game rule</p>
              <p className="mt-1">Correct Pick = 1 match point and 1 PvP hit. Wrong Pick = 0.</p>
              <p className="mt-2 text-xs opacity-75">Stake size affects pool share only, never match or PvP points.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-5">
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold">Markets</h2>
                <p className="text-xs font-bold opacity-60">Tap a market to open the bet slip. USDT stake required for every pick.</p>
              </div>
            </div>

            <div className="grid gap-3">
              {markets.map((market) => (
                <button
                  type="button"
                  key={market.id}
                  onClick={() => setActiveMarket(market)}
                  className="bubbly-card group cursor-pointer bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-pastel-yellow/40 hover:shadow-[6px_6px_0px_0px_#312e81] focus:outline-none focus:ring-4 focus:ring-pastel-purple"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-50">{market.category} - {market.type}</p>
                      <h3 className="font-display text-xl font-bold">{market.title}</h3>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="rounded-full border-2 border-primary-900 bg-pastel-blue px-2 py-1 text-[10px] font-bold">
                        {statusLabel(market.status)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border-2 border-primary-900 bg-white px-2 py-1 text-[10px] font-bold opacity-80 group-hover:bg-pastel-green group-hover:opacity-100">
                        <MousePointerClick size={11} /> Open bet slip
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {market.options.map((option) => (
                      <span key={option.id} className="rounded-full border-2 border-primary-900 bg-bg-base px-3 py-1 text-xs font-bold group-hover:bg-white">
                        {option.label}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-bold">
                    <Info label="Min stake" value={formatUSDT(market.minStake)} />
                    <Info label="Pool" value={formatUSDT(market.totalPool)} />
                    <Info label="Closes" value={formatMatchTime(market.closeTime)} />
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="bubbly-card bg-white p-4">
            <h2 className="font-display text-2xl font-bold">My Active Predictions</h2>
            <div className="mt-3 space-y-2">
              {predictions.length ? (
                predictions.map((pick) => (
                  <div key={pick.id} className="rounded-2xl border-2 border-primary-900 bg-bg-base p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold">{markets.find((market) => market.id === pick.marketId)?.title ?? pick.marketId}</p>
                        <p className="text-[10px] font-bold opacity-60">Your Pick: {pick.optionLabel}</p>
                      </div>
                      <span className="text-xs font-bold">{formatUSDT(pick.amountUSDT)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm font-bold opacity-60">No picks backed in this game yet.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20">
          <PvPMatchCard gameId={gameId} userId={pvpUserId} predictions={predictions} markets={markets} />


          <section className="bubbly-card bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Trophy size={18} />
              <h2 className="font-display text-xl font-bold">Match Leaderboard</h2>
            </div>
            <div className="space-y-2">
              {playerBoard.map((entry) => {
                const isCurrentUser = currentUserKeys.has(String(entry.userId).toLowerCase());

                return (
                <div
                  key={entry.userId}
                  className={`rounded-2xl border-2 p-3 transition-colors ${
                    isCurrentUser
                      ? "border-primary-900 bg-pastel-green shadow-[3px_3px_0px_0px_#312e81]"
                      : "border-primary-900 bg-bg-base"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-bold">#{entry.rank} {entry.player}</p>
                        {isCurrentUser && (
                          <span className="shrink-0 rounded-full border-2 border-primary-900 bg-white px-2 py-0.5 text-[9px] font-bold uppercase">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold opacity-60">{entry.correctPicks}/{entry.totalPicks} correct picks</p>
                    </div>
                    <span className="font-display text-xl font-bold">{entry.points}</span>
                  </div>
                </div>
                );
              })}
            </div>
          </section>

          {rewards.length > 0 && (
            <section className="bubbly-card bg-pastel-yellow p-4">
              <div className="mb-3 flex items-center gap-2">
                <Gem size={18} />
                <h2 className="font-display text-xl font-bold">NFT Reward</h2>
              </div>
              <div className="space-y-2">
                {rewards.map((reward) => (
                  <div key={reward.id} className="rounded-2xl border-2 border-primary-900 bg-white/70 p-3">
                    <p className="text-sm font-bold">{reward.name}</p>
                    <p className="text-[10px] font-bold opacity-60">
                      {reward.rewardType.toLowerCase()} ranks {reward.eligibleRankStart}-{reward.eligibleRankEnd} - {statusLabel(reward.status)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bubbly-card bg-white p-4">
            <div className="flex items-start gap-2">
              <ShieldCheck size={18} className="mt-0.5" />
              <p className="text-xs font-bold opacity-70">
                Payouts use a simple pari-mutuel pool: winners share the market pool proportionally after admin resolution.
              </p>
            </div>
          </section>
        </aside>
      </div>

      <PredictionModal market={activeMarket} open={Boolean(activeMarket)} onClose={() => setActiveMarket(null)} gameId={game.id} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-primary-900 bg-bg-base p-2">
      <p className="uppercase opacity-50">{label}</p>
      <p className="truncate">{value}</p>
    </div>
  );
}
