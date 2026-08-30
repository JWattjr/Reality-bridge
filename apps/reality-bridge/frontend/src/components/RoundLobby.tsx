"use client";

import { ChevronRight, Users } from "lucide-react";

import type { RoundView } from "@/lib/contract";
import type { LobbyFilter } from "@/lib/derive";
import { formatAmount, formatCountdown } from "@/lib/format";
import { EmptyState, StatusPill } from "@/components/ui";

const FILTERS: { id: LobbyFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "active", label: "Active" },
  { id: "upcoming", label: "Upcoming" },
  { id: "settled", label: "Settled" },
  { id: "refundable", label: "Refundable" },
  { id: "mine", label: "My rounds" },
];

const STATUS_TONE: Record<
  RoundView["status"],
  "neutral" | "good" | "warn" | "bad" | "busy"
> = {
  DRAFT: "neutral",
  OPEN: "good",
  ACTIVE: "busy",
  SETTLED: "good",
  REFUNDABLE: "warn",
  CANCELLED: "bad",
};

function deadlineLabel(round: RoundView, now: number): string {
  if (round.status === "OPEN") {
    // An OPEN round whose join window has already lapsed is not joinable; it
    // is waiting for someone to start it. "Joins close in elapsed" read as a
    // glitch rather than as a state.
    if (now >= round.join_deadline) {
      return "Join window closed — anyone can start it";
    }
    return `Joins close in ${formatCountdown(round.join_deadline, now)}`;
  }
  if (round.status === "ACTIVE") {
    if (now >= round.terminal_deadline) {
      return "Terminal deadline passed — anyone can expire it";
    }
    return `Terminal deadline in ${formatCountdown(round.terminal_deadline, now)}`;
  }
  if (round.status === "SETTLED") return "Claims open";
  if (round.status === "REFUNDABLE") return "Refunds open";
  if (round.status === "CANCELLED") return "Cancelled before start";
  return "Not open yet";
}

export default function RoundLobby({
  rounds,
  filter,
  onFilter,
  selectedRoundId,
  onSelect,
  joinedRoundIds,
  actionableRoundIds,
  now,
}: {
  rounds: RoundView[];
  filter: LobbyFilter;
  onFilter: (value: LobbyFilter) => void;
  selectedRoundId: string | null;
  onSelect: (roundId: string) => void;
  joinedRoundIds: ReadonlySet<string>;
  actionableRoundIds: ReadonlySet<string>;
  now: number;
}) {
  return (
    <section className="panel lobby-panel" aria-labelledby="lobby-heading">
      <div className="panel-heading">
        <div>
          <span className="panel-kicker">ROUND LOBBY</span>
          <h3 id="lobby-heading">Published crossings</h3>
        </div>
        <span className="count-badge">{rounds.length} shown</span>
      </div>

      <div className="lobby-filters" role="group" aria-label="Filter rounds">
        {FILTERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={filter === entry.id ? "filter-chip active" : "filter-chip"}
            aria-pressed={filter === entry.id}
            onClick={() => onFilter(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {rounds.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          body="No published round matches this filter. Try another filter, or refresh to pull the latest StudioNet state."
        />
      ) : (
        <ul className="lobby-list">
          {rounds.map((round) => {
            const selected = round.round_id === selectedRoundId;
            return (
              <li key={round.round_id}>
                <button
                  type="button"
                  className={selected ? "lobby-row selected" : "lobby-row"}
                  aria-current={selected ? "true" : undefined}
                  onClick={() => onSelect(round.round_id)}
                >
                  <span className="lobby-row-main">
                    <span className="lobby-row-title">
                      <strong>{round.title}</strong>
                      <StatusPill tone={STATUS_TONE[round.status]}>
                        {round.status}
                      </StatusPill>
                      {joinedRoundIds.has(round.round_id) && (
                        <StatusPill tone="neutral">Joined</StatusPill>
                      )}
                      {actionableRoundIds.has(round.round_id) && (
                        <StatusPill tone="warn">Action for you</StatusPill>
                      )}
                    </span>
                    <span className="lobby-row-meta">
                      Round {round.round_id} · {round.tile_count}{" "}
                      {round.tile_count === 1 ? "panel" : "panels"} ·{" "}
                      <Users size={12} aria-hidden="true" /> {round.player_count}{" "}
                      · pool {formatAmount(round.pool)}
                    </span>
                    <span className="lobby-row-deadline">
                      {deadlineLabel(round, now)}
                    </span>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
