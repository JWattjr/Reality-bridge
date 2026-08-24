"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CircleDollarSign,
  Link2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import WalletLoginButton from "@/components/WalletLoginButton";
import {
  acceptBaseDuel,
  approveAndCreateBaseDuel,
  createFixtureCommitment,
  isBaseDuelConfigured,
  type TicketFixture,
} from "@/lib/base-sepolia";
import { useAuthStore } from "@/store/useAuthStore";

type TicketOption = {
  value: number;
  label: string;
  probabilityBps: number;
};

type TicketMarket = {
  id: number;
  title: string;
  helper: string;
  options: TicketOption[];
};

const fixture: TicketFixture = {
  homeTeam: "Arsenal",
  awayTeam: "Chelsea",
  competition: "Premier League",
  kickoff: Math.floor(Date.UTC(2026, 8, 5, 15, 0, 0) / 1000),
  totalGoalsLineTenths: 25,
  totalCornersLineTenths: 95,
  totalCardsLineTenths: 35,
};

const ticketMarkets: TicketMarket[] = [
  {
    id: 0,
    title: "Match winner",
    helper: "Full-time result",
    options: [
      { value: 1, label: "Arsenal", probabilityBps: 3400 },
      { value: 2, label: "Draw", probabilityBps: 2500 },
      { value: 3, label: "Chelsea", probabilityBps: 4100 },
    ],
  },
  {
    id: 1,
    title: "First team to score",
    helper: "First goal, or no goals",
    options: [
      { value: 1, label: "Arsenal", probabilityBps: 4400 },
      { value: 2, label: "Chelsea", probabilityBps: 4700 },
      { value: 3, label: "No goals", probabilityBps: 900 },
    ],
  },
  {
    id: 2,
    title: "Total goals",
    helper: "Over / under 2.5",
    options: [
      { value: 1, label: "Over 2.5", probabilityBps: 5900 },
      { value: 2, label: "Under 2.5", probabilityBps: 4100 },
    ],
  },
  {
    id: 3,
    title: "Total corners",
    helper: "Over / under 9.5",
    options: [
      { value: 1, label: "Over 9.5", probabilityBps: 5600 },
      { value: 2, label: "Under 9.5", probabilityBps: 4400 },
    ],
  },
  {
    id: 4,
    title: "Total cards",
    helper: "Over / under 3.5",
    options: [
      { value: 1, label: "Over 3.5", probabilityBps: 5300 },
      { value: 2, label: "Under 3.5", probabilityBps: 4700 },
    ],
  },
  {
    id: 5,
    title: "Both teams to score",
    helper: "One goal each",
    options: [
      { value: 1, label: "Yes", probabilityBps: 6100 },
      { value: 2, label: "No", probabilityBps: 3900 },
    ],
  },
];

const defaultPicks = ticketMarkets.map((market) => market.options[0].value);
const impliedProbabilityBps = ticketMarkets.flatMap((market) =>
  market.options.map((option) => option.probabilityBps),
);

function formatProbability(probabilityBps: number) {
  return (probabilityBps / 100).toFixed(probabilityBps % 100 === 0 ? 0 : 1) + "%";
}

function formatKickoff(timestamp: number) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(timestamp * 1000)) + " UTC";
}

function weightedValue(probabilityBps: number) {
  return Math.floor(1_000_000 / probabilityBps);
}

export default function ProofPlayMvp() {
  const auth = useAuthStore();
  const [picks, setPicks] = useState<number[]>(defaultPicks);
  const [entryStake, setEntryStake] = useState("5");
  const [opponentAddress, setOpponentAddress] = useState("");
  const [joinDuelId, setJoinDuelId] = useState("");
  const [pendingAction, setPendingAction] = useState<"create" | "join" | null>(null);
  const [notice, setNotice] = useState(
    "Build a six-pick ticket. Every pick will settle independently at full time.",
  );
  const [transactionUrl, setTransactionUrl] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const baseDuelConfigured = isBaseDuelConfigured();

  useEffect(() => {
    const duelId = new URLSearchParams(window.location.search).get("duel");
    if (!duelId) return;
    const frame = window.requestAnimationFrame(() => {
      setJoinDuelId(duelId);
      setNotice("Challenge link detected. Build your ticket, then join the duel before kickoff.");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const selectedOptions = useMemo(
    () =>
      ticketMarkets.map((market, index) => {
        return market.options.find((option) => option.value === picks[index]) ?? market.options[0];
      }),
    [picks],
  );
  const ticketWeight = selectedOptions.reduce(
    (total, option) => total + weightedValue(option.probabilityBps),
    0,
  );
  const fixtureCommitment = createFixtureCommitment(fixture);

  function choosePick(marketIndex: number, value: number) {
    setPicks((current) => current.map((pick, index) => (index === marketIndex ? value : pick)));
  }

  function connectedWallet() {
    if (!auth.authenticated) {
      auth.login();
      return null;
    }
    const wallet = auth.wallets.find(
      (item) => item.address.toLowerCase() === auth.walletAddress?.toLowerCase(),
    ) ?? auth.wallets[0];
    if (!wallet) {
      setNotice("Your Privy wallet is still being created. Try again in a moment.");
      return null;
    }
    return wallet;
  }

  async function createChallenge() {
    if (!baseDuelConfigured) {
      setNotice(
        "Preview mode: deploy ProofPlayBaseDuel and set NEXT_PUBLIC_PROOFPLAY_DUEL_ADDRESS to create an on-chain invitation.",
      );
      return;
    }
    const wallet = connectedWallet();
    if (!wallet) return;

    setPendingAction("create");
    setTransactionUrl(null);
    try {
      const result = await approveAndCreateBaseDuel({
        wallet,
        fixture,
        invitedOpponent: opponentAddress,
        entryStake,
        impliedProbabilityBps,
        picks,
      });
      setTransactionUrl(result.explorerUrl);
      if (result.duelId) {
        const link = window.location.origin + "/?duel=" + result.duelId;
        setInviteLink(link);
        setNotice(
          "Duel #" + result.duelId + " created. Copy the link and send it to your rival before kickoff.",
        );
      } else {
        setNotice(
          "Duel created on Base Sepolia. Open the transaction to read the DuelCreated event and share its duel ID.",
        );
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not create the duel.");
    } finally {
      setPendingAction(null);
    }
  }

  async function joinDuel() {
    if (!baseDuelConfigured) {
      setNotice(
        "Preview mode: set NEXT_PUBLIC_PROOFPLAY_DUEL_ADDRESS before joining a Base Sepolia duel.",
      );
      return;
    }
    const wallet = connectedWallet();
    if (!wallet) return;

    setPendingAction("join");
    setTransactionUrl(null);
    try {
      const result = await acceptBaseDuel({ wallet, duelId: joinDuelId.trim(), picks });
      setTransactionUrl(result.explorerUrl);
      setNotice("Ticket locked. It can settle only after the fixture result is verified.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not join this duel.");
    } finally {
      setPendingAction(null);
    }
  }

  async function copyInviteLink() {
    if (!inviteLink || !navigator.clipboard) return;
    await navigator.clipboard.writeText(inviteLink);
    setNotice("Invitation link copied. Your friend can open it and submit a competing ticket.");
  }

  return (
    <main className="min-h-screen bg-bg-base px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="font-display text-2xl font-black tracking-tight sm:text-3xl">
            ProofPlay<span className="text-primary-500">.</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full border-2 border-primary-900 bg-pastel-yellow px-3 py-1.5 text-[10px] font-black uppercase tracking-wide">
              Base Sepolia + GenLayer
            </span>
            <WalletLoginButton compact />
          </div>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="bubbly-card overflow-hidden bg-white">
            <div className="border-b-3 border-primary-900 bg-primary-900 px-5 py-6 text-white sm:px-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-pastel-yellow">
                    Head-to-head football prediction
                  </p>
                  <h1 className="mt-2 font-display text-4xl font-black leading-none sm:text-5xl">
                    Build your ticket.
                    <br />
                    Beat your rival.
                  </h1>
                </div>
                <div className="rounded-2xl border-2 border-white/70 bg-white/10 px-3 py-2 text-right">
                  <p className="text-[10px] font-black uppercase tracking-wide text-white/70">Kickoff lock</p>
                  <p className="mt-1 text-xs font-bold">{formatKickoff(fixture.kickoff)}</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-pastel-green px-3 py-1.5 text-primary-900">Arsenal</span>
                <span className="rounded-full bg-white/15 px-3 py-1.5">vs</span>
                <span className="rounded-full bg-pastel-pink px-3 py-1.5 text-primary-900">Chelsea</span>
                <span className="rounded-full bg-white/15 px-3 py-1.5">{fixture.competition}</span>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="font-display text-2xl font-black">Your six-pick ticket</p>
                  <p className="mt-1 text-sm font-semibold opacity-65">
                    Pick one outcome in every independent market.
                  </p>
                </div>
                <span className="rounded-full bg-pastel-blue px-3 py-1.5 text-xs font-black">
                  {ticketWeight.toLocaleString()} potential weighted points
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {ticketMarkets.map((market, marketIndex) => (
                  <section key={market.title} className="rounded-2xl border-2 border-primary-900 bg-bg-base p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">{market.title}</p>
                        <p className="text-[11px] font-semibold opacity-60">{market.helper}</p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black">
                        Pick {marketIndex + 1}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {market.options.map((option) => {
                        const selected = picks[marketIndex] === option.value;
                        return (
                          <button
                            key={option.label}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => choosePick(marketIndex, option.value)}
                            className={
                              "flex items-center justify-between rounded-xl border-2 px-3 py-2 text-left text-xs font-black transition " +
                              (selected
                                ? "border-primary-900 bg-pastel-green shadow-[2px_2px_0px_0px_#312e81]"
                                : "border-primary-300 bg-white hover:border-primary-900")
                            }
                          >
                            <span>{option.label}</span>
                            <span className="text-[10px] opacity-65">{formatProbability(option.probabilityBps)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <section className="bubbly-card bg-pastel-yellow p-5">
              <div className="flex items-center gap-2">
                <Trophy size={20} />
                <h2 className="font-display text-2xl font-black">How you win</h2>
              </div>
              <p className="mt-3 text-sm font-bold leading-relaxed">
                Each correct pick scores by its implied probability. Calling a 9% no-goals
                outcome earns more than calling a 61% favourite.
              </p>
              <ol className="mt-4 space-y-2 text-xs font-bold leading-relaxed">
                <li><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-900 text-white">1</span>Highest weighted score</li>
                <li><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-900 text-white">2</span>Most correct picks, then highest-value pick</li>
                <li><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-900 text-white">3</span>Earlier ticket; exact tie refunds both entries</li>
              </ol>
            </section>

            <section className="bubbly-card bg-white p-5">
              <div className="flex items-center gap-2">
                <Users size={20} />
                <h2 className="font-display text-2xl font-black">Challenge a friend</h2>
              </div>
              <p className="mt-2 text-xs font-bold leading-relaxed opacity-65">
                Add a wallet address for a direct invitation, or leave it blank to create an open duel.
              </p>
              <label className="mt-4 block text-[11px] font-black uppercase tracking-wide">
                Rival wallet (optional)
                <input
                  value={opponentAddress}
                  onChange={(event) => setOpponentAddress(event.target.value)}
                  placeholder="0x… for a direct invite"
                  className="mt-1.5 w-full rounded-xl border-2 border-primary-900 bg-bg-base px-3 py-2.5 text-xs font-semibold outline-none focus:bg-white"
                />
              </label>
              <label className="mt-3 block text-[11px] font-black uppercase tracking-wide">
                Entry per player (test USDC)
                <input
                  inputMode="decimal"
                  value={entryStake}
                  onChange={(event) => setEntryStake(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border-2 border-primary-900 bg-bg-base px-3 py-2.5 text-sm font-black outline-none focus:bg-white"
                />
              </label>
              <button
                type="button"
                onClick={createChallenge}
                disabled={pendingAction !== null}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary-900 bg-pastel-green px-3 py-3 text-xs font-black shadow-[3px_3px_0px_0px_#312e81] transition hover:translate-y-0.5 hover:shadow-none disabled:cursor-wait disabled:opacity-60"
              >
                <Link2 size={16} />
                {pendingAction === "create" ? "Creating duel…" : opponentAddress.trim() ? "Create direct invite" : "Create open duel"}
              </button>
              {inviteLink ? (
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary-900 bg-white px-3 py-2.5 text-xs font-black"
                >
                  <Link2 size={15} />Copy invitation link
                </button>
              ) : null}
            </section>

            <section className="bubbly-card bg-pastel-blue p-5">
              <div className="flex items-center gap-2">
                <CircleDollarSign size={20} />
                <h2 className="font-display text-2xl font-black">Join a shared duel</h2>
              </div>
              <p className="mt-2 text-xs font-bold leading-relaxed opacity-65">
                A challenge link fills this automatically. Your rival may make entirely different picks.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  inputMode="numeric"
                  value={joinDuelId}
                  onChange={(event) => setJoinDuelId(event.target.value)}
                  placeholder="Duel ID"
                  className="min-w-0 flex-1 rounded-xl border-2 border-primary-900 bg-white px-3 py-2.5 text-sm font-black outline-none"
                />
                <button
                  type="button"
                  onClick={joinDuel}
                  disabled={pendingAction !== null}
                  className="rounded-xl border-2 border-primary-900 bg-primary-900 px-3 text-xs font-black text-white disabled:opacity-60"
                >
                  {pendingAction === "join" ? "…" : "Join"}
                </button>
              </div>
            </section>
          </aside>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="bubbly-card bg-white p-4">
            <ShieldCheck size={20} />
            <h2 className="mt-3 font-display text-xl font-black">Independent settlement</h2>
            <p className="mt-1 text-xs font-bold leading-relaxed opacity-65">
              Your corners pick can be right even when your match-winner pick is wrong. No money moves between individual picks.
            </p>
          </article>
          <article className="bubbly-card bg-white p-4">
            <Sparkles size={20} />
            <h2 className="mt-3 font-display text-xl font-black">GenLayer verifies facts</h2>
            <p className="mt-1 text-xs font-bold leading-relaxed opacity-65">
              Studionet independently validates the final score, first scorer, corners, and cards before Base scores either ticket.
            </p>
          </article>
          <article className="bubbly-card bg-white p-4">
            <CheckCircle2 size={20} />
            <h2 className="mt-3 font-display text-xl font-black">One pot, one duel</h2>
            <p className="mt-1 text-xs font-bold leading-relaxed opacity-65">
              Base Sepolia holds one test-USDC entry from each player. The winner claims the two-player pot; a true tie refunds both.
            </p>
          </article>
        </section>

        <section className="mt-5 rounded-2xl border-2 border-primary-900 bg-white p-4 text-sm font-bold leading-relaxed">
          <p>{notice}</p>
          {transactionUrl ? (
            <a className="mt-2 inline-block text-primary-700 underline" href={transactionUrl} target="_blank" rel="noreferrer">
              View Base Sepolia transaction
            </a>
          ) : null}
          <p className="mt-2 text-[11px] opacity-60">
            Fixture commitment: {fixtureCommitment}. Testnet assets have no value. {baseDuelConfigured ? "On-chain Base duel contract detected." : "Running in honest preview mode until the Base duel contract address is configured."}
          </p>
        </section>
      </div>
    </main>
  );
}
