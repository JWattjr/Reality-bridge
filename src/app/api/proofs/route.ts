import { readProofRecords } from "@/lib/proof-store";
import { ZERO_G_MAINNET } from "@/lib/zero-g";

export async function GET() {
  const proofs = await readProofRecords();

  return Response.json({
    zeroG: {
      network: ZERO_G_MAINNET.network,
      chainId: ZERO_G_MAINNET.chainId,
      contractAddress: process.env.ZERO_G_FLOW_CONTRACT_ADDRESS ?? ZERO_G_MAINNET.flowContractAddress,
      explorerBaseUrl: process.env.ZERO_G_EXPLORER_BASE_URL ?? ZERO_G_MAINNET.explorerBaseUrl,
    },
    proofs,
  });
}
