import { NATIVE_DECIMALS, NATIVE_SYMBOL } from "@/lib/network";

const WEI_PER_UNIT = BigInt(10) ** BigInt(NATIVE_DECIMALS);

/** Render a wei amount with up to `precision` decimals and no rounding lies. */
export function formatAmount(value: string | bigint, precision = 4): string {
  let wei: bigint;
  try {
    wei = typeof value === "bigint" ? value : BigInt(value || "0");
  } catch {
    return `${String(value)} ${NATIVE_SYMBOL}`;
  }
  const negative = wei < BigInt(0);
  const absolute = negative ? -wei : wei;
  const whole = absolute / WEI_PER_UNIT;
  const remainder = absolute % WEI_PER_UNIT;
  const fraction = remainder
    .toString()
    .padStart(NATIVE_DECIMALS, "0")
    .slice(0, precision)
    .replace(/0+$/, "");
  const sign = negative ? "-" : "";
  return fraction
    ? `${sign}${whole.toString()}.${fraction} ${NATIVE_SYMBOL}`
    : `${sign}${whole.toString()} ${NATIVE_SYMBOL}`;
}

/** Exact rendering, all 18 decimals, for pre-signature disclosure. */
export function formatExactAmount(value: string | bigint): string {
  let wei: bigint;
  try {
    wei = typeof value === "bigint" ? value : BigInt(value || "0");
  } catch {
    return `${String(value)} ${NATIVE_SYMBOL}`;
  }
  const whole = wei / WEI_PER_UNIT;
  const fraction = (wei % WEI_PER_UNIT).toString().padStart(NATIVE_DECIMALS, "0");
  return `${whole.toString()}.${fraction} ${NATIVE_SYMBOL}`;
}

export function shortAddress(value: string): string {
  if (!value) return "";
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function shortHash(value: string, lead = 10, tail = 8): string {
  if (!value) return "";
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

export function sameAddress(a: string, b: string): boolean {
  return Boolean(a) && Boolean(b) && a.toLowerCase() === b.toLowerCase();
}

const DATE_FORMAT = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

export function formatTimestamp(seconds: number): string {
  if (!seconds) return "—";
  return DATE_FORMAT.format(new Date(seconds * 1000));
}

export function formatIso(seconds: number): string {
  if (!seconds) return "";
  return new Date(seconds * 1000).toISOString();
}

/** Human countdown such as `2d 04h`, `18m 20s`, or `elapsed`. */
export function formatCountdown(targetSeconds: number, nowSeconds: number): string {
  if (!targetSeconds) return "—";
  const delta = targetSeconds - nowSeconds;
  if (delta <= 0) return "elapsed";
  const days = Math.floor(delta / 86400);
  const hours = Math.floor((delta % 86400) / 3600);
  const minutes = Math.floor((delta % 3600) / 60);
  const seconds = delta % 60;
  if (days > 0) return `${days}d ${String(hours).padStart(2, "0")}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
