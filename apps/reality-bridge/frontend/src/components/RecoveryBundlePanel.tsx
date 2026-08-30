"use client";

import { AlertTriangle, Download, KeyRound, Upload } from "lucide-react";
import { useId, useState } from "react";

import { shortHash } from "@/lib/format";
import {
  bundleFileName,
  parseBundle,
  serializeBundle,
  validateBundle,
  type BundleTarget,
  type RecoveryBundle,
} from "@/lib/recovery";
import { CopyButton } from "@/components/ui";

/**
 * Commit/reveal custody.
 *
 * The salt is only ever useful to its owner, and only in this browser, so the
 * bundle is offered for copy *and* download before the commit signature, and
 * can be re-imported later on any device.
 */
export function BundleExport({
  bundle,
  acknowledged,
  onAcknowledge,
  onError,
}: {
  bundle: RecoveryBundle;
  acknowledged: boolean;
  onAcknowledge: (value: boolean) => void;
  onError: (message: string) => void;
}) {
  const checkboxId = useId();
  const text = serializeBundle(bundle);
  const [downloaded, setDownloaded] = useState(false);

  const download = () => {
    try {
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = bundleFileName(bundle);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      setDownloaded(true);
    } catch {
      onError("The download was blocked. Copy the bundle text instead.");
    }
  };

  return (
    <div className="bundle-export">
      <div className="bundle-head">
        <KeyRound size={15} aria-hidden="true" />
        <strong>Recovery bundle</strong>
      </div>
      <p className="muted-copy">
        This is the only way to open your sealed choice later. Save it outside
        this browser before you sign. Losing it means you cannot reveal, and a
        missed reveal forfeits the crossing.
      </p>
      <label className="visually-hidden" htmlFor={`${checkboxId}-text`}>
        Recovery bundle contents
      </label>
      <textarea
        id={`${checkboxId}-text`}
        className="bundle-text"
        readOnly
        rows={9}
        value={text}
        spellCheck={false}
      />
      <div className="bundle-actions">
        <CopyButton value={text} label="Copy bundle" onError={onError} />
        <button className="ghost-button" type="button" onClick={download}>
          <Download size={14} aria-hidden="true" />
          {downloaded ? "Downloaded" : "Download .json"}
        </button>
      </div>
      <label className="bundle-confirm" htmlFor={checkboxId}>
        <input
          id={checkboxId}
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => onAcknowledge(event.target.checked)}
        />
        <span>I have saved this recovery bundle somewhere I can reach later.</span>
      </label>
    </div>
  );
}

export function BundleImport({
  target,
  onRestore,
}: {
  target: BundleTarget;
  onRestore: (bundle: RecoveryBundle) => void;
}) {
  const fieldId = useId();
  const [text, setText] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);

  const restore = async (raw: string) => {
    setChecking(true);
    setProblems([]);
    try {
      const parsed = parseBundle(raw);
      if (!parsed.ok) {
        setProblems([parsed.error]);
        return;
      }
      const validation = await validateBundle(parsed.bundle, target);
      if (!validation.ok) {
        setProblems(validation.problems);
        return;
      }
      onRestore(parsed.bundle);
      setText("");
    } finally {
      setChecking(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const raw = await file.text();
    setText(raw);
    await restore(raw);
  };

  return (
    <div className="bundle-import">
      <div className="bundle-head">
        <Upload size={15} aria-hidden="true" />
        <strong>Restore a recovery bundle</strong>
      </div>
      <p className="muted-copy">
        Paste the bundle you saved, or load the <code>.json</code> file. It is
        checked against your wallet, this contract, this round and the
        commitment StudioNet already stores for you — nothing is uploaded.
      </p>
      <label className="field-label" htmlFor={fieldId}>
        Recovery bundle JSON
      </label>
      <textarea
        id={fieldId}
        className="bundle-text"
        rows={6}
        value={text}
        spellCheck={false}
        placeholder='{ "version": 1, "network": "studionet", ... }'
        onChange={(event) => setText(event.target.value)}
      />
      <div className="bundle-actions">
        <button
          className="action-button"
          type="button"
          onClick={() => void restore(text)}
          disabled={!text.trim() || checking}
        >
          {checking ? "Checking…" : "Restore bundle"}
        </button>
        <label className="ghost-button file-button">
          <Upload size={14} aria-hidden="true" /> Load file
          <input
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
        </label>
      </div>
      {problems.length > 0 && (
        <ul className="bundle-problems" role="alert">
          {problems.map((problem) => (
            <li key={problem}>
              <AlertTriangle size={13} aria-hidden="true" /> {problem}
            </li>
          ))}
        </ul>
      )}
      {target.onChainCommitment && (
        <p className="muted-copy">
          Commitment stored on StudioNet:{" "}
          <code>{shortHash(target.onChainCommitment, 12, 8)}</code>
        </p>
      )}
    </div>
  );
}
