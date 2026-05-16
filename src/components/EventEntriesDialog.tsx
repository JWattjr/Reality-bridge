"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Copy, Search, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";
import type { EventRegistrationEntry } from "@/lib/community-store";

const PAGE_SIZE = 10;

export default function EventEntriesDialog({
  open,
  onClose,
  eventId,
  eventTitle,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
}) {
  const auth = useProofPlayAuth();
  const [entries, setEntries] = useState<EventRegistrationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !auth.userId) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    auth
      .authHeaders()
      .then((headers) =>
        fetch(
          `/api/events/${encodeURIComponent(eventId)}/registrations?userId=${encodeURIComponent(auth.userId ?? "")}`,
          { headers, cache: "no-store" },
        ),
      )
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.issues?.join(", ") ?? "Failed to load entries");
        return data.entries as EventRegistrationEntry[];
      })
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load entries");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, eventId, auth]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setPage(1);
      setEntries([]);
      setError("");
    }
  }, [open]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) => {
      return (
        entry.displayName.toLowerCase().includes(needle) ||
        entry.handle?.toLowerCase().includes(needle) ||
        entry.walletAddress?.toLowerCase().includes(needle) ||
        entry.userId.toLowerCase().includes(needle) ||
        entry.userTag?.toLowerCase().includes(needle) ||
        entry.checkInCode.toLowerCase().includes(needle)
      );
    });
  }, [entries, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageEntries = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
            className="w-full max-w-lg bubbly-card max-h-[85vh] overflow-hidden bg-white p-5 sm:rounded-3xl flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-2 py-0.5 text-[10px] font-bold">
                  <Users size={12} /> {entries.length} {entries.length === 1 ? "entry" : "entries"}
                </div>
                <h2 className="mt-2 font-display text-xl font-bold leading-tight">Event entries</h2>
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

            <div className="mt-4 flex items-center gap-2 rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] px-3 py-2">
              <Search size={16} className="opacity-50" />
              <input
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                placeholder="Search by name, handle, or wallet"
                className="min-w-0 flex-1 bg-transparent text-xs font-bold outline-none"
              />
            </div>

            <div className="mt-3 flex-1 overflow-y-auto">
              {loading ? (
                <EntrySkeletons count={5} />
              ) : error ? (
                <p className="rounded-2xl border-2 border-red-500 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-[var(--color-primary-900)]/40 bg-[var(--color-bg-base)] p-6 text-center">
                  <p className="font-bold text-sm">
                    {entries.length === 0 ? "No entries yet" : "No entries match your search"}
                  </p>
                  <p className="mt-1 text-[11px] font-bold opacity-60">
                    {entries.length === 0
                      ? "Attendees who join this event will appear here."
                      : "Try a different name, handle, or wallet."}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {pageEntries.map((entry) => (
                    <li
                      key={entry.userId}
                      className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] p-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-primary-900)] bg-white text-xs font-bold">
                          {entry.avatar ?? "PP"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold">
                            {entry.displayName}
                            {entry.handle && <span className="opacity-50"> · @{entry.handle}</span>}
                          </p>
                          <p className="truncate font-mono text-[10px] font-bold opacity-60">
                            {entry.walletAddress ?? entry.userId}
                          </p>
                        </div>
                        {entry.registeredAt && (
                          <span className="shrink-0 text-[10px] font-bold opacity-50">
                            {new Date(entry.registeredAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-dashed border-[var(--color-primary-900)]/40 bg-white px-2.5 py-1.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-wide opacity-50">Check-in</span>
                          <code className="font-mono text-[11px] font-bold tracking-wide">{entry.checkInCode}</code>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(entry.checkInCode).then(
                              () => {
                                setCopiedCode(entry.userId);
                                setTimeout(() => setCopiedCode((c) => (c === entry.userId ? null : c)), 1800);
                              },
                              () => undefined,
                            );
                          }}
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-[var(--color-primary-900)] bg-white px-2 py-0.5 text-[10px] font-bold shadow-[1px_1px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
                        >
                          {copiedCode === entry.userId ? (
                            <>
                              <Check size={10} /> Copied
                            </>
                          ) : (
                            <>
                              <Copy size={10} /> Copy
                            </>
                          )}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {totalPages > 1 && (
              <div className="mt-3 flex shrink-0 items-center justify-between gap-3 rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] px-3 py-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] px-3 py-1 text-[11px] font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  <ChevronLeft size={12} /> Prev
                </button>
                <span className="text-[11px] font-bold opacity-70">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] px-3 py-1 text-[11px] font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  Next <ChevronRight size={12} />
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EntrySkeletons({ count }: { count: number }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] p-2.5 animate-pulse">
          <div className="h-9 w-9 shrink-0 rounded-full bg-gray-200" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3 w-2/3 rounded bg-gray-200" />
            <div className="h-2 w-1/2 rounded bg-gray-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}
