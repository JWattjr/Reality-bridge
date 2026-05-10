"use client";

import { BrowserProvider, Contract, id as hashId, isAddress } from "ethers";
import type { ProofChainAnchor, ProofRecord } from "@/lib/mock-data";
import type { UserPaidZeroGWallet } from "@/lib/zero-g-client";

const PROOF_REGISTRY_ABI = [
  {
    type: "function",
    name: "anchorProof",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proofRecordId", type: "string" },
      { name: "eventId", type: "string" },
      { name: "missionId", type: "string" },
      { name: "proofRootHash", type: "string" },
      { name: "mediaRootHash", type: "string" },
      { name: "xpEarned", type: "uint256" },
    ],
    outputs: [{ name: "proofKey", type: "bytes32" }],
  },
] as const;

const ZERO_G_CHAIN_ID = 16661;
const ZERO_G_EXPLORER_BASE_URL = "https://chainscan.0g.ai";

export function getProofRegistryAddress() {
  const address = process.env.NEXT_PUBLIC_PROOF_REGISTRY_ADDRESS;
  return address && isAddress(address) ? address : null;
}

export function isProofRegistryConfigured() {
  return Boolean(getProofRegistryAddress());
}

export async function anchorProofOnRegistry(
  proofRecord: ProofRecord,
  wallet: UserPaidZeroGWallet,
): Promise<ProofChainAnchor> {
  const contractAddress = getProofRegistryAddress();

  if (!contractAddress) {
    throw new Error("ProofRegistry contract is not configured. Add NEXT_PUBLIC_PROOF_REGISTRY_ADDRESS after deployment.");
  }

  await wallet.switchChain(ZERO_G_CHAIN_ID);

  const eip1193Provider = await wallet.getEthereumProvider();
  const provider = new BrowserProvider(
    eip1193Provider as ConstructorParameters<typeof BrowserProvider>[0],
    ZERO_G_CHAIN_ID,
  );
  const signer = await provider.getSigner();
  const contract = new Contract(contractAddress, PROOF_REGISTRY_ABI, signer);
  const tx = await contract.anchorProof(
    proofRecord.id,
    proofRecord.eventId,
    proofRecord.missionId,
    proofRecord.storage.rootHash,
    proofRecord.mediaStorage?.rootHash ?? "",
    proofRecord.xpEarned,
  );
  const receipt = await tx.wait();
  const txHash = receipt?.hash ?? tx.hash;

  return {
    network: "0G Mainnet",
    chainId: ZERO_G_CHAIN_ID,
    contractAddress,
    proofKey: hashId(proofRecord.id),
    txHash,
    explorerUrl: `${ZERO_G_EXPLORER_BASE_URL}/tx/${txHash}`,
    anchoredAt: new Date().toISOString(),
  };
}
