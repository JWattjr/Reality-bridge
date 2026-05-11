import { authenticateRequest } from "@/lib/privy-server";
import { readProofRecords } from "@/lib/proof-store";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { ZERO_G_MAINNET } from "@/lib/zero-g";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId");

  const { userId, error, status } = await authenticateRequest(request);

  if (error || !userId) {
    return Response.json(
      {
        status: "wallet_required",
        issues: [error ?? "Proof reads must be scoped to the signed-in Privy wallet."],
        proofs: [],
      },
      { status },
    );
  }

  const proofs = (await readProofRecords()).filter((proof) => {
    const sameUser = proof.userId.toLowerCase() === userId.toLowerCase();
    const sameEvent = eventId ? proof.eventId === eventId : true;
    return sameUser && sameEvent;
  });

  return Response.json({
    zeroG: {
      network: ZERO_G_MAINNET.network,
      chainId: ZERO_G_MAINNET.chainId,
      contractAddress: process.env.ZERO_G_FLOW_CONTRACT_ADDRESS ?? ZERO_G_MAINNET.flowContractAddress,
      proofRegistryAddress: process.env.NEXT_PUBLIC_PROOF_REGISTRY_ADDRESS ?? null,
      explorerBaseUrl: process.env.ZERO_G_EXPLORER_BASE_URL ?? ZERO_G_MAINNET.explorerBaseUrl,
    },
    database: {
      provider: hasSupabaseConfig() ? "supabase" : "memory-fallback",
    },
    proofs,
  });
}

