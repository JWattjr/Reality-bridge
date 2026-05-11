"use client";

import type { ConnectedWallet } from "@privy-io/react-auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";
import { shortHash, type Mission, type ProofRecord, type StorageReference } from "@/lib/mock-data";
import {
  uploadFileToZeroGWithWallet,
  uploadJsonToZeroGWithWallet,
  type UserPaidZeroGWallet,
} from "@/lib/zero-g-client";
import { anchorProofOnRegistry, isProofRegistryConfigured } from "@/lib/proof-registry";

export type SubmissionState = "idle" | "submitting" | "verified" | "error";

export type SubmissionStatus = {
  state: SubmissionState;
  message?: string;
};

type ProofsResponse = {
  proofs?: ProofRecord[];
};

type PreparedVerificationResponse = {
  prepared?: {
    proofPayload: {
      timestamp: string;
    } & Record<string, unknown>;
    proofRecord: Omit<ProofRecord, "storage" | "mediaStorage" | "chainAnchor">;
    uploadKeys: {
      proof: string;
      media?: string;
    };
  };
  issues?: string[];
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
      const headers = await auth.authHeaders();
      const params = new URLSearchParams({ userId: auth.userId });
      if (eventId) params.set("eventId", eventId);
      const response = await fetch(`/api/proofs?${params.toString()}`, { cache: "no-store", headers });
      const data: ProofsResponse = await response.json();

      if (!response.ok) throw new Error("Could not read proof receipts");

      setProofRecords(data.proofs ?? []);
    } finally {
      setProofsLoading(false);
    }
  }, [auth, eventId]);

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

      if (!isProofRegistryConfigured()) {
        setSubmissionStatus((current) => ({
          ...current,
          [mission.id]: {
            state: "error",
            message: "Deploy ProofRegistry and add NEXT_PUBLIC_PROOF_REGISTRY_ADDRESS before anchoring proofs.",
          },
        }));
        return;
      }

      setSubmissionStatus((current) => ({
        ...current,
        [mission.id]: {
          state: "submitting",
          message: "Uploading to 0G Storage, then anchoring on ProofRegistry...",
        },
      }));

      try {
        const wallet = findActiveWallet(auth.wallets, auth.walletAddress);

        if (!wallet) {
          throw new Error("No Privy wallet is available for this account.");
        }

        const submission = {
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
        };

        const tokenHeaders = await auth.authHeaders();

        const preparedResponse = await fetch("/api/verification/prepare", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...tokenHeaders },
          body: JSON.stringify(submission),
        });
        const preparedData: PreparedVerificationResponse = await preparedResponse.json();

        if (!preparedResponse.ok || !preparedData.prepared) {
          const issues = Array.isArray(preparedData.issues) ? preparedData.issues.join(", ") : "Verification failed";
          throw new Error(issues);
        }

        const preparedSubmission = {
          ...submission,
          timestamp: preparedData.prepared.proofPayload.timestamp,
        };

        const storage = await uploadJsonToZeroGWithWallet(
          preparedData.prepared.proofPayload,
          preparedData.prepared.uploadKeys.proof,
          wallet,
        );
        let mediaStorage: StorageReference | undefined;

        if (file && preparedData.prepared.uploadKeys.media) {
          mediaStorage = {
            ...(await uploadFileToZeroGWithWallet(file, preparedData.prepared.uploadKeys.media, wallet)),
            fileName: file.name,
            contentType: file.type,
          };
        }

        const proofToAnchor: ProofRecord = {
          ...preparedData.prepared.proofRecord,
          storage,
          mediaStorage,
        };
        const chainAnchor = await anchorProofOnRegistry(proofToAnchor, wallet);

        const response = await fetch("/api/verification/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...tokenHeaders },
          body: JSON.stringify({
            submission: preparedSubmission,
            storage,
            mediaStorage,
            chainAnchor,
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
              ? `0G ${shortHash(proofRecord.storage.rootHash)} + registry ${shortHash(proofRecord.chainAnchor?.txHash ?? "")}`
              : `0G ${shortHash(proofRecord.storage.rootHash)} anchored: ${shortHash(proofRecord.chainAnchor?.txHash ?? "")}`,
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

function findActiveWallet(wallets: ConnectedWallet[], walletAddress: string | null): UserPaidZeroGWallet | null {
  const activeWallet = walletAddress
    ? wallets.find((wallet) => wallet.address.toLowerCase() === walletAddress.toLowerCase())
    : wallets[0];

  return activeWallet && "getEthereumProvider" in activeWallet ? activeWallet : null;
}
