"use client";

import { motion } from "framer-motion";
import { CheckCircle, LogIn } from "lucide-react";
import { PROOF_TYPE_COPY, type Mission } from "@/lib/mock-data";
import type { SubmissionStatus } from "@/hooks/useMissionVerification";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";

type MissionVerifyActionProps = {
  mission: Mission;
  status?: SubmissionStatus;
  onVerify: (mission: Mission, file?: File, codeWord?: string) => void;
  onQuizClick?: (mission: Mission) => void;
  compact?: boolean;
};

const buttonClass =
  "bg-[var(--color-pastel-blue)] font-bold border-2 border-[var(--color-primary-900)] rounded-full hover:bg-[var(--color-primary-900)] hover:text-white transition-colors shrink-0 disabled:cursor-wait disabled:opacity-70";

export function MissionVerifyAction({
  mission,
  status,
  onVerify,
  onQuizClick,
  compact = false,
}: MissionVerifyActionProps) {
  const auth = useProofPlayAuth();
  const proofCopy = PROOF_TYPE_COPY[mission.proofType];
  const isSubmitting = status?.state === "submitting";
  const isCompleted = mission.status === "completed";
  const sizeClass = compact ? "text-[9px] px-2.5 py-1" : "text-[10px] px-3 py-1.5";

  if (isCompleted) {
    return (
      <span className={`${sizeClass} inline-flex items-center gap-1 rounded-full border-2 border-green-700 bg-green-100 font-bold text-green-700 shrink-0`}>
        <CheckCircle size={compact ? 10 : 12} />
        Done
      </span>
    );
  }

  if (!auth.authenticated) {
    return (
      <motion.button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          auth.login();
        }}
        whileHover={{ x: 2, scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className={`${buttonClass} ${sizeClass} inline-flex items-center gap-1 bg-[var(--color-pastel-green)]`}
      >
        <LogIn size={compact ? 10 : 12} />
        Sign in
      </motion.button>
    );
  }

  if (mission.proofType === "photo_upload") {
    return (
      <motion.label
        onClick={(event) => event.stopPropagation()}
        whileHover={{ x: 2, scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className={`${buttonClass} ${sizeClass} cursor-pointer`}
      >
        {isSubmitting ? "Uploading" : proofCopy.action}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={isSubmitting}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onVerify(mission, file);
            event.target.value = "";
          }}
        />
      </motion.label>
    );
  }

  return (
    <motion.button
      type="button"
      disabled={isSubmitting}
      onClick={(event) => {
        event.stopPropagation();
        if (mission.proofType === "quiz_code" && onQuizClick) {
          onQuizClick(mission);
        } else {
          onVerify(mission);
        }
      }}
      whileHover={{ x: 2, scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className={`${buttonClass} ${sizeClass}`}
    >
      {isSubmitting ? "Uploading" : proofCopy.action}
    </motion.button>
  );
}
