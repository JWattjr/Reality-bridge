import type { ProofChainAnchor, ProofRecord, StorageReference } from "@/lib/mock-data";
import { appendProofRecord } from "@/lib/proof-store";
import {
  VerificationError,
  prepareVerificationProof,
  type VerificationSubmission,
} from "@/lib/verification";

type CompletionBody = {
  submission: VerificationSubmission;
  storage: StorageReference;
  mediaStorage?: StorageReference;
  chainAnchor?: ProofChainAnchor;
};

export async function POST(request: Request) {
  let body: CompletionBody;

  try {
    body = await request.json();
  } catch {
    return Response.json({ status: "rejected", issues: ["Invalid JSON body"] }, { status: 400 });
  }

  try {
    const prepared = prepareVerificationProof(body.submission, { requireMediaPayload: false });

    if (!isZeroGStorageReference(body.storage)) {
      return Response.json({ status: "rejected", issues: ["Missing valid 0G proof storage receipt"] }, { status: 422 });
    }

    if (body.submission.proofType === "photo_upload" && !isZeroGStorageReference(body.mediaStorage)) {
      return Response.json({ status: "rejected", issues: ["Photo proof requires a 0G media storage receipt"] }, { status: 422 });
    }

    const hasChainAnchor = isProofChainAnchor(body.chainAnchor);

    const proofStatus = hasChainAnchor ? "validated" : "pending_anchor";

    const proofRecord: ProofRecord = {
      ...prepared.proofRecord,
      status: proofStatus as ProofRecord["status"],
      storage: body.storage,
      mediaStorage: body.mediaStorage,
      chainAnchor: hasChainAnchor ? body.chainAnchor : undefined,
    };

    await appendProofRecord(proofRecord);

    return Response.json({
      status: proofStatus,
      uploadMode: "user_paid",
      proofRecord,
      databaseWrite: {
        userId: proofRecord.userId,
        eventId: proofRecord.eventId,
        missionId: proofRecord.missionId,
        xpDelta: proofRecord.xpEarned,
        missionStatus: proofStatus === "validated" ? "completed" : "pending_anchor",
        proofRootHash: proofRecord.storage.rootHash,
        badgeId: proofRecord.badgeId,
      },
      zeroG: proofRecord.storage,
    });
  } catch (error) {
    if (error instanceof VerificationError) {
      return Response.json({ status: "rejected", issues: error.issues }, { status: 422 });
    }

    return Response.json(
      { status: "error", issues: [error instanceof Error ? error.message : "Verification completion failed"] },
      { status: 500 },
    );
  }
}

function isZeroGStorageReference(value: unknown): value is StorageReference {
  if (!value || typeof value !== "object") return false;

  const storage = value as Partial<StorageReference>;

  return (
    storage.provider === "0G Storage" &&
    typeof storage.rootHash === "string" &&
    storage.rootHash.startsWith("0x") &&
    typeof storage.contractAddress === "string" &&
    storage.contractAddress.startsWith("0x")
  );
}

function isProofChainAnchor(value: unknown): value is ProofChainAnchor {
  if (!value || typeof value !== "object") return false;

  const anchor = value as Partial<ProofChainAnchor>;
  const expectedContract = process.env.NEXT_PUBLIC_PROOF_REGISTRY_ADDRESS?.toLowerCase();

  return (
    anchor.network === "0G Mainnet" &&
    anchor.chainId === 16661 &&
    typeof anchor.contractAddress === "string" &&
    anchor.contractAddress.startsWith("0x") &&
    (!expectedContract || anchor.contractAddress.toLowerCase() === expectedContract) &&
    typeof anchor.proofKey === "string" &&
    anchor.proofKey.startsWith("0x") &&
    typeof anchor.txHash === "string" &&
    anchor.txHash.startsWith("0x") &&
    typeof anchor.anchoredAt === "string"
  );
}
