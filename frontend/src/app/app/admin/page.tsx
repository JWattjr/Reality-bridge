"use client";

import React, { useState, useEffect } from "react";
import {
  useGames,
  useGameMarkets,
  useGamePvPMatches,
  useAdminLogin,
  useAdminResolveMarket,
  useAdminPairPvP,
  useAdminResolvePvP,
} from "@/hooks/useApi";
import {
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  LogOut,
  Sparkles,
  Swords,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
} from "lucide-react";
import { formatUSDT, formatMatchTime } from "@/lib/football-data";

export default function AdminDashboardPage() {
  const [adminAuth, setAdminAuth] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load auth from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const storedAuth = localStorage.getItem("proofplay_admin_auth");
    if (storedAuth) {
      setAdminAuth(storedAuth);
    }
  }, []);

  const loginMutation = useAdminLogin();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const authHeader = "Basic " + btoa(`${username}:${password}`);

    try {
      await loginMutation.mutateAsync({ authHeader });
      setAdminAuth(authHeader);
      localStorage.setItem("proofplay_admin_auth", authHeader);
    } catch (error: any) {
      setLoginError(error.response?.data?.message || "Invalid username or password");
    }
  };

  const handleLogout = () => {
    setAdminAuth(null);
    localStorage.removeItem("proofplay_admin_auth");
    setUsername("");
    setPassword("");
  };

  if (!mounted) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-900" />
      </div>
    );
  }

  if (!adminAuth) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-8">
        <div className="bubbly-card w-full max-w-md bg-white p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-3 border-primary-900 bg-pastel-purple shadow-[2px_2px_0px_0px_#312e81]">
              <Lock className="text-primary-900" size={24} />
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-primary-900">
              Admin Control Panel
            </h1>
            <p className="mt-2 text-xs font-bold text-primary-900/60 uppercase tracking-wider">
              ProofPlay Settlement Room
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            {loginError && (
              <div className="flex items-center gap-2 rounded-2xl border-2 border-red-500 bg-red-50 p-3 text-xs font-bold text-red-700">
                <AlertCircle size={16} className="shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-primary-900 uppercase">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-2xl border-2 border-primary-900 bg-bg-base px-4 py-2.5 text-sm font-bold text-primary-900 outline-none focus:bg-white"
                required
                placeholder="Enter admin username"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-primary-900 uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-2xl border-2 border-primary-900 bg-bg-base px-4 py-2.5 text-sm font-bold text-primary-900 outline-none focus:bg-white"
                required
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary-900 bg-pastel-purple py-3 text-sm font-bold shadow-[3px_3px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none disabled:opacity-50"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Access Console</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <AdminConsole authHeader={adminAuth} onLogout={handleLogout} />;
}

function AdminConsole({ authHeader, onLogout }: { authHeader: string; onLogout: () => void }) {
  const { data: games = [], isLoading: isLoadingGames } = useGames();
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const toggleExpand = (gameId: string) => {
    setExpandedGameId(expandedGameId === gameId ? null : gameId);
  };

  const triggerToast = (message: string, isError = false) => {
    if (isError) {
      setErrorToast(message);
      setTimeout(() => setErrorToast(null), 5000);
    } else {
      setSuccessToast(message);
      setTimeout(() => setSuccessToast(null), 5000);
    }
  };

  if (isLoadingGames) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary-900" />
          <span className="text-sm font-bold opacity-60">Loading match data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {successToast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-2xl border-2 border-primary-900 bg-pastel-green p-4 text-xs font-bold shadow-[4px_4px_0px_0px_#312e81] animate-bounce">
          <CheckCircle2 size={18} className="text-primary-900" />
          <span>{successToast}</span>
        </div>
      )}

      {errorToast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-2xl border-2 border-primary-900 bg-pastel-pink p-4 text-xs font-bold shadow-[4px_4px_0px_0px_#312e81]">
          <AlertCircle size={18} className="text-red-700" />
          <span className="text-red-700">{errorToast}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Sparkles className="text-primary-900 fill-pastel-yellow" size={28} />
            <span>Admin Control Room</span>
          </h1>
          <p className="text-xs font-bold opacity-60">
            Resolve prediction markets, run matchmaking pairings, and finalize leaderboard points.
          </p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center justify-center gap-1.5 rounded-full border-2 border-primary-900 bg-white px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
        >
          <LogOut size={14} />
          <span>Exit Console</span>
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="bubbly-card bg-white p-4">
          <p className="font-display text-3xl font-bold">{games.length}</p>
          <p className="text-[10px] font-bold uppercase opacity-55">Total Games</p>
        </div>
        <div className="bubbly-card bg-white p-4">
          <p className="font-display text-3xl font-bold">
            {games.filter((g) => g.status === "OPEN").length}
          </p>
          <p className="text-[10px] font-bold uppercase opacity-55">Open Markets</p>
        </div>
        <div className="bubbly-card bg-white p-4">
          <p className="font-display text-3xl font-bold">
            {games.filter((g) => g.status === "LIVE").length}
          </p>
          <p className="text-[10px] font-bold uppercase opacity-55">Live Matches</p>
        </div>
        <div className="bubbly-card bg-white p-4">
          <p className="font-display text-3xl font-bold">
            {formatUSDT(games.reduce((acc, g) => acc + (g.totalPool || 0), 0))}
          </p>
          <p className="text-[10px] font-bold uppercase opacity-55">Total Vault Pool</p>
        </div>
      </div>

      {/* Matches Management */}
      <div className="space-y-4">
        <h2 className="font-display text-2xl font-bold">Football Game Listings</h2>
        <div className="space-y-4">
          {games.map((game: any) => {
            const isExpanded = expandedGameId === game.id;
            return (
              <div key={game.id} className="bubbly-card overflow-hidden bg-white">
                {/* Expandable game bar */}
                <div
                  onClick={() => toggleExpand(game.id)}
                  className="flex cursor-pointer items-center justify-between gap-4 p-4 hover:bg-bg-base/40 transition-colors select-none"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      src={game.image}
                      alt={game.title}
                      className="h-12 w-12 rounded-xl object-cover border-2 border-primary-900 shadow-[1px_1px_0px_0px_#312e81]"
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase opacity-55">
                        {game.competition} • {formatMatchTime(game.matchStartTime)}
                      </p>
                      <h3 className="font-display text-xl font-bold truncate">
                        {game.teamA} vs {game.teamB}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="rounded-full border-2 border-primary-900 bg-pastel-yellow px-2 py-0.5 text-[10px] font-bold">
                      {game.status}
                    </span>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold">{formatUSDT(game.totalPool || 0)}</p>
                      <p className="text-[9px] font-bold opacity-50">Total Pool</p>
                    </div>
                    <div>{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
                  </div>
                </div>

                {/* Expanded control panel for the game */}
                {isExpanded && (
                  <div className="border-t-3 border-primary-900 bg-bg-base/20 p-4 space-y-4">
                    {/* PvP Section */}
                    <PvPControls game={game} onToast={triggerToast} authHeader={authHeader} />

                    {/* Markets Section */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-primary-900/60">
                        Prediction Markets
                      </h4>
                      <GameMarketsList game={game} authHeader={authHeader} onToast={triggerToast} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PvPControls({
  game,
  onToast,
  authHeader,
}: {
  game: any;
  onToast: (msg: string, isError?: boolean) => void;
  authHeader: string;
}) {
  const { data: matches = [], isLoading } = useGamePvPMatches(game.id);

  const pairMutation = useAdminPairPvP();
  const resolveMutation = useAdminResolvePvP();

  const handlePair = async () => {
    if (!confirm("Are you sure you want to pair PvP players for this match? This can only be done once predictions close.")) {
      return;
    }
    try {
      const res = await pairMutation.mutateAsync({ authHeader, gameId: game.id });
      if (res.success) {
        onToast(`Successfully paired ${res.matchesCreated} PvP matches!`);
      } else {
        onToast(res.message || "Pairing not completed.", true);
      }
    } catch (error: any) {
      onToast(error.response?.data?.message || error.message || "Failed to pair PvP", true);
    }
  };

  const handleResolve = async () => {
    if (!confirm("Are you sure you want to resolve PvP matches? Make sure you have resolved all game markets first so player prediction hits are complete.")) {
      return;
    }
    try {
      const res = await resolveMutation.mutateAsync({ authHeader, gameId: game.id });
      if (res.success) {
        onToast(`Successfully resolved ${res.matchesResolved} PvP matches!`);
      } else {
        onToast(res.message || "No unresolved PvP matches found.", true);
      }
    } catch (error: any) {
      onToast(error.response?.data?.message || error.message || "Failed to resolve PvP", true);
    }
  };

  const resolvedCount = matches.filter((m) => m.status === "RESOLVED").length;
  const unresolvedCount = matches.filter((m) => m.status !== "RESOLVED").length;

  return (
    <div className="bubbly-card bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-primary-900 bg-pastel-pink shadow-[1px_1px_0px_0px_#312e81]">
            <Swords size={16} />
          </div>
          <div>
            <h4 className="text-sm font-bold">PvP Matchmaking Control</h4>
            <p className="text-[10px] opacity-60">
              {isLoading ? (
                <span>Loading PvP pairings...</span>
              ) : matches.length === 0 ? (
                <span>No PvP matches created yet.</span>
              ) : (
                <span>
                  {matches.length} PvP Battles ({resolvedCount} resolved, {unresolvedCount} pending)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePair}
            disabled={pairMutation.isPending || matches.length > 0}
            className="flex items-center gap-1.5 rounded-full border-2 border-primary-900 bg-pastel-blue px-3 py-1.5 text-[11px] font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 disabled:translate-y-0 disabled:shadow-[2px_2px_0px_0px_#312e81]"
          >
            {pairMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
            <span>Pair Players</span>
          </button>
          <button
            onClick={handleResolve}
            disabled={resolveMutation.isPending || unresolvedCount === 0}
            className="flex items-center gap-1.5 rounded-full border-2 border-primary-900 bg-pastel-green px-3 py-1.5 text-[11px] font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 disabled:translate-y-0 disabled:shadow-[2px_2px_0px_0px_#312e81]"
          >
            {resolveMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
            <span>Resolve PvP</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function GameMarketsList({
  game,
  authHeader,
  onToast,
}: {
  game: any;
  authHeader: string;
  onToast: (msg: string, isError?: boolean) => void;
}) {
  const { data: markets = [], isLoading } = useGameMarkets(game.id);
  const [resolvingMarket, setResolvingMarket] = useState<any | null>(null);
  const [selectedWinnerIndex, setSelectedWinnerIndex] = useState<number | null>(null);

  const resolveMarketMutation = useAdminResolveMarket();

  const handleOpenResolveModal = (market: any) => {
    setResolvingMarket(market);
    setSelectedWinnerIndex(null);
  };

  const handleResolveMarketSubmit = async () => {
    if (selectedWinnerIndex === null || !resolvingMarket) return;

    try {
      const result = await resolveMarketMutation.mutateAsync({
        authHeader,
        marketId: resolvingMarket.id,
        winningOptionIndex: selectedWinnerIndex,
      });

      if (result.success) {
        onToast(
          `Market resolved! Tx: ${result.txHash ? result.txHash.slice(0, 10) + "..." : "Local-only"}`
        );
        setResolvingMarket(null);
      }
    } catch (error: any) {
      onToast(error.response?.data?.message || error.message || "Failed to resolve market", true);
    }
  };

  if (isLoading) {
    return <div className="text-center py-4 text-xs font-bold opacity-50">Loading markets...</div>;
  }

  if (markets.length === 0) {
    return <div className="text-center py-4 text-xs font-bold opacity-50">No markets found for this game.</div>;
  }

  return (
    <div className="space-y-3">
      {markets.map((market: any) => {
        const isResolved = market.status === "RESOLVED";
        return (
          <div
            key={market.id}
            className="flex flex-col gap-3 rounded-2xl border-2 border-primary-900 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary-900/60 uppercase">
                  Market #{market.chainMarketId}
                </span>
                <span
                  className={`rounded-full border border-primary-900 px-2 py-0.5 text-[9px] font-bold ${
                    isResolved ? "bg-pastel-green" : "bg-pastel-yellow"
                  }`}
                >
                  {market.status}
                </span>
              </div>
              <h5 className="font-display text-lg font-bold">{market.title}</h5>
              <div className="flex flex-wrap gap-2 pt-1">
                {market.options.map((opt: any, idx: number) => {
                  const isWinner = isResolved && market.winningOptionId === opt.id;
                  return (
                    <span
                      key={opt.id}
                      className={`rounded-xl border-2 border-primary-900 px-2 py-1 text-xs font-bold ${
                        isWinner ? "bg-pastel-green" : "bg-bg-base opacity-75"
                      }`}
                    >
                      {opt.label} {isWinner && "🏆"}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-end">
              {!isResolved ? (
                <button
                  onClick={() => handleOpenResolveModal(market)}
                  className="rounded-full border-2 border-primary-900 bg-pastel-yellow px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
                >
                  Resolve Market
                </button>
              ) : (
                <div className="flex flex-col items-end text-xs font-bold text-pastel-green bg-primary-900 rounded-2xl p-2 px-3 border-2 border-primary-900">
                  <span className="uppercase text-[9px] opacity-70">Winning Pick</span>
                  <span>{market.options.find((o: any) => o.id === market.winningOptionId)?.label}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Resolution Modal */}
      {resolvingMarket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bubbly-card w-full max-w-md bg-white p-6 relative">
            <h3 className="font-display text-2xl font-bold pr-6">Resolve Market</h3>
            <p className="text-xs font-bold opacity-60 mt-1">{resolvingMarket.title}</p>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold text-primary-900 uppercase">Select Winning Option</p>
              <div className="space-y-2">
                {resolvingMarket.options.map((opt: any, idx: number) => (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border-2 border-primary-900 p-3 text-sm font-bold transition-all hover:bg-bg-base/40 ${
                      selectedWinnerIndex === idx ? "bg-pastel-blue" : "bg-white"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <input
                      type="radio"
                      name="winningOption"
                      checked={selectedWinnerIndex === idx}
                      onChange={() => setSelectedWinnerIndex(idx)}
                      className="h-4 w-4 border-2 border-primary-900 accent-primary-900"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Warning card */}
            <div className="mt-4 flex gap-2 rounded-2xl border-2 border-primary-900 bg-pastel-pink/40 p-3 text-xs font-bold text-primary-900">
              <ShieldAlert size={18} className="shrink-0 mt-0.5 text-primary-900" />
              <div>
                <p className="font-bold">Irreversible Action</p>
                <p className="font-medium opacity-85 mt-0.5">
                  This will resolve the contract on-chain and trigger auto-PvP matchmaking/resolution.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setResolvingMarket(null)}
                disabled={resolveMarketMutation.isPending}
                className="rounded-full border-2 border-primary-900 bg-white px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveMarketSubmit}
                disabled={selectedWinnerIndex === null || resolveMarketMutation.isPending}
                className="flex items-center gap-1.5 rounded-full border-2 border-primary-900 bg-pastel-green px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none disabled:opacity-50"
              >
                {resolveMarketMutation.isPending ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Resolving On-Chain...</span>
                  </>
                ) : (
                  <span>Submit Resolution</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
