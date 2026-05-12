"use client";

import type { ConnectedWallet } from "@privy-io/react-auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";
import { shortHash, MISSIONS, type Mission, type ProofChainAnchor, type ProofRecord, type StorageReference } from "@/lib/mock-data";
import {
  uploadFileToZeroGWithWallet,
  uploadJsonToZeroGWithWallet,
  type UserPaidZeroGWallet,
} from "@/lib/zero-g-client";
import { anchorProofOnRegistry, isProofRegistryConfigured } from "@/lib/proof-registry";
import { friendlyError, friendlyAnchorError } from "@/lib/friendly-errors";

export type SubmissionState = "idle" | "submitting" | "verified" | "pending_anchor" | "error";

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
      map.set(proof.missionId, proof);
    }

    return map;
  }, [userProofRecords]);

  const getMissionProof = useCallback(
    (missionId: string) => proofByMission.get(missionId) ?? null,
    [proofByMission],
  );

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
      /* swallow – auth not ready */
    });
  }, [refreshProofs]);

  const withProofStatus = useCallback(
    (mission: Mission): Mission => {
      const proof = getMissionProof(mission.id);

      if (proof) {
        return { ...mission, status: proof.status === "pending_anchor" ? "available" : "completed" };
      }

      return mission;
    },
    [getMissionProof],
  );

  /**
   * Save the proof to Supabase. Called twice during the flow:
   * 1. After 0G upload (without chain anchor) — ensures proof data is never lost
   * 2. After successful on-chain anchor — updates the record with the chain receipt
   */
  const saveProofToServer = useCallback(
    async (
      preparedSubmission: Record<string, unknown>,
      storage: StorageReference,
      mediaStorage?: StorageReference,
      chainAnchor?: ProofChainAnchor,
    ) => {
      const tokenHeaders = await auth.authHeaders();
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

      return data.proofRecord as ProofRecord;
    },
    [auth],
  );

  const verifyMission = useCallback(
    async (mission: Mission, file?: File, codeWord?: string) => {
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

      // Enforce event check-in before allowing other missions
      const eventMissions = MISSIONS.filter((m) => m.eventId === mission.eventId);
      const checkInMission = eventMissions.find((m) => m.id === "m1" || m.title.toLowerCase().includes("check in"));
      
      if (checkInMission && mission.id !== checkInMission.id && !getMissionProof(checkInMission.id)) {
        setSubmissionStatus((current) => ({
          ...current,
          [mission.id]: { state: "error", message: "Please complete the event check-in mission first." },
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
          message: "Uploading to 0G Storage...",
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
          codeWord: mission.proofType === "quiz_code" ? (codeWord || "PROOFPLAY") : undefined,
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

        // Phase 1: Upload to 0G Storage (user-paid)
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

        // Phase 2: Save proof to Supabase IMMEDIATELY (without chain anchor)
        // This ensures the proof is never lost even if anchoring fails
        setSubmissionStatus((current) => ({
          ...current,
          [mission.id]: {
            state: "submitting",
            message: "0G upload complete. Saving receipt and anchoring on-chain...",
          },
        }));

        let savedProof = await saveProofToServer(preparedSubmission, storage, mediaStorage);

        // Phase 3: Attempt on-chain anchoring
        try {
          const proofToAnchor: ProofRecord = {
            ...preparedData.prepared.proofRecord,
            storage,
            mediaStorage,
          };
          const chainAnchor = await anchorProofOnRegistry(proofToAnchor, wallet);

          // Update the saved record with the chain anchor
          savedProof = await saveProofToServer(preparedSubmission, storage, mediaStorage, chainAnchor);

          setProofRecords((current) => [
            savedProof,
            ...current.filter((proof) => proof.id !== savedProof.id),
          ]);
          setSubmissionStatus((current) => ({
            ...current,
            [mission.id]: {
              state: "verified",
              message: savedProof.mediaStorage
                ? `0G ${shortHash(savedProof.storage.rootHash)} + registry ${shortHash(savedProof.chainAnchor?.txHash ?? "")}`
                : `0G ${shortHash(savedProof.storage.rootHash)} anchored: ${shortHash(savedProof.chainAnchor?.txHash ?? "")}`,
            },
          }));
        } catch (anchorError) {
          // Anchoring failed — proof is safely stored on 0G + Supabase
          setProofRecords((current) => [
            savedProof,
            ...current.filter((proof) => proof.id !== savedProof.id),
          ]);
          setSubmissionStatus((current) => ({
            ...current,
            [mission.id]: {
              state: "pending_anchor",
              message: friendlyAnchorError(anchorError, savedProof.storage.rootHash),
            },
          }));
        }
      } catch (error) {
        setSubmissionStatus((current) => ({
          ...current,
          [mission.id]: {
            state: "error",
            message: friendlyError(error),
          },
        }));
      }
    },
    [auth, saveProofToServer],
  );

  /**
   * Retry anchoring a proof that was uploaded to 0G but failed to anchor on-chain.
   */
  const retryAnchor = useCallback(
    async (proof: ProofRecord) => {
      if (!auth.authenticated || !auth.userId) {
        auth.login();
        return;
      }

      setSubmissionStatus((current) => ({
        ...current,
        [proof.missionId]: {
          state: "submitting",
          message: "Retrying on-chain anchor...",
        },
      }));

      try {
        const wallet = findActiveWallet(auth.wallets, auth.walletAddress);

        if (!wallet) {
          throw new Error("No Privy wallet is available for this account.");
        }

        const chainAnchor = await anchorProofOnRegistry(proof, wallet);

        // Rebuild the submission with all fields the server expects,
        // including the codeWord for quiz missions so the endpoint
        // doesn't reject with "requires a code word".
        const mission = MISSIONS.find((m) => m.id === proof.missionId);
        const tokenHeaders = await auth.authHeaders();
        const response = await fetch("/api/verification/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...tokenHeaders },
          body: JSON.stringify({
            submission: {
              eventId: proof.eventId,
              missionId: proof.missionId,
              proofType: proof.proofType,
              userId: proof.userId,
              location: proof.location,
              timestamp: proof.timestamp,
              codeWord: mission?.proofType === "quiz_code" ? "PROOFPLAY" : undefined,
              checkpointPayload:
                mission?.proofType === "qr_scan" || mission?.proofType === "nfc_tap"
                  ? `${proof.eventId}:${proof.missionId}:${mission.proofLocation ?? mission.title}`
                  : undefined,
              organizerId: mission?.proofType === "organizer_approval" ? "proofplay-organizer-demo" : undefined,
            },
            storage: proof.storage,
            mediaStorage: proof.mediaStorage,
            chainAnchor,
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(Array.isArray(data.issues) ? data.issues.join(", ") : "Anchor update failed");
        }

        const updatedProof = data.proofRecord as ProofRecord;
        setProofRecords((current) => [
          updatedProof,
          ...current.filter((p) => p.id !== updatedProof.id),
        ]);
        setSubmissionStatus((current) => ({
          ...current,
          [proof.missionId]: {
            state: "verified",
            message: `Anchored: ${shortHash(updatedProof.chainAnchor?.txHash ?? "")}`,
          },
        }));
      } catch (error) {
        setSubmissionStatus((current) => ({
          ...current,
          [proof.missionId]: {
            state: "pending_anchor",
            message: friendlyAnchorError(error, proof.storage.rootHash),
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
    retryAnchor,
    withProofStatus,
  };
}

function findActiveWallet(wallets: ConnectedWallet[], walletAddress: string | null): UserPaidZeroGWallet | null {
  const activeWallet = walletAddress
    ? wallets.find((wallet) => wallet.address.toLowerCase() === walletAddress.toLowerCase())
    : wallets[0];

  return activeWallet && "getEthereumProvider" in activeWallet ? activeWallet : null;
}
