"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, KeyRound, ScanLine, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";

type BarcodeDetection = { rawValue: string; format: string };
type BarcodeDetectorInstance = { detect: (source: CanvasImageSource) => Promise<BarcodeDetection[]> };
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

type Mode = "scan" | "code";

export default function EnterEventDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const auth = useProofPlayAuth();
  const supportsScan = typeof window !== "undefined" && "BarcodeDetector" in window;

  const [mode, setMode] = useState<Mode>(supportsScan ? "scan" : "code");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    setCode("");
    setStatus("");
    setBusy(false);
    setMode(supportsScan ? "scan" : "code");
  }, [supportsScan]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleResolved = useCallback(
    async (rawCode: string) => {
      const parsed = parseEventCode(rawCode);
      if (!parsed) {
        setStatus("That code doesn't look like a ProofPlay event.");
        return;
      }

      setBusy(true);
      setStatus("Looking up event...");

      try {
        const response = await fetch(`/api/events/${encodeURIComponent(parsed)}`);
        const data = await response.json();

        if (!response.ok || !data.event) {
          throw new Error(data.issues?.join(", ") ?? "No event matches that code.");
        }

        const eventId = data.event.id as string;
        const organizerId = data.event.organizerId as string | undefined;

        if (auth.userId && organizerId === auth.userId) {
          setStatus("You're the organizer of this event — opening your dashboard.");
          router.push(`/organizer/event/${eventId}`);
          onClose();
          return;
        }

        if (auth.authenticated && auth.userId) {
          setStatus("Registering you for the event...");
          const headers = await auth.authHeaders();
          await fetch(`/api/events/${eventId}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify({ userId: auth.userId }),
          }).catch(() => undefined);
        }

        router.push(`/app/event/${eventId}`);
        onClose();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not enter that event.");
      } finally {
        setBusy(false);
      }
    },
    [auth, onClose, router],
  );

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
            className="w-full max-w-md bubbly-card bg-white p-5 sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">Enter an Event</h2>
                <p className="text-xs font-bold opacity-60">Scan an event QR or enter a code to join.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--color-primary-900)] bg-white shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <TabButton active={mode === "scan"} onClick={() => setMode("scan")} disabled={!supportsScan}>
                <ScanLine size={14} /> Scan
              </TabButton>
              <TabButton active={mode === "code"} onClick={() => setMode("code")}>
                <KeyRound size={14} /> Code
              </TabButton>
            </div>

            <div className="mt-4">
              {mode === "scan" ? (
                <ScanPanel onDetected={handleResolved} supported={supportsScan} busy={busy} />
              ) : (
                <CodePanel
                  code={code}
                  setCode={setCode}
                  busy={busy}
                  onSubmit={() => handleResolved(code)}
                />
              )}
            </div>

            {status && (
              <p className="mt-4 rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] p-3 text-xs font-bold">
                {status}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TabButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] px-3 py-2 text-xs font-bold transition-all disabled:opacity-50 ${
        active
          ? "bg-[var(--color-primary-900)] text-white shadow-none"
          : "bg-[var(--color-pastel-blue)] shadow-[2px_2px_0px_0px_#312e81] hover:translate-y-0.5 hover:shadow-none"
      }`}
    >
      {children}
    </button>
  );
}

function CodePanel({
  code,
  setCode,
  busy,
  onSubmit,
}: {
  code: string;
  setCode: (value: string) => void;
  busy: boolean;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy && code.trim()) onSubmit();
      }}
      className="space-y-3"
    >
      <label className="block text-xs font-bold opacity-60">Event code, slug, or share link</label>
      <input
        type="text"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder="e.g. evt_a1b2c3 or blocknova-event-abc123"
        autoComplete="off"
        autoFocus
        className="w-full rounded-xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)]"
      />
      <button
        type="submit"
        disabled={busy || !code.trim()}
        className="w-full rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-primary-900)] py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--color-primary-700)] disabled:opacity-60"
      >
        {busy ? "Entering..." : "Enter Event"}
      </button>
    </form>
  );
}

function ScanPanel({
  supported,
  onDetected,
  busy,
}: {
  supported: boolean;
  onDetected: (code: string) => void;
  busy: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const handledRef = useRef(false);
  const [error, setError] = useState<string>("");
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!supported) return;

    let cancelled = false;
    handledRef.current = false;

    async function start() {
      try {
        const Ctor = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
        detectorRef.current = new Ctor({ formats: ["qr_code", "code_128", "ean_13"] });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setActive(true);
        loop();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Camera unavailable.");
        }
      }
    }

    function loop() {
      if (handledRef.current) return;
      const video = videoRef.current;
      const detector = detectorRef.current;
      if (!video || !detector || video.readyState < 2) {
        rafRef.current = window.requestAnimationFrame(loop);
        return;
      }
      detector
        .detect(video)
        .then((results) => {
          if (handledRef.current) return;
          const first = results[0];
          if (first?.rawValue) {
            handledRef.current = true;
            onDetected(first.rawValue);
          } else {
            rafRef.current = window.requestAnimationFrame(loop);
          }
        })
        .catch(() => {
          rafRef.current = window.requestAnimationFrame(loop);
        });
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setActive(false);
    };
  }, [onDetected, supported]);

  if (!supported) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[var(--color-primary-900)]/40 bg-[var(--color-bg-base)] p-4 text-center">
        <Camera size={20} className="mx-auto opacity-40" />
        <p className="mt-2 text-xs font-bold opacity-70">
          Your browser can&apos;t scan codes. Use the Code tab to enter an event code instead.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-pink)] p-4 text-center">
        <p className="text-xs font-bold">{error}</p>
        <p className="mt-1 text-[10px] font-bold opacity-70">Grant camera permission or switch to the Code tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-[var(--color-primary-900)] bg-black">
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-dashed border-white/80" />
        {!active && (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
            Starting camera...
          </div>
        )}
      </div>
      <p className="text-center text-[10px] font-bold opacity-60">
        {busy ? "Found a code, joining..." : "Point your camera at the event QR code."}
      </p>
    </div>
  );
}

function parseEventCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const eventsIndex = parts.indexOf("events");
    if (eventsIndex >= 0 && parts[eventsIndex + 1]) return parts[eventsIndex + 1];
    const eventIndex = parts.indexOf("event");
    if (eventIndex >= 0 && parts[eventIndex + 1]) return parts[eventIndex + 1];
  } catch {
    /* not a URL */
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      const candidate = parsed as Record<string, unknown>;
      if (typeof candidate.eventId === "string" && candidate.eventId) return candidate.eventId;
      if (typeof candidate.slug === "string" && candidate.slug) return candidate.slug;
    }
  } catch {
    /* not JSON */
  }

  return trimmed;
}
