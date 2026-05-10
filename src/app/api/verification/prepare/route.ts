import { PROOF_TYPE_COPY } from "@/lib/mock-data";
import {
  VerificationError,
  prepareVerificationProof,
  type VerificationSubmission,
} from "@/lib/verification";
import { ZERO_G_MAINNET } from "@/lib/zero-g";

export async function POST(request: Request) {
  let submission: VerificationSubmission;

  try {
    submission = await request.json();
  } catch {
    return Response.json({ status: "rejected", issues: ["Invalid JSON body"] }, { status: 400 });
  }

  try {
    const prepared = prepareVerificationProof(submission, { requireMediaPayload: false });

    return Response.json({
      status: "prepared",
      uploadMode: "user_paid",
      prepared,
      zeroG: {
        network: ZERO_G_MAINNET.network,
        chainId: Number(process.env.ZERO_G_CHAIN_ID ?? ZERO_G_MAINNET.chainId),
        rpcUrl: process.env.ZERO_G_RPC_URL ?? ZERO_G_MAINNET.rpcUrl,
        indexerUrl: process.env.ZERO_G_INDEXER_URL ?? ZERO_G_MAINNET.indexerUrl,
        contractAddress: process.env.ZERO_G_FLOW_CONTRACT_ADDRESS ?? ZERO_G_MAINNET.flowContractAddress,
        proofRegistryAddress: process.env.NEXT_PUBLIC_PROOF_REGISTRY_ADDRESS ?? null,
        explorerBaseUrl: process.env.ZERO_G_EXPLORER_BASE_URL ?? ZERO_G_MAINNET.explorerBaseUrl,
      },
      methods: PROOF_TYPE_COPY,
    });
  } catch (error) {
    if (error instanceof VerificationError) {
      return Response.json({ status: "rejected", issues: error.issues }, { status: 422 });
    }

    return Response.json(
      { status: "error", issues: [error instanceof Error ? error.message : "Verification preparation failed"] },
      { status: 500 },
    );
  }
}
