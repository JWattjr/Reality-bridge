"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { eventCheckInCode } from "@/lib/check-in";

type CheckInModalProps = {
  open: boolean;
  onClose: () => void;
  eventId: string;
  userId: string;
  eventTitle: string;
  onConfirm: (code: string) => void | Promise<void>;
  submitting: boolean;
  status?: { state: string; message?: string };
  alreadyCheckedIn: boolean;
};

function normalize(value: string) {
  return value.replace(/\s+/g, "").replace(/-/g, "").toUpperCase();
}

export default function CheckInModal({
  open,
  onClose,
  eventId,
  userId,
  eventTitle,
  onConfirm,
  submitting,
  status,
  alreadyCheckedIn,
}: CheckInModalProps) {
  const expected = eventCheckInCode(eventId, userId);
  const [input, setInput] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!open) {
      setInput("");
      setLocalError("");
    }
  }, [open]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLocalError("");
    const typed = normalize(input);
    if (!typed) {
      setLocalError("Enter the code the organizer gave you.");
      return;
    }
    if (typed !== normalize(expected)) {
      setLocalError("That code doesn't match. Double-check it with the organizer.");
      return;
    }
    onConfirm(expected);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-primary-900)]/40 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="w-full max-w-sm bubbly-card bg-white p-5 sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold leading-tight">Check in at entrance</h2>
                <p className="truncate text-xs font-bold opacity-60">{eventTitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-primary-900)] bg-white shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
              >
                <X size={16} />
              </button>
            </div>

            <p className="mt-3 text-[11px] font-bold opacity-70">
              Ask the organizer for the check-in code tied to your entry, then enter it below. We&apos;ll verify it matches and anchor your check-in proof on 0G.
            </p>

            {alreadyCheckedIn ? (
              <div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-green-600 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
                <ShieldCheck size={16} /> Already checked in
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-[10px] font-bold opacity-60">Check-in code</span>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="e.g. A1B2-C3D4"
                    autoComplete="off"
                    autoFocus
                    className="mt-1 w-full rounded-xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] px-4 py-3 text-center font-mono text-lg font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)]"
                  />
                </label>

                {localError && (
                  <p className="rounded-xl border-2 border-red-500 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">
                    {localError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-primary-900)] py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--color-primary-700)] disabled:opacity-60"
                >
                  {submitting ? "Anchoring check-in..." : "Verify code"}
                </button>
              </form>
            )}

            {status?.message && (
              <p className={`mt-3 rounded-2xl border-2 px-3 py-2 text-[11px] font-bold ${
                status.state === "error"
                  ? "border-red-500 bg-red-50 text-red-700"
                  : status.state === "pending_anchor"
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-green-600 bg-green-50 text-green-700"
              }`}>
                {status.message}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
