import { Wallet, JsonRpcProvider } from "ethers";
import type { StorageReference } from "@/lib/mock-data";

export const ZERO_G_MAINNET = {
  network: "0G Mainnet" as const,
  chainId: 16661,
  rpcUrl: "https://evmrpc.0g.ai",
  indexerUrl: "https://indexer-storage-turbo.0g.ai",
  flowContractAddress: "0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526",
  explorerBaseUrl: "https://chainscan.0g.ai",
};

export interface ZeroGUploadResult extends StorageReference {
  uploadKey: string;
}

export class ZeroGConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZeroGConfigError";
  }
}

export async function uploadJsonToZeroG(payload: unknown, key: string) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload, null, 2));
  return uploadBytesToZeroG(bytes, key);
}

export async function uploadBytesToZeroG(bytes: Uint8Array, key: string): Promise<ZeroGUploadResult> {
  const privateKey = process.env.ZERO_G_PRIVATE_KEY;

  if (!privateKey) {
    throw new ZeroGConfigError("ZERO_G_PRIVATE_KEY is required for real 0G Storage uploads.");
  }

  const rpcUrl = process.env.ZERO_G_RPC_URL ?? ZERO_G_MAINNET.rpcUrl;
  const indexerUrl = process.env.ZERO_G_INDEXER_URL ?? ZERO_G_MAINNET.indexerUrl;
  const contractAddress = process.env.ZERO_G_FLOW_CONTRACT_ADDRESS ?? ZERO_G_MAINNET.flowContractAddress;
  const chainId = Number(process.env.ZERO_G_CHAIN_ID ?? ZERO_G_MAINNET.chainId);
  const explorerBaseUrl = process.env.ZERO_G_EXPLORER_BASE_URL ?? ZERO_G_MAINNET.explorerBaseUrl;

  const [{ Indexer, MemData }, provider] = await Promise.all([
    import("@0gfoundation/0g-storage-ts-sdk"),
    Promise.resolve(new JsonRpcProvider(rpcUrl, chainId)),
  ]);

  const signer = new Wallet(privateKey, provider);
  const indexer = new Indexer(indexerUrl);
  const file = new MemData(bytes);
  const [result, error] = await indexer.upload(file, rpcUrl, signer, {
    finalityRequired: true,
    expectedReplica: 1,
  });

  if (error) {
    throw error;
  }

  if (!result) {
    throw new Error("0G Storage upload did not return a result.");
  }

  const normalized = normalizeUploadResult(result);
  const txHash = "txHash" in normalized ? normalized.txHash : normalized.txHashes?.[0];

  return {
    provider: "0G Storage",
    network: chainId === ZERO_G_MAINNET.chainId ? "0G Mainnet" : "0G Testnet",
    chainId,
    contractAddress,
    rootHash: normalized.rootHash,
    txHash,
    txHashes: "txHashes" in normalized ? normalized.txHashes : undefined,
    txSeq: "txSeq" in normalized ? normalized.txSeq : undefined,
    txSeqs: "txSeqs" in normalized ? normalized.txSeqs : undefined,
    storageRef: `0g://${normalized.rootHash}`,
    explorerUrl: txHash ? `${explorerBaseUrl.replace(/\/$/, "")}/tx/${txHash}` : undefined,
    uploadedAt: new Date().toISOString(),
    uploadKey: key,
  };
}

function normalizeUploadResult(
  result:
    | { txHash: string; rootHash: string; txSeq: number }
    | { txHashes: string[]; rootHashes: string[]; txSeqs: number[] },
) {
  if ("rootHash" in result) {
    return result;
  }

  return {
    rootHash: result.rootHashes[0],
    txHashes: result.txHashes,
    txSeqs: result.txSeqs,
  };
}
