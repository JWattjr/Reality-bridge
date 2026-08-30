"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { formatCountdown, formatTimestamp, nowSeconds } from "@/lib/format";
import { getInjectedProvider } from "@/lib/network";

/**
 * Whether this browser exposes an injected wallet.
 *
 * Read through `useSyncExternalStore` so the value comes from the browser
 * rather than being copied into React state by an effect, and so server
 * rendering assumes a wallet is present instead of flashing a warning.
 */
function subscribeProvider(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("ethereum#initialized", listener);
  return () => window.removeEventListener("ethereum#initialized", listener);
}

export function useHasInjectedProvider(): boolean {
  return useSyncExternalStore(
    subscribeProvider,
    () => getInjectedProvider() !== null,
    () => true,
  );
}

/** One shared clock so every countdown on the page ticks together. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState<number>(() => nowSeconds());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(nowSeconds()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export function Countdown({
  label,
  target,
  now,
}: {
  label: string;
  target: number;
  now: number;
}) {
  const remaining = formatCountdown(target, now);
  const elapsed = remaining === "elapsed";
  return (
    <div className={elapsed ? "countdown countdown-elapsed" : "countdown"}>
      <span className="countdown-label">{label}</span>
      <strong>{remaining}</strong>
      <span className="countdown-abs">{formatTimestamp(target)}</span>
    </div>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "neutral" | "good" | "warn" | "bad" | "busy";
  children: React.ReactNode;
}) {
  return <span className={`status-pill tone-${tone}`}>{children}</span>;
}

export function CopyButton({
  value,
  label,
  onError,
}: {
  value: string;
  label: string;
  onError?: (message: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (timer.current !== undefined) window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      onError?.(
        "Clipboard access was blocked. Use the download button or select the text manually.",
      );
    }
  }, [onError, value]);

  return (
    <button
      className="ghost-button"
      type="button"
      onClick={() => void copy()}
      disabled={!value}
    >
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      {copied ? "Copied" : label}
    </button>
  );
}

export function ExternalLinkOut({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a className="external-link" href={href} target="_blank" rel="noreferrer noopener">
      {children} <ExternalLink size={12} aria-hidden="true" />
    </a>
  );
}

export function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field-row">
      <span>{label}</span>
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
      {action}
    </div>
  );
}
