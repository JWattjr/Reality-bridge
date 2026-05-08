import { PROOF_TYPE_COPY } from "@/lib/mock-data";
import {
  VerificationError,
  createVerificationProof,
  type VerificationSubmission,
} from "@/lib/verification";
import { appendProofRecord } from "@/lib/proof-store";
import { ZERO_G_MAINNET, ZeroGConfigError } from "@/lib/zero-g";

export async function GET() {
  return Response.json({
    zeroG: {
      network: ZERO_G_MAINNET.network,
      chainId: ZERO_G_MAINNET.chainId,
      rpcUrl: ZERO_G_MAINNET.rpcUrl,
      indexerUrl: ZERO_G_MAINNET.indexerUrl,
      contractAddress: process.env.ZERO_G_FLOW_CONTRACT_ADDRESS ?? ZERO_G_MAINNET.flowContractAddress,
      explorerBaseUrl: process.env.ZERO_G_EXPLORER_BASE_URL ?? ZERO_G_MAINNET.explorerBaseUrl,
      configured: Boolean(process.env.ZERO_G_PRIVATE_KEY),
    },
    methods: PROOF_TYPE_COPY,
    flow: [
      "user completes action",
      "backend validates mission evidence",
      "proof JSON and optional media are uploaded to 0G Storage",
      "root hash is saved beside mission status and badge metadata",
    ],
  });
}

export async function POST(request: Request) {
  let submission: VerificationSubmission;

  try {
    submission = await request.json();
  } catch {
    return Response.json({ status: "rejected", issues: ["Invalid JSON body"] }, { status: 400 });
  }

  try {
    const result = await createVerificationProof(submission);
    await appendProofRecord(result.proofRecord);

    return Response.json({
      status: "verified",
      proofRecord: result.proofRecord,
      databaseWrite: result.databaseWrite,
      zeroG: result.proofRecord.storage,
    });
  } catch (error) {
    if (error instanceof VerificationError) {
      return Response.json({ status: "rejected", issues: error.issues }, { status: 422 });
    }

    if (error instanceof ZeroGConfigError) {
      return Response.json({ status: "not_configured", issues: [error.message] }, { status: 503 });
    }

    return Response.json(
      { status: "error", issues: [error instanceof Error ? error.message : "Verification failed"] },
      { status: 500 },
    );
  }
}
