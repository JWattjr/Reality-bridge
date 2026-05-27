import { Swords, Trophy, UserRoundCheck } from "lucide-react";
import { getPvPCardState } from "@/lib/football-data";

type PvPMatchCardProps = {
  gameId: string;
  userId: string;
};

export function PvPMatchCard({ gameId, userId }: PvPMatchCardProps) {
  const state = getPvPCardState(gameId, userId);
  const opponentLabel = state.opponent ?? (state.match?.result === "BYE" ? "No opponent" : "Pairing pending");

  return (
    <section className="bubbly-card bg-[var(--color-pastel-green)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Swords size={18} />
          <h2 className="font-display text-xl font-bold">Auto PvP</h2>
        </div>
        <span className="rounded-full border-2 border-[var(--color-primary-900)] bg-white px-2 py-1 text-[10px] font-bold">
          {state.eligible ? "Eligible" : "Not entered"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-bold">
        <Metric label="Your picks" value={`${state.pickCount}/${state.totalMarkets}`} />
        <Metric label="PvP points" value={`${state.pointsEarned}`} />
        <Metric label="Opponent" value={opponentLabel} />
        <Metric label="Result" value={state.resultLabel} />
      </div>

      <div className="mt-3 rounded-2xl border-2 border-[var(--color-primary-900)] bg-white/70 p-3 text-xs font-bold">
        <div className="flex items-start gap-2">
          <UserRoundCheck size={15} className="mt-0.5 shrink-0" />
          <p>{state.message}</p>
        </div>
      </div>

      {state.match?.status === "RESOLVED" && (
        <div className="mt-3 rounded-2xl border-2 border-[var(--color-primary-900)] bg-white p-3 text-xs font-bold">
          <div className="flex items-center justify-between gap-3">
            <span>Your hits: {state.userHits}</span>
            <span>Opponent hits: {state.opponentHits}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 opacity-70">
            <Trophy size={14} />
            <span>Winner gets 100. Draw or bye gives 50.</span>
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-white/80 p-3">
      <p className="text-[10px] uppercase opacity-50">{label}</p>
      <p className="mt-0.5 truncate">{value}</p>
    </div>
  );
}
