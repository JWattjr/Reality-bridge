"use client";

import { BrowserProvider } from "ethers";
import type { StorageReference } from "@/lib/mock-data";

const ZERO_G_CLIENT = {
  network: "0G Mainnet" as const,
  chainId: 16661,
  rpcUrl: "https://evmrpc.0g.ai",
  indexerUrl: "https://indexer-storage-turbo.0g.ai",
  flowContractAddress: "0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526",
  explorerBaseUrl: "https://chainscan.0g.ai",
};

export type UserPaidZeroGWallet = {
  address: string;
  switchChain: (targetChainId: `0x${string}` | number) => Promise<void>;
  getEthereumProvider: () => Promise<unknown>;
};

export async function uploadJsonToZeroGWithWallet(
  payload: unknown,
  key: string,
  wallet: UserPaidZeroGWallet,
) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload, null, 2));
  return uploadBytesToZeroGWithWallet(bytes, key, wallet);
}

export async function uploadFileToZeroGWithWallet(file: File, key: string, wallet: UserPaidZeroGWallet) {
  return uploadBytesToZeroGWithWallet(new Uint8Array(await file.arrayBuffer()), key, wallet);
}

async function uploadBytesToZeroGWithWallet(
  bytes: Uint8Array,
  key: string,
  wallet: UserPaidZeroGWallet,
): Promise<StorageReference> {
  await wallet.switchChain(ZERO_G_CLIENT.chainId);

  const eip1193Provider = await wallet.getEthereumProvider();
  const provider = new BrowserProvider(
    eip1193Provider as ConstructorParameters<typeof BrowserProvider>[0],
    ZERO_G_CLIENT.chainId,
  );
  const signer = await provider.getSigner();
  const { Indexer, MemData } = await import("@0gfoundation/0g-storage-ts-sdk/browser");
  const indexer = new Indexer(ZERO_G_CLIENT.indexerUrl);
  const file = new MemData(bytes);
  const [result, error] = await indexer.upload(file, ZERO_G_CLIENT.rpcUrl, signer, {
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
    network: ZERO_G_CLIENT.network,
    chainId: ZERO_G_CLIENT.chainId,
    contractAddress: ZERO_G_CLIENT.flowContractAddress,
    rootHash: normalized.rootHash,
    txHash,
    txHashes: "txHashes" in normalized ? normalized.txHashes : undefined,
    txSeq: "txSeq" in normalized ? normalized.txSeq : undefined,
    txSeqs: "txSeqs" in normalized ? normalized.txSeqs : undefined,
    storageRef: `0g://${normalized.rootHash}`,
    explorerUrl: txHash ? `${ZERO_G_CLIENT.explorerBaseUrl}/tx/${txHash}` : undefined,
    uploadedAt: new Date().toISOString(),
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
