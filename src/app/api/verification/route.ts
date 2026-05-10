import { PROOF_TYPE_COPY } from "@/lib/mock-data";
import { ZERO_G_MAINNET } from "@/lib/zero-g";

export async function GET() {
  return Response.json({
    zeroG: {
      network: ZERO_G_MAINNET.network,
      chainId: ZERO_G_MAINNET.chainId,
      rpcUrl: ZERO_G_MAINNET.rpcUrl,
      indexerUrl: ZERO_G_MAINNET.indexerUrl,
      contractAddress: process.env.ZERO_G_FLOW_CONTRACT_ADDRESS ?? ZERO_G_MAINNET.flowContractAddress,
      proofRegistryAddress: process.env.NEXT_PUBLIC_PROOF_REGISTRY_ADDRESS ?? null,
      explorerBaseUrl: process.env.ZERO_G_EXPLORER_BASE_URL ?? ZERO_G_MAINNET.explorerBaseUrl,
      configured: true,
      userPaidEndpoint: "/api/verification/prepare",
    },
    methods: PROOF_TYPE_COPY,
    flow: [
      "user completes action",
      "backend validates mission evidence and prepares a canonical proof payload",
      "user uploads proof JSON and optional media to 0G Storage from their Privy wallet",
      "0G root hash and transaction are saved beside mission status and badge metadata",
    ],
  });
}

export async function POST() {
  return Response.json(
    {
      status: "user_wallet_required",
      issues: ["Mission proofs must be uploaded through /api/verification/prepare and paid from the user's Privy wallet."],
    },
    { status: 409 },
  );
}
