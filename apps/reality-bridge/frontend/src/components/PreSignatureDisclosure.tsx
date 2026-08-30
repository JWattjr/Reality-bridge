"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";

import type { ConfigView, RoundView } from "@/lib/contract";
import { CONTRACT_ADDRESS } from "@/lib/contract";
import { describeEntry } from "@/lib/economics";
import { formatExactAmount, formatTimestamp } from "@/lib/format";
import { NATIVE_SYMBOL, NETWORK_LABEL } from "@/lib/network";
import { FieldRow } from "@/components/ui";

/**
 * Everything the player must be able to read before the join signature.
 *
 * Amounts are shown at full precision; ranges are projections from the
 * contract's own economics constants, never a promise.
 */
export default function PreSignatureDisclosure({
  round,
  config,
  onConfirm,
  onCancel,
  busy,
}: {
  round: RoundView;
  config: ConfigView;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const disclosure = describeEntry(round, config);

  return (
    <div
      className="disclosure"
      role="dialog"
      aria-modal="false"
      aria-labelledby="disclosure-heading"
    >
      <div className="disclosure-head">
        <ShieldAlert size={18} aria-hidden="true" />
        <h4 id="disclosure-heading">Before you sign</h4>
      </div>

      <dl className="disclosure-grid">
        <FieldRow label="You will send">
          <strong>{formatExactAmount(disclosure.entryWei)}</strong>
        </FieldRow>
        <FieldRow label="Maximum possible loss">
          <strong>{formatExactAmount(disclosure.maximumLossWei)}</strong> — the
          contract can never take more than your entry.
        </FieldRow>
        <FieldRow label="Protocol fee">
          {disclosure.protocolFeeBps === 0
            ? `Zero. 0 basis points; the whole pool is distributed to players.`
            : `${disclosure.protocolFeeBps} basis points.`}
        </FieldRow>
        <FieldRow label="Possible payout">
          Between <strong>0 {NATIVE_SYMBOL}</strong> (eliminated) and{" "}
          <strong>{formatExactAmount(disclosure.bestCaseWei)}</strong> (sole
          survivor of a {round.player_count + 1}-seat pool). A survivor with no
          discovery credits receives about{" "}
          <strong>{formatExactAmount(disclosure.passiveSurvivorWei)}</strong>.
          Survivor weight is {config.base_weight} +{" "}
          {config.credit_weight} × discovery credits.
        </FieldRow>
        <FieldRow label="Refund conditions">
          Your exact entry becomes individually claimable if the publisher
          cancels the round, if fewer than {config.min_players} players join, if
          no runner survives, or if the round reaches its terminal deadline on{" "}
          {formatTimestamp(round.terminal_deadline)}.
        </FieldRow>
        <FieldRow label="Transactions to expect">
          <ol className="disclosure-steps">
            {disclosure.expectedTransactions.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </FieldRow>
        <FieldRow label="Deadline consequences">
          Missing your commit window or your reveal window eliminates you from
          the crossing, and anyone may trigger that forfeit. Elimination pays
          nothing at settlement.
        </FieldRow>
        <FieldRow label="Contract and round">
          <code className="wrap-anywhere">{CONTRACT_ADDRESS}</code>
          <br />
          Round {round.round_id} on {NETWORK_LABEL}.
        </FieldRow>
      </dl>

      <p className="disclosure-warning">
        <AlertTriangle size={14} aria-hidden="true" />
        Your sealed choice can only be opened with the salt in your recovery
        bundle. If you lose that bundle you cannot reveal, and you forfeit the
        crossing. {NATIVE_SYMBOL} on {NETWORK_LABEL} is a test asset with no
        real-world value.
      </p>

      <div className="disclosure-actions">
        <button className="action-button" type="button" onClick={onConfirm} disabled={busy}>
          I understand — continue to the wallet
        </button>
        <button className="ghost-button" type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
