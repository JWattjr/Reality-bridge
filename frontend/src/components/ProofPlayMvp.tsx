"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import WalletLoginButton from "@/components/WalletLoginButton";
import {
  approveAndPlaceBasePrediction,
  isBaseMarketConfigured,
  type BaseWallet,
} from "@/lib/base-sepolia";
import { useAuthStore } from "@/store/useAuthStore";

type Pick = 1 | 2 | 3;

const choices: Array<{ id: Pick; label: string; sublabel: string; pool: number; players: number; accent: string }> = [
  { id: 1, label: "Arsenal", sublabel: "Home win", pool: 214, players: 6, accent: "bg-pastel-green" },
  { id: 2, label: "Draw", sublabel: "Level after 90'", pool: 58.5, players: 2, accent: "bg-pastel-yellow" },
  { id: 3, label: "Chelsea", sublabel: "Away win", pool: 287.5, players: 8, accent: "bg-pastel-blue" },
];

const totalPvPPool = choices.reduce((sum, choice) => sum + choice.pool, 0);

export default function ProofPlayMvp() {
  const auth = useAuthStore();
  const [pick, setPick] = useState<Pick>(1);
  const [stake, setStake] = useState("10");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const configured = isBaseMarketConfigured();
  const selected = choices.find((choice) => choice.id === pick) ?? choices[0];
  const estimatedReturn = useMemo(() => {
    const value = Number(stake);
    if (!Number.isFinite(value) || value <= 0) return "0.00";
    return ((value * (totalPvPPool + value)) / (selected.pool + value)).toFixed(2);
  }, [selected.pool, stake]);

  async function placePrediction() {
    const amount = Number(stake);
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus("Enter a positive USDC amount.");
      return;
    }

    if (!configured) {
      setStatus(`Preview recorded: ${stake} test USDC on ${selected.label}. If that outcome wins, you split this player-funded pot pro rata with the other ${selected.label} players.`);
      return;
    }

    if (!auth.authenticated) {
      auth.login();
      return;
    }

    const wallet = auth.wallets.find((candidate) =>
      Boolean((candidate as BaseWallet).getEthereumProvider && (candidate as BaseWallet).switchChain),
    ) as BaseWallet | undefined;
    if (!wallet) {
      setStatus("Your connected wallet cannot sign Base Sepolia transactions yet.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Approving USDC and submitting your Base Sepolia prediction…");
    try {
      const marketId = Number(process.env.NEXT_PUBLIC_PROOFPLAY_DEFAULT_MARKET_ID ?? "1");
      const result = await approveAndPlaceBasePrediction({ wallet, marketId, outcome: pick, stake });
      setStatus(`Prediction submitted. View it on BaseScan: ${result.explorerUrl}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not submit the prediction.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg-base px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4 border-b-2 border-primary-900 pb-5">
          <a href="#market" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">ProofPlay</a>
          <WalletLoginButton compact />
        </header>

        <section className="grid gap-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div className="self-center">
            <p className="inline-flex items-center gap-2 rounded-full border-2 border-primary-900 bg-pastel-purple px-3 py-1 text-xs font-bold">
              <Sparkles size={14} /> Base Sepolia + GenLayer Studionet
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-5xl font-bold leading-[0.95] sm:text-7xl">
              A PvP prediction market. Let consensus settle it.
            </h1>
            <p className="mt-5 max-w-2xl text-base font-bold leading-relaxed opacity-75 sm:text-lg">
              Players fund opposing outcomes with test USDC on Base Sepolia. There is no house taking the other side: the winning players split the full market pot pro rata after GenLayer verifies the result. No Bradbury, no real funds.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                ["1", "Take a side", "Players choose Home, Draw, or Away"],
                ["2", "Face the pool", "Other players fund opposing outcomes"],
                ["3", "Split the pot", "Winning players share it pro rata"],
              ].map(([number, title, copy]) => (
                <div key={title} className="rounded-2xl border-2 border-primary-900 bg-white p-3 shadow-[3px_3px_0px_0px_#312e81]">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-pastel-yellow text-xs font-black">{number}</span>
                  <p className="mt-2 font-display text-lg font-bold">{title}</p>
                  <p className="text-xs font-bold opacity-65">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <section id="market" className="bubbly-card bg-white p-5 sm:p-6" aria-labelledby="market-heading">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-55">Premier League · PvP demo market</p>
                <h2 id="market-heading" className="mt-1 font-display text-3xl font-bold">Arsenal vs Chelsea</h2>
              </div>
              <span className={`rounded-full border-2 border-primary-900 px-3 py-1 text-[11px] font-bold ${configured ? "bg-pastel-green" : "bg-pastel-yellow"}`}>
                {configured ? "Base ready" : "Preview mode"}
              </span>
            </div>

            <div className="mt-5 rounded-2xl border-2 border-primary-900 bg-bg-base p-4">
              <div className="flex items-center justify-between gap-3 text-sm font-bold">
                <span><strong>{totalPvPPool.toFixed(2)} USDC</strong> player-funded pot</span>
                <span>16 players · Min. 1 USDC</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full border border-primary-900 bg-white">
                <div className="h-full w-[66%] bg-pastel-purple" />
              </div>
            </div>

            <fieldset className="mt-5">
              <legend className="text-sm font-bold">Take a side against other players</legend>
              <div className="mt-3 grid gap-2">
                {choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    aria-pressed={pick === choice.id}
                    onClick={() => setPick(choice.id)}
                    className={`flex items-center justify-between rounded-2xl border-2 border-primary-900 p-3 text-left transition-transform hover:translate-x-0.5 ${pick === choice.id ? choice.accent : "bg-white"}`}
                  >
                    <span><span className="block font-display text-xl font-bold">{choice.label}</span><span className="text-xs font-bold opacity-60">{choice.sublabel}</span></span>
                    <span className="text-right"><span className="block text-xs font-bold opacity-60">{choice.players} players · side pool</span><span className="font-bold">{choice.pool.toFixed(2)} USDC</span></span>
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="mt-5 block text-sm font-bold" htmlFor="stake">Stake in test USDC</label>
            <div className="mt-2 flex overflow-hidden rounded-2xl border-2 border-primary-900 bg-white">
              <input id="stake" inputMode="decimal" value={stake} onChange={(event) => setStake(event.target.value)} className="min-w-0 flex-1 bg-transparent px-4 py-3 text-lg font-bold outline-none" aria-describedby="return-estimate" />
              <span className="flex items-center bg-pastel-yellow px-4 text-sm font-bold">USDC</span>
            </div>
            <div id="return-estimate" className="mt-3 flex items-center justify-between rounded-xl bg-primary-100 px-3 py-2 text-sm font-bold">
              <span>Estimated share of the PvP pot</span><span>{estimatedReturn} USDC</span>
            </div>

            <button type="button" onClick={placePrediction} disabled={isSubmitting} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary-900 bg-pastel-green px-4 py-3 text-sm font-bold shadow-[3px_3px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : <CircleDollarSign size={17} />}
              {configured ? "Join this PvP pool with USDC" : "Preview joining this PvP pool"}
            </button>
            {status && <p className="mt-3 rounded-xl border border-primary-900 bg-pastel-blue p-3 text-xs font-bold leading-relaxed">{status}</p>}
          </section>
        </section>

        <section className="grid gap-3 pb-10 md:grid-cols-3">
          <article className="rounded-2xl border-2 border-primary-900 bg-white p-4"><ShieldCheck size={20} /><h2 className="mt-3 font-display text-xl font-bold">Player vs player</h2><p className="mt-1 text-sm font-bold opacity-65">Every prediction enters one shared Base Sepolia test-USDC pot. ProofPlay never becomes your counterparty.</p></article>
          <article className="rounded-2xl border-2 border-primary-900 bg-white p-4"><CheckCircle2 size={20} /><h2 className="mt-3 font-display text-xl font-bold">Resolved on Studionet</h2><p className="mt-1 text-sm font-bold opacity-65">Validators independently compare final score and outcome fields before the result is returned.</p></article>
          <article className="rounded-2xl border-2 border-primary-900 bg-white p-4"><ArrowUpRight size={20} /><h2 className="mt-3 font-display text-xl font-bold">Refunds are a first-class path</h2><p className="mt-1 text-sm font-bold opacity-65">If the beta bridge cannot return a result in time, anyone can open individual refunds.</p></article>
        </section>
      </div>
    </main>
  );
}
