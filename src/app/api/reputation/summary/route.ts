import { authenticateRequest } from "@/lib/privy-server";
import { readProofRecords } from "@/lib/proof-store";
import { buildReputationAgentSummary } from "@/lib/reputation-agent";
import { uploadJsonToZeroG } from "@/lib/zero-g";
import {
  ZeroGComputeConfigError,
  attachComputeFallback,
  generateReputationWithZeroGCompute,
} from "@/lib/zero-g-compute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId, error, status } = await authenticateRequest(request);

  if (error || !userId) {
    return Response.json(
      { status: "wallet_required", issues: [error ?? "Reputation summaries must be scoped to the signed-in Privy wallet."] },
      { status },
    );
  }

  const proofs = await readProofRecords();
  const deterministicSummary = buildReputationAgentSummary(proofs, userId);

  if (deterministicSummary.metrics.totalProofs === 0) {
    return Response.json(
      { status: "rejected", issues: ["No proof records available for this reputation summary."] },
      { status: 422 },
    );
  }

  try {
    let summary = deterministicSummary;

    try {
      summary = await generateReputationWithZeroGCompute(deterministicSummary);
    } catch (error) {
      summary = attachComputeFallback(deterministicSummary, error);

      if (!(error instanceof ZeroGComputeConfigError)) {
        console.warn("0G Compute agent failed; storing deterministic fallback.", error);
      }
    }

    const storage = await uploadJsonToZeroG(
      summary,
      `reputation-summaries/${summary.subject.userId}/${Date.now()}`,
    );

    return Response.json({
      status: "stored",
      summary,
      storage,
    });
  } catch (error) {
    return Response.json(
      {
        status: "upload_failed",
        issues: [error instanceof Error ? error.message : "Failed to upload reputation summary to 0G Storage"],
      },
      { status: 502 },
    );
  }
}
