import { Radio, Swords, Trophy, UserRoundCheck, Zap } from "lucide-react";
import { getPvPCardState } from "@/lib/football-data";
import { useGamePvPMatches } from "@/hooks/useApi";
import { motion, AnimatePresence } from "framer-motion";

type PvPMatchCardProps = {
  gameId: string;
  userId: string;
  predictions?: any[];
  markets?: any[];
};

export function PvPMatchCard({ gameId, userId, predictions, markets = [] }: PvPMatchCardProps) {
  const { data: pvpMatches = [] } = useGamePvPMatches(gameId);
  const state = getPvPCardState(gameId, userId, predictions, pvpMatches, markets);

  const opponentEntryNumber = state.match
    ? state.entryNumber === state.match.playerAEntryNumber
      ? state.match.playerBEntryNumber
      : state.match.playerAEntryNumber
    : undefined;
  const opponentLabel = opponentEntryNumber
    ? `Player #${opponentEntryNumber}`
    : state.opponent ?? (state.match?.result === "BYE" ? "No opponent" : "Waiting");
  const statusLabel = state.match?.playerBId
    ? "Paired"
    : state.match?.status === "PENDING"
      ? "Pending"
      : state.eligible
        ? "In pool"
        : "Not entered";
  const cardTone = state.match?.status === "RESOLVED"
    ? "bg-pastel-yellow"
    : state.match?.playerBId
      ? "bg-pastel-green"
      : state.eligible
        ? "bg-pastel-blue"
        : "bg-white";

  return (
    <motion.section 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={`bubbly-card overflow-hidden p-4 transition-colors ${cardTone}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <motion.span 
            animate={state.match?.playerBId && state.match?.status !== "RESOLVED" ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
            className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary-900 bg-white"
          >
            {state.eligible && state.match?.status !== "RESOLVED" && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pastel-green opacity-55" />
            )}
            <Swords size={18} className="relative" />
          </motion.span>
          <h2 className="font-display text-xl font-bold">Auto PvP</h2>
        </div>
        <motion.span 
          key={state.match?.playerBId ? "paired" : "unpaired"}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-1 rounded-full border-2 border-primary-900 bg-white px-2 py-1 text-[10px] font-bold"
        >
          {state.match?.playerBId ? <Zap size={11} className="text-yellow-500" /> : <Radio size={11} />}
          {statusLabel}
        </motion.span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-bold">
        <Metric label="Your number" value={state.entryNumber ? `#${state.entryNumber}` : "-"} />
        <Metric label="Your picks" value={`${state.pickCount}/${state.totalMarkets}`} />
        <Metric label="PvP points" value={`${state.pointsEarned}`} />
        <Metric label="Opponent" value={opponentLabel} />
        <Metric label="Result" value={state.resultLabel} />
      </div>

      <motion.div 
        layout
        className="mt-3 rounded-2xl border-2 border-primary-900 bg-white/70 p-3 text-xs font-bold"
      >
        <div className="flex items-start gap-2">
          <UserRoundCheck size={15} className="mt-0.5 shrink-0" />
          <p>
            {state.message}
            {state.entryNumber && state.match?.status !== "RESOLVED" && (
              <span className="mt-1 block opacity-70">
                {opponentEntryNumber
                  ? `You are paired with Player #${opponentEntryNumber}.`
                  : "Odd entries pair with the next even entry in this match."}
              </span>
            )}
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {state.match?.status === "RESOLVED" && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 overflow-hidden rounded-2xl border-2 border-primary-900 bg-white text-xs font-bold"
          >
            <div className="p-3">
              <div className="flex items-center justify-between gap-3">
                <span>Your hits: {state.userHits}</span>
                <span>Opponent hits: {state.opponentHits}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 opacity-70">
                <Trophy size={14} />
                <span>Winner gets 100. Draw or bye gives 50.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-primary-900 bg-white/80 p-3">
      <p className="text-[10px] uppercase opacity-50">{label}</p>
      <p className="mt-0.5 truncate">{value}</p>
    </div>
  );
}
