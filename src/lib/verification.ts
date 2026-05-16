import {
  EVENTS,
  MISSIONS,
  PROOF_TYPE_COPY,
  type Event,
  type Mission,
  type ProofRecord,
  type ProofType,
} from "@/lib/mock-data";
import { uploadBytesToZeroG, uploadJsonToZeroG } from "@/lib/zero-g";
import { listCommunityEvents } from "@/lib/community-store";

export interface VerificationSubmission {
  eventId: string;
  userId: string;
  missionId: string;
  proofType: ProofType;
  location?: string;
  timestamp?: string;
  codeWord?: string;
  checkpointPayload?: string;
  organizerId?: string;
  mediaFileName?: string;
  mediaMimeType?: string;
  mediaBase64?: string;
}

export interface VerificationResult {
  proofRecord: ProofRecord;
  databaseWrite: {
    userId: string;
    eventId: string;
    missionId: string;
    xpDelta: number;
    missionStatus: "completed";
    proofRootHash: string;
    badgeId?: string;
  };
}

export interface PreparedVerificationProof {
  proofRecord: Omit<ProofRecord, "storage" | "mediaStorage">;
  proofPayload: {
    eventId: string;
    userId: string;
    missionId: string;
    proofType: ProofType;
    timestamp: string;
    location: string;
    xpEarned: number;
    evidence: string;
  };
  uploadKeys: {
    proof: string;
    media?: string;
  };
}

export class VerificationError extends Error {
  constructor(public readonly issues: string[]) {
    super(issues.join("; "));
  }
}

export async function validateVerificationSubmission(
  submission: VerificationSubmission,
  options: { requireMediaPayload?: boolean } = {},
) {
  const requireMediaPayload = options.requireMediaPayload ?? true;
  const issues: string[] = [];
  let event: Pick<Event, "id" | "location"> | undefined = EVENTS.find((item) => item.id === submission.eventId);
  let mission: Mission | undefined = MISSIONS.find((item) => item.id === submission.missionId);

  if (!event || !mission) {
    const communityEvents = await listCommunityEvents();
    const communityEvent = communityEvents.find((item) => item.id === submission.eventId);
    if (communityEvent) {
      event = { id: communityEvent.id, location: communityEvent.location };
      const communityMission = communityEvent.missions.find((item) => item.id === submission.missionId);
      if (communityMission) {
        mission = {
          id: communityMission.id,
          eventId: communityEvent.id,
          title: communityMission.title,
          description: communityMission.description,
          type: communityMission.type,
          proofType: communityMission.proofType,
          proofLocation: communityMission.proofLocation,
          xpReward: communityMission.xpReward,
          status: "available",
          completionCount: 0,
          maxCompletions: 1,
        };
      }
    }
  }

  if (!submission.userId) {
    issues.push("Privy sign-in is required before completing missions");
  }

  if (!event) issues.push("Unknown event");
  if (!mission) issues.push("Unknown mission");

  if (event && mission && mission.eventId !== event.id) {
    issues.push("Mission does not belong to this event");
  }

  if (mission && mission.status === "locked") {
    issues.push("Mission is locked");
  }

  if (mission && mission.proofType !== submission.proofType) {
    issues.push(`Mission requires ${PROOF_TYPE_COPY[mission.proofType].label}`);
  }

  if (submission.proofType === "photo_upload") {
    if (!submission.mediaFileName) {
      issues.push("Photo proof requires a media file");
    }

    if (requireMediaPayload && !submission.mediaBase64) {
      issues.push("Photo proof requires a base64 payload");
    }
  }

  if (submission.proofType === "quiz_code") {
    if (!submission.codeWord) {
      issues.push("Quiz/code word proof requires a code word");
    } else if (submission.codeWord.trim().toLowerCase() !== "proofplay") {
      issues.push("Incorrect code word");
    }
  }

  if (submission.proofType === "organizer_approval" && !submission.organizerId) {
    issues.push("Organizer approval requires an organizer id");
  }

  if ((submission.proofType === "qr_scan" || submission.proofType === "nfc_tap") && !submission.checkpointPayload) {
    issues.push("Checkpoint proof requires a scanned payload");
  }

  return {
    ok: issues.length === 0,
    issues,
    event,
    mission,
  };
}

export async function prepareVerificationProof(
  submission: VerificationSubmission,
  options: { requireMediaPayload?: boolean } = {},
): Promise<PreparedVerificationProof> {
  const validation = await validateVerificationSubmission(submission, options);

  if (!validation.ok || !validation.mission || !validation.event) {
    throw new VerificationError(validation.issues);
  }

  const mission = validation.mission;
  const timestamp = submission.timestamp ?? new Date().toISOString();
  const location = submission.location ?? mission.proofLocation ?? validation.event.location;
  const id = `proof_${mission.id}_${stableSegment(`${submission.userId}:${timestamp}`)}`;
  const evidence = evidenceSummary(submission, mission);

  const proofPayload = {
    eventId: submission.eventId,
    userId: submission.userId,
    missionId: submission.missionId,
    proofType: submission.proofType,
    timestamp,
    location,
    xpEarned: mission.xpReward,
    evidence,
  };

  const proofRecord = {
    id,
    eventId: submission.eventId,
    userId: submission.userId,
    missionId: submission.missionId,
    proofType: submission.proofType,
    timestamp,
    location,
    xpEarned: mission.xpReward,
    validator: submission.proofType === "organizer_approval" ? "organizer" : "backend",
    status: "validated",
    evidenceLabel: evidence,
    badgeId: mission.badgeReward,
  } satisfies Omit<ProofRecord, "storage" | "mediaStorage">;

  return {
    proofRecord,
    proofPayload,
    uploadKeys: {
      proof: `proofs/${submission.eventId}/${submission.userId}/${id}`,
      media: submission.mediaFileName
        ? `media/${submission.eventId}/${submission.userId}/${stableSegment(submission.mediaFileName)}`
        : undefined,
    },
  };
}

export async function createVerificationProof(submission: VerificationSubmission): Promise<VerificationResult> {
  const prepared = await prepareVerificationProof(submission, { requireMediaPayload: true });
  const storage = await uploadJsonToZeroG(prepared.proofPayload, prepared.uploadKeys.proof);
  const mediaStorage = submission.mediaFileName && submission.mediaBase64
    ? {
        ...(await uploadBytesToZeroG(
          decodeBase64(submission.mediaBase64),
          prepared.uploadKeys.media ?? `media/${submission.eventId}/${submission.userId}/${stableSegment(submission.mediaFileName)}`,
        )),
        fileName: submission.mediaFileName,
        contentType: submission.mediaMimeType,
      }
    : undefined;

  const proofRecord: ProofRecord = {
    ...prepared.proofRecord,
    storage,
    mediaStorage,
  };

  return {
    proofRecord,
    databaseWrite: {
      userId: submission.userId,
      eventId: submission.eventId,
      missionId: submission.missionId,
      xpDelta: prepared.proofRecord.xpEarned,
      missionStatus: "completed",
      proofRootHash: storage.rootHash,
      badgeId: prepared.proofRecord.badgeId,
    },
  };
}

function evidenceSummary(submission: VerificationSubmission, mission: Mission) {
  switch (submission.proofType) {
    case "qr_scan":
      return `QR checkpoint matched ${mission.proofLocation ?? mission.title}`;
    case "nfc_tap":
      return `NFC checkpoint matched ${mission.proofLocation ?? mission.title}`;
    case "organizer_approval":
      return `Approved by organizer ${submission.organizerId}`;
    case "photo_upload":
      return `Photo uploaded to 0G Storage: ${submission.mediaFileName}`;
    case "quiz_code":
      return "Submitted code word matched workshop answer";
  }
}

function stableSegment(value: string) {
  return fallbackHash(value).slice(0, 12);
}

function decodeBase64(value: string) {
  const cleaned = value.includes(",") ? value.split(",").pop() ?? "" : value;
  return Uint8Array.from(Buffer.from(cleaned, "base64"));
}

function fallbackHash(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return hex.repeat(8);
}
