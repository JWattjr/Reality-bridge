import { studionet } from "genlayer-js/chains";
import type { GenLayerChain } from "genlayer-js/types";

/**
 * GenLayer StudioNet is the only network Reality Bridge supports.
 *
 * Every network fact in the product — chain id, RPC endpoint, explorer links,
 * currency symbol and the user-facing label — is derived from this module so
 * there is exactly one place to audit.
 */
export const NETWORK: GenLayerChain = studionet;

export const NETWORK_KEY = "studionet" as const;
export const NETWORK_LABEL = "GenLayer StudioNet";
export const NETWORK_CHAIN_ID = NETWORK.id;
export const NETWORK_CHAIN_ID_HEX = `0x${NETWORK.id.toString(16)}`;
export const NATIVE_SYMBOL = NETWORK.nativeCurrency.symbol;
export const NATIVE_DECIMALS = NETWORK.nativeCurrency.decimals;

/** Optional override for a self-hosted StudioNet endpoint. */
export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_GENLAYER_RPC?.trim() ||
  NETWORK.rpcUrls.default.http[0];

const EXPLORER_BASE = (
  process.env.NEXT_PUBLIC_GENLAYER_EXPLORER?.trim() ||
  NETWORK.blockExplorers?.default.url ||
  ""
).replace(/\/+$/, "");

export const HAS_EXPLORER = EXPLORER_BASE.length > 0;

export function explorerTxUrl(hash: string): string | null {
  if (!HAS_EXPLORER || !hash) return null;
  return `${EXPLORER_BASE}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string | null {
  if (!HAS_EXPLORER || !address) return null;
  return `${EXPLORER_BASE}/contracts/${address}`;
}

export interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function getInjectedProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

/** Normalise `eth_chainId` (hex string) into a number, or null when unknown. */
export function parseChainId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value.startsWith("0x") ? BigInt(value) : value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function readChainId(
  provider: EthereumProvider,
): Promise<number | null> {
  try {
    return parseChainId(await provider.request({ method: "eth_chainId" }));
  } catch {
    return null;
  }
}

const CHAIN_NOT_ADDED = 4902;

function errorCode(error: unknown): number | null {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "number") return code;
  }
  return null;
}

/**
 * Ask the wallet to switch to StudioNet, adding the network when the wallet
 * does not know it yet. Returns true only when the wallet reports StudioNet
 * afterwards, so callers never assume a switch that did not happen.
 */
export async function switchToStudioNet(
  provider: EthereumProvider,
): Promise<{ ok: boolean; message?: string }> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: NETWORK_CHAIN_ID_HEX }],
    });
  } catch (error) {
    if (errorCode(error) !== CHAIN_NOT_ADDED) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : `Your wallet declined the switch to ${NETWORK_LABEL}.`,
      };
    }
    try {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: NETWORK_CHAIN_ID_HEX,
            chainName: NETWORK_LABEL,
            nativeCurrency: {
              name: NETWORK.nativeCurrency.name,
              symbol: NATIVE_SYMBOL,
              decimals: NATIVE_DECIMALS,
            },
            rpcUrls: [RPC_ENDPOINT],
            ...(HAS_EXPLORER ? { blockExplorerUrls: [EXPLORER_BASE] } : {}),
          },
        ],
      });
    } catch (addError) {
      return {
        ok: false,
        message:
          addError instanceof Error
            ? addError.message
            : `Your wallet could not add ${NETWORK_LABEL}.`,
      };
    }
  }

  const chainId = await readChainId(provider);
  if (chainId === NETWORK_CHAIN_ID) return { ok: true };
  return {
    ok: false,
    message: `The wallet is still on chain ${chainId ?? "unknown"}.`,
  };
}
