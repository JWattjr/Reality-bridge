"use client";

import {
  Check,
  ChevronRight,
  Clock3,
  Info,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";

import type {
  ConfigView,
  PlayerView,
  RoundView,
  TileView,
} from "@/lib/contract";
import type { ActionId, DerivedState } from "@/lib/derive";
import { actionById } from "@/lib/derive";
import { formatAmount, shortHash } from "@/lib/format";
import type { RecoveryBundle } from "@/lib/recovery";
import { BundleExport, BundleImport } from "@/components/RecoveryBundlePanel";
import PreSignatureDisclosure from "@/components/PreSignatureDisclosure";
import { Countdown, ExternalLinkOut, StatusPill } from "@/components/ui";

export type Choice = "YES" | "NO";

export interface ActionPanelProps {
  round: RoundView;
  tiles: TileView[];
  config: ConfigView;
  derived: DerivedState;
  now: number;
  busy: boolean;
  simulation: boolean;
  contractAddress: string;
  account: string;

  selectedChoice: Choice | null;
  onSelectChoice: (choice: Choice) => void;

  pendingBundle: RecoveryBundle | null;
  bundleAcknowledged: boolean;
  onAcknowledgeBundle: (value: boolean) => void;
  storedBundle: RecoveryBundle | null;
  onRestoreBundle: (bundle: RecoveryBundle) => void;

  showDisclosure: boolean;
  onRequestJoin: () => void;
  onCancelJoin: () => void;

  onAction: (id: ActionId) => void;
  /** Simulation only: deliberately let the reveal window lapse. */
  onSimulateLapse: () => void;
  onNotice: (message: string) => void;
}

function ActionButton({
  id,
  derived,
  onAction,
  busy,
  icon,
  children,
  variant,
}: {
  id: ActionId;
  derived: DerivedState;
  onAction: (id: ActionId) => void;
  busy: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  variant?: "primary" | "recovery" | "claim";
}) {
  const availability = actionById(derived, id);
  if (availability.hidden) return null;
  const disabled = !availability.enabled || busy;
  return (
    <div className="action-slot">
      <button
        className={`action-button ${variant ?? "primary"}`}
        type="button"
        onClick={() => onAction(id)}
        disabled={disabled}
      >
        {busy ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : icon}
        {children}
        <ChevronRight size={16} aria-hidden="true" />
      </button>
      {availability.permissionless && (
        <span className="action-note">
          Permissionless — any wallet may send this to keep the round alive.
        </span>
      )}
      {availability.blockedReason && (
        <span className="action-reason">{availability.blockedReason}</span>
      )}
    </div>
  );
}

function Deadlines({
  round,
  tile,
  derived,
  now,
}: {
  round: RoundView;
  tile: TileView | null;
  derived: DerivedState;
  now: number;
}) {
  return (
    <div className="deadline-grid">
      {round.status === "OPEN" && (
        <Countdown label="Join closes" target={round.join_deadline} now={now} />
      )}
      {round.status === "ACTIVE" && (
        <>
          <Countdown
            label="Commit window"
            target={derived.commitDeadline}
            now={now}
          />
          <Countdown
            label="Reveal cut-off"
            target={derived.revealDeadline}
            now={now}
          />
          {tile && (
            <>
              <Countdown
                label="Panel cut-off"
                target={tile.choice_deadline}
                now={now}
              />
              <Countdown
                label="Resolution opens"
                target={tile.resolution_time}
                now={now}
              />
            </>
          )}
        </>
      )}
      {/* A finished round has no live deadline; showing one implied the game
          was still running. */}
      {(round.status === "OPEN" || round.status === "ACTIVE") && (
        <Countdown
          label="Terminal deadline"
          target={round.terminal_deadline}
          now={now}
        />
      )}
    </div>
  );
}

function ClaimSummary({
  viewer,
  kind,
}: {
  viewer: PlayerView | null;
  kind: "claim" | "refund";
}) {
  if (!viewer) {
    return (
      <p className="decision-hint">
        This wallet did not join the round, so it has no{" "}
        {kind === "claim" ? "payout" : "refund"} here.
      </p>
    );
  }
  const amount = kind === "claim" ? viewer.claim_amount : viewer.refund_amount;
  const collected = kind === "claim" ? viewer.claimed : viewer.refunded;
  const zero = amount === "0";

  return (
    <div className="claim-summary">
      <div className="claim-amount">
        <span>{kind === "claim" ? "Your payout" : "Your refund"}</span>
        <strong>{formatAmount(amount)}</strong>
      </div>
      {collected ? (
        <StatusPill tone="good">
          <Check size={13} aria-hidden="true" /> Already collected
        </StatusPill>
      ) : zero ? (
        <StatusPill tone="neutral">Not eligible</StatusPill>
      ) : (
        <StatusPill tone="good">Eligible</StatusPill>
      )}
    </div>
  );
}

export default function ActionPanel(props: ActionPanelProps) {
  const {
    round,
    config,
    derived,
    now,
    busy,
    simulation,
    contractAddress,
    account,
    selectedChoice,
    onSelectChoice,
    pendingBundle,
    bundleAcknowledged,
    onAcknowledgeBundle,
    storedBundle,
    onRestoreBundle,
    showDisclosure,
    onRequestJoin,
    onCancelJoin,
    onAction,
    onSimulateLapse,
    onNotice,
  } = props;

  const tile = derived.currentTile;
  const viewer = derived.viewer;

  const stage = useMemo(() => {
    if (round.status !== "ACTIVE") return round.status;
    if (!derived.activePlayer?.committed) return "COMMIT";
    if (!derived.activePlayer?.revealed) return "REVEAL";
    return "RESOLVE";
  }, [derived.activePlayer, round.status]);

  const restoreTarget = {
    contract: contractAddress,
    roundId: round.round_id,
    tileIndex: round.current_tile_index,
    account,
    onChainCommitment: viewer?.commitment || undefined,
  };

  return (
    <aside className="crossing-card panel" aria-labelledby="action-heading">
      <div className="crossing-header">
        <div>
          <span className="panel-kicker">
            {simulation ? "SIMULATED CROSSING" : "YOUR CROSSING"}
          </span>
          <h3 id="action-heading">{derived.headline}</h3>
        </div>
        <div className="seat-badge">
          <span>SEAT</span>
          <strong>
            {viewer ? String(viewer.join_index + 1).padStart(2, "0") : "—"}
          </strong>
        </div>
      </div>

      {derived.role === "spectator" && round.status !== "OPEN" && (
        <p className="role-banner">
          <Info size={14} aria-hidden="true" /> Spectator view. This wallet has no
          seat in this round, so only permissionless recovery actions are
          available to you.
        </p>
      )}
      {derived.role === "eliminated" && (
        <p className="role-banner">
          <Info size={14} aria-hidden="true" /> You were eliminated from this
          crossing. Eliminated seats receive no payout at settlement, but they
          are still refunded in full if the round unwinds.
        </p>
      )}

      {(round.status === "OPEN" || round.status === "ACTIVE") && (
        <Deadlines round={round} tile={tile} derived={derived} now={now} />
      )}

      {round.status === "OPEN" && (
        <div className="join-panel">
          <div>
            <span className="panel-kicker">ENTRY WINDOW</span>
            <strong>Take a seat on the bridge</strong>
            <p>
              Join order decides who opens the first unresolved panel. Entry is
              exactly {formatAmount(round.entry_amount)}; the round needs at
              least {config.min_players} seats to start.
            </p>
          </div>
          {showDisclosure ? (
            <PreSignatureDisclosure
              round={round}
              config={config}
              busy={busy}
              onConfirm={() => onAction("join_round")}
              onCancel={onCancelJoin}
            />
          ) : (
            <div className="action-slot">
              <button
                className="action-button primary"
                type="button"
                onClick={onRequestJoin}
                disabled={!actionById(derived, "join_round").enabled || busy}
              >
                <Wallet size={15} aria-hidden="true" /> Review entry and join
                <ChevronRight size={15} aria-hidden="true" />
              </button>
              {actionById(derived, "join_round").blockedReason && (
                <span className="action-reason">
                  {actionById(derived, "join_round").blockedReason}
                </span>
              )}
            </div>
          )}
          <ActionButton
            id="start_round"
            derived={derived}
            onAction={onAction}
            busy={busy}
            icon={<Zap />}
            variant="recovery"
          >
            Start the round
          </ActionButton>
        </div>
      )}

      {round.status === "ACTIVE" && tile && (
        <div className="decision-panel">
          <span className="decision-kicker">
            PANEL {String(round.current_tile_index + 1).padStart(2, "0")} ·{" "}
            {stage}
          </span>
          <h4>{tile.question}</h4>
          <p className="decision-condition">{tile.yes_condition}</p>
          <p className="evidence-sources">
            <ExternalLinkOut href={tile.primary_url}>
              Registered primary source
            </ExternalLinkOut>
            {tile.support_url_1 && (
              <ExternalLinkOut href={tile.support_url_1}>
                Corroborating source
              </ExternalLinkOut>
            )}
          </p>

          {stage === "COMMIT" && (
            <>
              <p className="decision-hint">
                Pick a side. Your answer is stored only as a salted hash until
                you reveal it.
              </p>
              <div
                className="choice-grid"
                role="radiogroup"
                aria-label="Your sealed choice"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedChoice === "YES"}
                  className={
                    selectedChoice === "YES"
                      ? "choice choice-yes selected"
                      : "choice choice-yes"
                  }
                  onClick={() => onSelectChoice("YES")}
                  disabled={!derived.viewerIsRunner || busy}
                >
                  <span>YES</span>
                  <small>The condition is met</small>
                  {selectedChoice === "YES" && <Check size={15} aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedChoice === "NO"}
                  className={
                    selectedChoice === "NO"
                      ? "choice choice-no selected"
                      : "choice choice-no"
                  }
                  onClick={() => onSelectChoice("NO")}
                  disabled={!derived.viewerIsRunner || busy}
                >
                  <span>NO</span>
                  <small>The condition is not met</small>
                  {selectedChoice === "NO" && <Check size={15} aria-hidden="true" />}
                </button>
              </div>

              {pendingBundle && (
                <BundleExport
                  bundle={pendingBundle}
                  acknowledged={bundleAcknowledged}
                  onAcknowledge={onAcknowledgeBundle}
                  onError={onNotice}
                />
              )}

              <ActionButton
                id="commit_choice"
                derived={derived}
                onAction={onAction}
                busy={busy}
                icon={<LockKeyhole size={16} aria-hidden="true" />}
              >
                {simulation ? "Seal simulated choice" : "Commit sealed choice"}
              </ActionButton>
              {pendingBundle && !bundleAcknowledged && (
                <p className="action-reason">
                  Confirm you saved the recovery bundle before signing.
                </p>
              )}
            </>
          )}

          {stage === "REVEAL" && (
            <>
              <p className="decision-hint">
                Your commitment is recorded. Open the same choice and salt before
                the reveal cut-off.
              </p>
              <div className="reveal-row">
                <span>Stored commitment</span>
                <code>{shortHash(viewer?.commitment ?? "", 12, 8) || "—"}</code>
              </div>
              {storedBundle ? (
                <div className="reveal-row">
                  <span>Recovery bundle</span>
                  <strong className={storedBundle.choice === "YES" ? "text-yes" : "text-no"}>
                    {storedBundle.choice}
                  </strong>
                </div>
              ) : (
                <BundleImport target={restoreTarget} onRestore={onRestoreBundle} />
              )}
              <ActionButton
                id="reveal_choice"
                derived={derived}
                onAction={onAction}
                busy={busy}
                icon={<KeyRound size={16} aria-hidden="true" />}
              >
                Reveal choice
              </ActionButton>
            </>
          )}

          {stage === "RESOLVE" && (
            <>
              <p className="decision-hint">
                {simulation
                  ? "The choice is open. The scenario already fixed this panel's outcome, so running it will not agree with you just because you picked a side."
                  : "The choice is public. Validators will independently render the registered sources and must derive the same decision fields before anything is written."}
              </p>
              <div className="consensus-preview">
                <div className="validator-orbit" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <ShieldCheck size={19} />
                </div>
                <div>
                  <strong>
                    {simulation
                      ? "Scripted outcome ready"
                      : "Waiting for the evidence timestamp"}
                  </strong>
                  <small>
                    Resolution attempts so far: {tile.attempts}. A failed attempt
                    changes nothing and moves no deadline.
                  </small>
                </div>
              </div>
              <ActionButton
                id="resolve_tile"
                derived={derived}
                onAction={onAction}
                busy={busy}
                icon={<ShieldCheck size={16} aria-hidden="true" />}
                variant="recovery"
              >
                {simulation ? "Run the scripted outcome" : "Ask validators to resolve"}
              </ActionButton>
            </>
          )}

          <div className="recovery-actions">
            <h5>
              <Clock3 size={13} aria-hidden="true" /> Keep the round alive
            </h5>
            {simulation && stage === "REVEAL" && (
              <div className="action-slot">
                <button
                  className="action-button recovery"
                  type="button"
                  onClick={onSimulateLapse}
                  disabled={busy}
                >
                  <Clock3 size={15} aria-hidden="true" /> Let the reveal window
                  lapse
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
                <span className="action-note">
                  Simulation only — skips ahead so you can see the forfeit path
                  without waiting for a real deadline.
                </span>
              </div>
            )}
            <ActionButton
              id="forfeit_missed_commit"
              derived={derived}
              onAction={onAction}
              busy={busy}
              icon={<RefreshCw size={15} aria-hidden="true" />}
              variant="recovery"
            >
              Forfeit missed commit
            </ActionButton>
            <ActionButton
              id="forfeit_missed_reveal"
              derived={derived}
              onAction={onAction}
              busy={busy}
              icon={<RefreshCw size={15} aria-hidden="true" />}
              variant="recovery"
            >
              Forfeit missed reveal
            </ActionButton>
            <ActionButton
              id="expire_round"
              derived={derived}
              onAction={onAction}
              busy={busy}
              icon={<RefreshCw size={15} aria-hidden="true" />}
              variant="recovery"
            >
              Expire round
            </ActionButton>
          </div>
        </div>
      )}

      {round.status === "SETTLED" && (
        <div className="decision-panel">
          <p className="decision-hint">
            Every panel is resolved and all claim amounts are fixed. Survivor
            weight is {config.base_weight} + {config.credit_weight} × discovery
            credits; eliminated seats receive nothing.
          </p>
          <ClaimSummary viewer={viewer} kind="claim" />
          <ActionButton
            id="claim"
            derived={derived}
            onAction={onAction}
            busy={busy}
            icon={<Trophy size={16} aria-hidden="true" />}
            variant="claim"
          >
            {simulation ? "Collect simulated payout" : "Claim payout"}
          </ActionButton>
        </div>
      )}

      {(round.status === "REFUNDABLE" || round.status === "CANCELLED") && (
        <div className="decision-panel">
          <p className="decision-hint">
            This round unwound instead of paying out. Every joined seat —
            including eliminated ones — can reclaim exactly its own entry, once.
          </p>
          <ClaimSummary viewer={viewer} kind="refund" />
          <ActionButton
            id="refund"
            derived={derived}
            onAction={onAction}
            busy={busy}
            icon={<RefreshCw size={16} aria-hidden="true" />}
            variant="claim"
          >
            {simulation ? "Collect simulated refund" : "Claim refund"}
          </ActionButton>
        </div>
      )}

      {round.status === "DRAFT" && (
        <p className="decision-hint">
          The publisher is still authoring this round. Panels, sources and
          deadlines are frozen the moment it opens.
        </p>
      )}
    </aside>
  );
}

function Zap() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}
