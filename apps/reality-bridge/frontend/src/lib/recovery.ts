import { choiceCommitment } from "@/lib/crypto";
import { NETWORK_CHAIN_ID, NETWORK_KEY } from "@/lib/network";

/**
 * A sealed choice is worthless without its salt. The salt therefore lives in a
 * portable, self-describing bundle the player is asked to keep *outside* this
 * browser, not only in React state or session storage.
 */
export const RECOVERY_BUNDLE_VERSION = 1;

export interface RecoveryBundle {
  version: number;
  network: string;
  chainId: number;
  contract: string;
  roundId: string;
  tileIndex: number;
  account: string;
  choice: "YES" | "NO";
  salt: string;
  commitment: string;
  createdAt: number;
}

export interface BundleTarget {
  contract: string;
  roundId: string;
  tileIndex: number;
  account: string;
  /** Commitment currently stored on chain for this runner, when known. */
  onChainCommitment?: string;
}

export function buildBundle(params: {
  contract: string;
  roundId: string;
  tileIndex: number;
  account: string;
  choice: "YES" | "NO";
  salt: string;
  commitment: string;
  createdAt?: number;
}): RecoveryBundle {
  return {
    version: RECOVERY_BUNDLE_VERSION,
    network: NETWORK_KEY,
    chainId: NETWORK_CHAIN_ID,
    contract: params.contract.toLowerCase(),
    roundId: String(params.roundId),
    tileIndex: params.tileIndex,
    account: params.account.toLowerCase(),
    choice: params.choice,
    salt: params.salt,
    commitment: params.commitment.toLowerCase(),
    createdAt: params.createdAt ?? Date.now(),
  };
}

export function serializeBundle(bundle: RecoveryBundle): string {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}

export function bundleFileName(bundle: RecoveryBundle): string {
  return `reality-bridge-round${bundle.roundId}-panel${bundle.tileIndex}-${bundle.account.slice(
    0,
    10,
  )}.json`;
}

function isChoice(value: unknown): value is "YES" | "NO" {
  return value === "YES" || value === "NO";
}

export type ParseResult =
  | { ok: true; bundle: RecoveryBundle }
  | { ok: false; error: string };

/** Parse pasted or uploaded text without trusting any of its fields. */
export function parseBundle(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That is not valid JSON." };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "A recovery bundle must be a JSON object." };
  }
  const value = raw as Record<string, unknown>;

  if (typeof value.version !== "number") {
    return { ok: false, error: "The bundle has no version field." };
  }
  if (value.version !== RECOVERY_BUNDLE_VERSION) {
    return {
      ok: false,
      error: `Unsupported bundle version ${value.version}. This app reads version ${RECOVERY_BUNDLE_VERSION}.`,
    };
  }
  for (const key of ["contract", "roundId", "account", "salt", "commitment"]) {
    if (typeof value[key] !== "string" || (value[key] as string).length === 0) {
      return { ok: false, error: `The bundle is missing "${key}".` };
    }
  }
  if (typeof value.tileIndex !== "number" || !Number.isInteger(value.tileIndex)) {
    return { ok: false, error: 'The bundle is missing a numeric "tileIndex".' };
  }
  if (!isChoice(value.choice)) {
    return { ok: false, error: 'The bundle "choice" must be YES or NO.' };
  }

  return {
    ok: true,
    bundle: {
      version: RECOVERY_BUNDLE_VERSION,
      network: typeof value.network === "string" ? value.network : "",
      chainId: typeof value.chainId === "number" ? value.chainId : 0,
      contract: (value.contract as string).toLowerCase(),
      roundId: String(value.roundId),
      tileIndex: value.tileIndex,
      account: (value.account as string).toLowerCase(),
      choice: value.choice,
      salt: value.salt as string,
      commitment: (value.commitment as string).toLowerCase(),
      createdAt: typeof value.createdAt === "number" ? value.createdAt : 0,
    },
  };
}

export interface ValidationResult {
  ok: boolean;
  problems: string[];
}

/**
 * Check a bundle against the connected account, the configured contract, the
 * selected round/panel and the commitment the contract actually stores.
 *
 * The salt is re-hashed locally, so an edited or mismatched bundle is caught
 * before the player wastes a reveal transaction.
 */
export async function validateBundle(
  bundle: RecoveryBundle,
  target: BundleTarget,
): Promise<ValidationResult> {
  const problems: string[] = [];

  if (bundle.network && bundle.network !== NETWORK_KEY) {
    problems.push(`The bundle was created for "${bundle.network}", not StudioNet.`);
  }
  if (bundle.chainId && bundle.chainId !== NETWORK_CHAIN_ID) {
    problems.push(
      `The bundle was created for chain ${bundle.chainId}, not ${NETWORK_CHAIN_ID}.`,
    );
  }
  if (bundle.contract !== target.contract.toLowerCase()) {
    problems.push("The bundle belongs to a different Reality Bridge contract.");
  }
  if (String(bundle.roundId) !== String(target.roundId)) {
    problems.push(`The bundle belongs to round ${bundle.roundId}.`);
  }
  if (bundle.tileIndex !== target.tileIndex) {
    problems.push(`The bundle belongs to panel ${bundle.tileIndex + 1}.`);
  }
  if (bundle.account !== target.account.toLowerCase()) {
    problems.push("The bundle belongs to a different wallet address.");
  }

  let recomputed = "";
  try {
    recomputed = await choiceCommitment({
      roundId: bundle.roundId,
      tileIndex: bundle.tileIndex,
      account: bundle.account,
      choice: bundle.choice,
      salt: bundle.salt,
    });
  } catch (error) {
    problems.push(
      error instanceof Error ? error.message : "Could not recompute the commitment.",
    );
  }

  if (recomputed && recomputed !== bundle.commitment) {
    problems.push(
      "The salt and choice in this bundle do not reproduce its own commitment.",
    );
  }
  if (
    recomputed &&
    target.onChainCommitment &&
    recomputed !== target.onChainCommitment.toLowerCase()
  ) {
    problems.push(
      "This bundle does not match the commitment stored on StudioNet for you.",
    );
  }

  return { ok: problems.length === 0, problems };
}
