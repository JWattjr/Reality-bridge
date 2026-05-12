/**
 * Translates raw developer/RPC error messages into simple,
 * user-friendly language. Matches against known patterns from
 * ethers.js, viem, 0G RPC, and Privy.
 */

type ErrorPattern = {
  /** Substring or regex to match against the raw error message */
  match: string | RegExp;
  /** The friendly message the user sees instead */
  friendly: string;
};

const ERROR_PATTERNS: ErrorPattern[] = [
  // Contract-specific errors should be checked before generic ethers errors.
  {
    match: /proof already anchored/i,
    friendly: "This proof already appears to be anchored on-chain. Refresh your proofs; if it still shows pending, retry once.",
  },
  {
    match: /proof id required/i,
    friendly: "The proof id was missing before the on-chain anchor. Please refresh and try again.",
  },
  {
    match: /0g root hash required/i,
    friendly: "The 0G proof root was missing before the on-chain anchor. Please refresh and try again.",
  },

  // Gas / fee errors
  {
    match: /replacement.*(fee|transaction).*underpriced/i,
    friendly: "A previous transaction is still processing. Please wait a moment and try again.",
  },
  {
    match: /insufficient funds/i,
    friendly: "Your wallet doesn't have enough 0G tokens to complete this transaction. Please top up your wallet.",
  },
  {
    match: /gas required exceeds/i,
    friendly: "This transaction needs more gas than available. Please add more 0G tokens to your wallet.",
  },
  {
    match: /nonce.*too (low|high)/i,
    friendly: "A transaction conflict was detected. Please wait a few seconds and retry.",
  },

  // Network / RPC errors
  {
    match: /missing or invalid parameters/i,
    friendly: "The network is temporarily busy. Please wait a moment and try again.",
  },
  {
    match: /network error/i,
    friendly: "Unable to reach the 0G network. Please check your connection and try again.",
  },
  {
    match: /could not coalesce error|internal json-rpc error|json-rpc/i,
    friendly: "The 0G RPC returned a temporary network error. Your proof is saved; retry the anchor in a moment.",
  },
  {
    match: /wrong network|unsupported chain|chain.*not.*configured/i,
    friendly: "Your wallet is not fully switched to 0G Mainnet. Switch networks and retry the anchor.",
  },
  {
    match: /timeout/i,
    friendly: "The request took too long. Please try again.",
  },
  {
    match: /CALL_EXCEPTION/i,
    friendly: "The on-chain transaction failed after reaching the contract. This is not always a gas issue; retry once, then refresh your proofs.",
  },
  {
    match: /CALL_EXCEPTION/i,
    friendly: "The on-chain transaction was rejected. This may be a temporary issue — please retry.",
  },
  {
    match: /execution reverted/i,
    friendly: "The smart contract rejected this action. The proof may have already been anchored.",
  },

  // Wallet / auth errors
  {
    match: /ACTION_REJECTED/i,
    friendly: "The wallet did not approve the transaction. Tap retry when you're ready.",
  },
  {
    match: /user (rejected|denied|cancelled)/i,
    friendly: "You cancelled the transaction. Tap the button again when you're ready.",
  },
  {
    match: /no privy wallet/i,
    friendly: "No wallet found for your account. Please sign out and sign back in.",
  },
  {
    match: /wallet.*not.*available/i,
    friendly: "Your wallet isn't connected. Please sign out and sign back in.",
  },

  // 0G Storage errors
  {
    match: /0g.*storage.*fail/i,
    friendly: "File upload to 0G Storage failed. Please check your connection and try again.",
  },
  {
    match: /upload.*fail/i,
    friendly: "The upload didn't go through. Please try again.",
  },

  // ProofPlay-specific errors
  {
    match: /proof.*already.*exist/i,
    friendly: "You've already completed this mission!",
  },
  {
    match: /check-in.*first/i,
    friendly: "Please check in at the event entrance before completing other missions.",
  },
  {
    match: /code.*word.*require/i,
    friendly: "Please enter the secret code word to complete this mission.",
  },
  {
    match: /photo.*upload.*proof/i,
    friendly: "Please select a photo to upload as proof for this mission.",
  },
  {
    match: /proofregistry.*not.*configured/i,
    friendly: "On-chain anchoring is temporarily unavailable. Please try again later.",
  },
];

/**
 * Takes a raw error (string or Error object) and returns a clean,
 * user-friendly message. Falls back to a generic message if no
 * pattern matches.
 */
export function friendlyError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Something went wrong";

  for (const pattern of ERROR_PATTERNS) {
    const matches =
      typeof pattern.match === "string"
        ? raw.toLowerCase().includes(pattern.match.toLowerCase())
        : pattern.match.test(raw);

    if (matches) return pattern.friendly;
  }

  // If the raw message is short enough and doesn't look like a stack trace,
  // use it directly. Otherwise fall back to a generic message.
  if (raw.length < 120 && !raw.includes("0x") && !raw.includes("\\n")) {
    return raw;
  }

  return "Something went wrong. Please try again.";
}

/**
 * Wraps a pending_anchor status message to be user-friendly while
 * still indicating the proof was saved.
 */
export function friendlyAnchorError(error: unknown, rootHash: string): string {
  const shortRoot = `${rootHash.slice(0, 8)}…${rootHash.slice(-6)}`;
  const message = friendlyError(error);
  return `Your proof is safely saved (${shortRoot}), but the on-chain anchor needs a retry. ${message}`;
}
