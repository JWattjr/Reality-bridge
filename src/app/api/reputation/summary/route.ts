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
  const body = await safeJson(request);
  const userId = typeof body.userId === "string" && body.userId ? body.userId : undefined;
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

async function safeJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
