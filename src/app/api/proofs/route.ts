import { readProofRecords } from "@/lib/proof-store";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { ZERO_G_MAINNET } from "@/lib/zero-g";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const eventId = url.searchParams.get("eventId");
  const proofs = (await readProofRecords()).filter((proof) => {
    const sameUser = userId ? proof.userId.toLowerCase() === userId.toLowerCase() : true;
    const sameEvent = eventId ? proof.eventId === eventId : true;
    return sameUser && sameEvent;
  });

  return Response.json({
    zeroG: {
      network: ZERO_G_MAINNET.network,
      chainId: ZERO_G_MAINNET.chainId,
      contractAddress: process.env.ZERO_G_FLOW_CONTRACT_ADDRESS ?? ZERO_G_MAINNET.flowContractAddress,
      explorerBaseUrl: process.env.ZERO_G_EXPLORER_BASE_URL ?? ZERO_G_MAINNET.explorerBaseUrl,
    },
    database: {
      provider: hasSupabaseConfig() ? "supabase" : "memory-fallback",
    },
    proofs,
  });
}
