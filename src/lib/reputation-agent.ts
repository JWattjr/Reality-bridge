import { EVENTS, MISSIONS, PROOF_TYPE_COPY, type ProofRecord } from "@/lib/mock-data";

export interface ReputationAgentSummary {
  schema: "proofplay.reputation-agent.v1";
  generatedAt: string;
  subject: {
    userId: string;
    eventIds: string[];
  };
  metrics: {
    totalProofs: number;
    totalXp: number;
    mediaProofs: number;
    proofTypes: Record<string, number>;
  };
  claims: string[];
  evidence: Array<{
    proofId: string;
    eventId: string;
    eventTitle: string;
    missionId: string;
    missionTitle: string;
    proofType: string;
    rootHash: string;
    mediaRootHash?: string;
    explorerUrl?: string;
  }>;
  agentAssessment: {
    reputationLabel: string;
    strongestSignals: string[];
    nextBestActions: string[];
    narrative?: string;
    riskNotes?: string[];
  };
  compute?: {
    provider: "0G Compute";
    model: string;
    baseUrl: string;
    teeRequested: boolean;
    teeVerified?: boolean;
    mode: "ai_generated" | "fallback";
    generatedAt: string;
    rawText?: string;
    error?: string;
  };
}

export function buildReputationAgentSummary(proofs: ProofRecord[], userId?: string): ReputationAgentSummary {
  const scopedProofs = userId ? proofs.filter((proof) => proof.userId === userId) : proofs;
  const eventIds = Array.from(new Set(scopedProofs.map((proof) => proof.eventId)));
  const totalXp = scopedProofs.reduce((sum, proof) => sum + proof.xpEarned, 0);
  const mediaProofs = scopedProofs.filter((proof) => proof.mediaStorage).length;
  const proofTypes = scopedProofs.reduce<Record<string, number>>((counts, proof) => {
    counts[proof.proofType] = (counts[proof.proofType] ?? 0) + 1;
    return counts;
  }, {});

  return {
    schema: "proofplay.reputation-agent.v1",
    generatedAt: new Date().toISOString(),
    subject: {
      userId: userId ?? "all-proofplay-users",
      eventIds,
    },
    metrics: {
      totalProofs: scopedProofs.length,
      totalXp,
      mediaProofs,
      proofTypes,
    },
    claims: buildClaims(scopedProofs, totalXp, mediaProofs),
    evidence: scopedProofs.map((proof) => {
      const event = EVENTS.find((item) => item.id === proof.eventId);
      const mission = MISSIONS.find((item) => item.id === proof.missionId);

      return {
        proofId: proof.id,
        eventId: proof.eventId,
        eventTitle: event?.title ?? proof.eventId,
        missionId: proof.missionId,
        missionTitle: mission?.title ?? proof.missionId,
        proofType: PROOF_TYPE_COPY[proof.proofType].label,
        rootHash: proof.storage.rootHash,
        mediaRootHash: proof.mediaStorage?.rootHash,
        explorerUrl: proof.storage.explorerUrl,
      };
    }),
    agentAssessment: {
      reputationLabel: reputationLabel(scopedProofs.length, totalXp, mediaProofs),
      strongestSignals: strongestSignals(proofTypes, mediaProofs),
      nextBestActions: nextBestActions(proofTypes),
    },
  };
}

function buildClaims(proofs: ProofRecord[], totalXp: number, mediaProofs: number) {
  const claims = [
    `Completed ${proofs.length} verified real-world mission${proofs.length === 1 ? "" : "s"}.`,
    `Earned ${totalXp} proof-backed XP.`,
  ];

  if (mediaProofs > 0) {
    claims.push(`Uploaded ${mediaProofs} media proof${mediaProofs === 1 ? "" : "s"} retrievable from 0G Storage.`);
  }

  if (proofs.some((proof) => proof.proofType === "qr_scan")) {
    claims.push("Verified venue or booth presence through QR checkpoint evidence.");
  }

  if (proofs.some((proof) => proof.proofType === "organizer_approval")) {
    claims.push("Received organizer-validated contribution approval.");
  }

  return claims;
}

function reputationLabel(proofCount: number, totalXp: number, mediaProofs: number) {
  if (proofCount >= 6 && totalXp >= 500 && mediaProofs >= 2) return "High-signal contributor";
  if (proofCount >= 3 && totalXp >= 200) return "Verified active participant";
  if (proofCount > 0) return "Newly verified attendee";
  return "No verified activity yet";
}

function strongestSignals(proofTypes: Record<string, number>, mediaProofs: number) {
  const signals = Object.entries(proofTypes)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 3)
    .map(([type, count]) => `${type}: ${count}`);

  if (mediaProofs > 0) signals.push(`media_uploads: ${mediaProofs}`);

  return signals.length ? signals : ["No proof records available"];
}

function nextBestActions(proofTypes: Record<string, number>) {
  const actions: string[] = [];

  if (!proofTypes.qr_scan) actions.push("Complete a venue or booth QR checkpoint.");
  if (!proofTypes.photo_upload) actions.push("Upload a photo proof to strengthen evidence quality.");
  if (!proofTypes.quiz_code) actions.push("Complete a knowledge/code-word mission.");
  if (!proofTypes.organizer_approval) actions.push("Get an organizer approval for a human contribution.");

  return actions.length ? actions.slice(0, 3) : ["Share the generated reputation summary as a portable credential."];
}
