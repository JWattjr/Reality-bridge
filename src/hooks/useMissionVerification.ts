"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";
import { shortHash, type Mission, type ProofRecord } from "@/lib/mock-data";

export type SubmissionState = "idle" | "submitting" | "verified" | "error";

export type SubmissionStatus = {
  state: SubmissionState;
  message?: string;
};

type ProofsResponse = {
  proofs?: ProofRecord[];
};

export function useMissionVerification(eventId?: string) {
  const auth = useProofPlayAuth();
  const [proofRecords, setProofRecords] = useState<ProofRecord[]>([]);
  const [proofsLoading, setProofsLoading] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<Record<string, SubmissionStatus>>({});

  const userProofRecords = useMemo(() => {
    if (!auth.userId) return [];

    const userId = auth.userId.toLowerCase();

    return proofRecords.filter((proof) => {
      const sameUser = proof.userId.toLowerCase() === userId;
      const sameEvent = eventId ? proof.eventId === eventId : true;
      return sameUser && sameEvent;
    });
  }, [auth.userId, eventId, proofRecords]);

  const proofByMission = useMemo(() => {
    const map = new Map<string, ProofRecord>();

    for (const proof of userProofRecords) {
      if (!map.has(proof.missionId)) {
        map.set(proof.missionId, proof);
      }
    }

    return map;
  }, [userProofRecords]);

  const refreshProofs = useCallback(async () => {
    if (!auth.authenticated || !auth.userId) {
      setProofRecords([]);
      return;
    }

    setProofsLoading(true);

    try {
      const params = new URLSearchParams({ userId: auth.userId });
      if (eventId) params.set("eventId", eventId);
      const response = await fetch(`/api/proofs?${params.toString()}`, { cache: "no-store" });
      const data: ProofsResponse = await response.json();

      if (!response.ok) throw new Error("Could not read proof receipts");

      setProofRecords(data.proofs ?? []);
    } finally {
      setProofsLoading(false);
    }
  }, [auth.authenticated, auth.userId, eventId]);

  useEffect(() => {
    refreshProofs().catch(() => {
      setProofsLoading(false);
    });
  }, [refreshProofs]);

  const getMissionProof = useCallback((missionId: string) => proofByMission.get(missionId), [proofByMission]);

  const withProofStatus = useCallback(
    (mission: Mission): Mission => {
      const proof = getMissionProof(mission.id);

      if (!proof) return mission;

      return {
        ...mission,
        status: "completed",
        completedAt: proof.timestamp,
        proofRecordId: proof.id,
        completionCount: Math.max(mission.completionCount, 1),
      };
    },
    [getMissionProof],
  );

  const verifyMission = useCallback(
    async (mission: Mission, file?: File) => {
      if (!auth.configured) {
        setSubmissionStatus((current) => ({
          ...current,
          [mission.id]: {
            state: "error",
            message: "Add NEXT_PUBLIC_PRIVY_APP_ID before live wallet proofs.",
          },
        }));
        return;
      }

      if (!auth.ready) return;

      if (!auth.authenticated || !auth.userId) {
        auth.login();
        return;
      }

      if (mission.proofType === "photo_upload" && !file) {
        setSubmissionStatus((current) => ({
          ...current,
          [mission.id]: { state: "error", message: "Choose a photo to upload as proof." },
        }));
        return;
      }

      setSubmissionStatus((current) => ({
        ...current,
        [mission.id]: {
          state: "submitting",
          message: mission.proofType === "photo_upload" ? "Uploading photo and proof to 0G..." : "Uploading proof to 0G...",
        },
      }));

      try {
        const mediaPayload = file ? await fileToBase64(file) : undefined;
        const response = await fetch("/api/verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: mission.eventId,
            missionId: mission.id,
            proofType: mission.proofType,
            userId: auth.userId,
            location: mission.proofLocation,
            checkpointPayload:
              mission.proofType === "qr_scan" || mission.proofType === "nfc_tap"
                ? `${mission.eventId}:${mission.id}:${mission.proofLocation ?? mission.title}`
                : undefined,
            organizerId: mission.proofType === "organizer_approval" ? "proofplay-organizer-demo" : undefined,
            codeWord: mission.proofType === "quiz_code" ? "PROOFPLAY" : undefined,
            mediaFileName: file?.name,
            mediaMimeType: file?.type,
            mediaBase64: mediaPayload,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const issues = Array.isArray(data.issues) ? data.issues.join(", ") : "Verification failed";
          throw new Error(issues);
        }

        const proofRecord = data.proofRecord as ProofRecord;
        setProofRecords((current) => [
          proofRecord,
          ...current.filter((proof) => proof.id !== proofRecord.id),
        ]);
        setSubmissionStatus((current) => ({
          ...current,
          [mission.id]: {
            state: "verified",
            message: proofRecord.mediaStorage
              ? `0G proof ${shortHash(proofRecord.storage.rootHash)} + media ${shortHash(proofRecord.mediaStorage.rootHash)}`
              : `0G proof stored: ${shortHash(proofRecord.storage.rootHash)}`,
          },
        }));
      } catch (error) {
        setSubmissionStatus((current) => ({
          ...current,
          [mission.id]: {
            state: "error",
            message: error instanceof Error ? error.message : "Verification failed",
          },
        }));
      }
    },
    [auth],
  );

  return {
    auth,
    proofsLoading,
    proofRecords: userProofRecords,
    getMissionProof,
    refreshProofs,
    submissionStatus,
    verifyMission,
    withProofStatus,
  };
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read selected file"));
    reader.readAsDataURL(file);
  });
}
