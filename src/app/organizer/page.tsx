"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Gem, Plus, ShieldCheck, Trophy } from "lucide-react";
import { FOOTBALL_GAMES, FOOTBALL_MARKETS, formatMatchTime, formatUSDT, statusLabel } from "@/lib/football-data";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";
import {
  closeMarketOnXLayer,
  getFootballPredictionAddress,
  getTestUSDTAddress,
  isXLayerContractsConfigured,
  refundMarketOnXLayer,
  resolveMarketOnXLayer,
  xLayerExplorerAddress,
  type XLayerWallet,
} from "@/lib/xlayer";

const MARKET_TYPES = ["YES_NO", "MULTI_CHOICE"] as const;
const STATUSES = ["OPEN", "CLOSED", "LIVE", "RESOLVED", "CANCELLED"] as const;

export default function OrganizerDashboard() {
  const auth = useProofPlayAuth();
  const [gameDraft, setGameDraft] = useState({
    teamA: "",
    teamB: "",
    competition: "ProofPlay X Cup",
    matchStartTime: "",
    marketCloseTime: "",
    status: "OPEN",
    rewardMode: "NONE",
  });
  const [marketDraft, setMarketDraft] = useState({
    gameId: FOOTBALL_GAMES[0]?.id ?? "",
    title: "",
    category: "Match Result",
    type: "YES_NO",
    options: "Yes, No",
    minStake: "5",
    closeTime: "",
  });
  const [message, setMessage] = useState("");
  const [marketControl, setMarketControl] = useState({ marketId: "1", winningOption: "0" });
  const [controlStatus, setControlStatus] = useState("");
  const [controlTxUrl, setControlTxUrl] = useState("");
  const [busyAction, setBusyAction] = useState<"close" | "resolve" | "refund" | null>(null);
  const activeWallet = auth.wallets[0] as XLayerWallet | undefined;
  const configured = isXLayerContractsConfigured();

  async function runMarketAction(action: "close" | "resolve" | "refund") {
    if (!activeWallet) {
      setControlStatus("Connect the owner wallet used to deploy the prediction contract.");
      return;
    }

    setBusyAction(action);
    setControlTxUrl("");
    setControlStatus(`${action === "resolve" ? "Resolving" : action === "close" ? "Closing" : "Refunding"} market on X Layer...`);

    try {
      const result =
        action === "resolve"
          ? await resolveMarketOnXLayer(activeWallet, marketControl.marketId, marketControl.winningOption)
          : action === "close"
            ? await closeMarketOnXLayer(activeWallet, marketControl.marketId)
            : await refundMarketOnXLayer(activeWallet, marketControl.marketId);
      setControlStatus("X Layer admin transaction confirmed.");
      setControlTxUrl(result.explorerUrl);
    } catch (error) {
      setControlStatus(error instanceof Error ? error.message : "X Layer admin transaction failed.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-sm font-bold opacity-60">
          Admin-created football game events and markets only. Users cannot create public markets.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <Stat icon={<Trophy size={18} />} label="Games" value={FOOTBALL_GAMES.length.toString()} />
        <Stat icon={<ShieldCheck size={18} />} label="Markets" value={FOOTBALL_MARKETS.length.toString()} />
        <Stat icon={<Gem size={18} />} label="Reward games" value={FOOTBALL_GAMES.filter((game) => game.rewardMode !== "NONE").length.toString()} />
        <Stat icon={<CheckCircle2 size={18} />} label="Total pool" value={formatUSDT(FOOTBALL_GAMES.reduce((sum, game) => sum + game.totalPool, 0))} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="bubbly-card bg-white p-4">
          <h2 className="font-display text-2xl font-bold">Create Football Game Event</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Team A" value={gameDraft.teamA} onChange={(value) => setGameDraft((draft) => ({ ...draft, teamA: value }))} />
            <Field label="Team B" value={gameDraft.teamB} onChange={(value) => setGameDraft((draft) => ({ ...draft, teamB: value }))} />
            <Field label="Competition" value={gameDraft.competition} onChange={(value) => setGameDraft((draft) => ({ ...draft, competition: value }))} />
            <label className="block">
              <span className="text-[10px] font-bold uppercase opacity-50">Status</span>
              <select
                value={gameDraft.status}
                onChange={(event) => setGameDraft((draft) => ({ ...draft, status: event.target.value }))}
                className="mt-1 w-full rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] px-3 py-2 text-xs font-bold outline-none"
              >
                {STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <Field type="datetime-local" label="Match start" value={gameDraft.matchStartTime} onChange={(value) => setGameDraft((draft) => ({ ...draft, matchStartTime: value }))} />
            <Field type="datetime-local" label="Market close" value={gameDraft.marketCloseTime} onChange={(value) => setGameDraft((draft) => ({ ...draft, marketCloseTime: value }))} />
          </div>
          <div className="mt-3">
            <span className="text-[10px] font-bold uppercase opacity-50">NFT rewards</span>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {["NONE", "PLAYER"].map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setGameDraft((draft) => ({ ...draft, rewardMode: mode }))}
                  className={`rounded-2xl border-2 border-[var(--color-primary-900)] px-2 py-2 text-[10px] font-bold ${
                    gameDraft.rewardMode === mode ? "bg-[var(--color-pastel-green)]" : "bg-[var(--color-bg-base)]"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMessage("Preview only: next step will persist createGameEvent to Supabase or contract admin action.")}
            className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81]"
          >
            <Plus size={14} /> Create Game
          </button>
        </div>

        <div className="bubbly-card bg-white p-4">
          <h2 className="font-display text-2xl font-bold">Create Market</h2>
          <div className="mt-4 grid gap-3">
            <label className="block">
              <span className="text-[10px] font-bold uppercase opacity-50">Game</span>
              <select
                value={marketDraft.gameId}
                onChange={(event) => setMarketDraft((draft) => ({ ...draft, gameId: event.target.value }))}
                className="mt-1 w-full rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] px-3 py-2 text-xs font-bold outline-none"
              >
                {FOOTBALL_GAMES.map((game) => <option key={game.id} value={game.id}>{game.title}</option>)}
              </select>
            </label>
            <Field label="Market title" value={marketDraft.title} onChange={(value) => setMarketDraft((draft) => ({ ...draft, title: value }))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category" value={marketDraft.category} onChange={(value) => setMarketDraft((draft) => ({ ...draft, category: value }))} />
              <label className="block">
                <span className="text-[10px] font-bold uppercase opacity-50">Type</span>
                <select
                  value={marketDraft.type}
                  onChange={(event) => setMarketDraft((draft) => ({ ...draft, type: event.target.value }))}
                  className="mt-1 w-full rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] px-3 py-2 text-xs font-bold outline-none"
                >
                  {MARKET_TYPES.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
            </div>
            <Field label="Options" value={marketDraft.options} onChange={(value) => setMarketDraft((draft) => ({ ...draft, options: value }))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Minimum USDT stake" value={marketDraft.minStake} onChange={(value) => setMarketDraft((draft) => ({ ...draft, minStake: value }))} />
              <Field type="datetime-local" label="Close time" value={marketDraft.closeTime} onChange={(value) => setMarketDraft((draft) => ({ ...draft, closeTime: value }))} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMessage("Preview only: next step will persist createMarket and enforce admin-only access.")}
            className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81]"
          >
            <Plus size={14} /> Add Market
          </button>
        </div>
      </section>

      {message && (
        <p className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-yellow)] p-3 text-xs font-bold">
          {message}
        </p>
      )}

      <section className="bubbly-card bg-white p-4">
        <h2 className="font-display text-2xl font-bold">X Layer Testnet Controls</h2>
        <p className="mt-1 text-xs font-bold opacity-60">
          Use the deployer/owner wallet. Close markets, resolve winners, or refund a market for the demo loop.
        </p>

        {configured ? (
          <div className="mt-3 space-y-1 rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] p-3 text-[10px] font-bold">
            <p>
              Prediction contract:{" "}
              <a href={xLayerExplorerAddress(getFootballPredictionAddress() ?? "")} target="_blank" rel="noreferrer" className="underline">
                {getFootballPredictionAddress()}
              </a>
            </p>
            <p>
              Test USDT:{" "}
              <a href={xLayerExplorerAddress(getTestUSDTAddress() ?? "")} target="_blank" rel="noreferrer" className="underline">
                {getTestUSDTAddress()}
              </a>
            </p>
          </div>
        ) : (
          <p className="mt-3 rounded-2xl border-2 border-amber-700 bg-amber-50 p-3 text-xs font-bold text-amber-800">
            Deploy contracts with npm run deploy:xlayer, then set NEXT_PUBLIC_FOOTBALL_PREDICTION_ADDRESS and NEXT_PUBLIC_TEST_USDT_ADDRESS.
          </p>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto_auto]">
          <Field label="Market ID" value={marketControl.marketId} onChange={(value) => setMarketControl((current) => ({ ...current, marketId: value.replace(/[^0-9]/g, "") }))} />
          <Field label="Winning option" value={marketControl.winningOption} onChange={(value) => setMarketControl((current) => ({ ...current, winningOption: value.replace(/[^0-9]/g, "") }))} />
          <button
            type="button"
            disabled={!configured || busyAction !== null}
            onClick={() => runMarketAction("close")}
            className="self-end rounded-full border-2 border-[var(--color-primary-900)] bg-white px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            {busyAction === "close" ? "Closing..." : "Close"}
          </button>
          <button
            type="button"
            disabled={!configured || busyAction !== null}
            onClick={() => runMarketAction("resolve")}
            className="self-end rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            {busyAction === "resolve" ? "Resolving..." : "Resolve"}
          </button>
          <button
            type="button"
            disabled={!configured || busyAction !== null}
            onClick={() => runMarketAction("refund")}
            className="self-end rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-yellow)] px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            {busyAction === "refund" ? "Refunding..." : "Refund"}
          </button>
        </div>
        {controlStatus && (
          <p className="mt-3 rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] p-3 text-xs font-bold">
            {controlStatus}
            {controlTxUrl && (
              <a href={controlTxUrl} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 underline">
                View tx <ExternalLink size={11} />
              </a>
            )}
          </p>
        )}
      </section>

      <section className="bubbly-card bg-white p-4">
        <h2 className="font-display text-2xl font-bold">Game Control</h2>
        <div className="mt-3 space-y-2">
          {FOOTBALL_GAMES.map((game) => (
            <div key={game.id} className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold">{game.title}</p>
                  <p className="text-[10px] font-bold opacity-60">
                    {formatMatchTime(game.matchStartTime)} - {statusLabel(game.status)} - {formatUSDT(game.totalPool)} pool
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Edit", "Close", "Resolve", "Refund"].map((action) => (
                    <button key={action} className="rounded-full border-2 border-[var(--color-primary-900)] bg-white px-3 py-1.5 text-[10px] font-bold">
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bubbly-card bg-white p-4">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-purple)]">
        {icon}
      </div>
      <p className="font-display text-xl font-bold">{value}</p>
      <p className="text-[10px] font-bold uppercase opacity-50">{label}</p>
    </div>
  );
}

function Field({
  label,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase opacity-50">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] px-3 py-2 text-xs font-bold outline-none"
      />
    </label>
  );
}
