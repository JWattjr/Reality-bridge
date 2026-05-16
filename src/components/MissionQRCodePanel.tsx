"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Download, QrCode, X } from "lucide-react";
import QRCode from "qrcode";

interface MissionQR {
  missionId: string;
  missionTitle: string;
  proofType: string;
  payload: string;
}

export default function MissionQRCodePanel({
  eventId,
  eventTitle,
  missions,
}: {
  eventId: string;
  eventTitle: string;
  missions: Array<{
    id: string;
    title: string;
    type: string;
    proofType: string;
    xpReward: number;
  }>;
}) {
  const qrMissions = missions.filter(
    (m) => m.proofType === "qr_scan" || m.type === "qr",
  );
  const [selectedMission, setSelectedMission] = useState<MissionQR | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const buildPayload = useCallback(
    (mission: (typeof qrMissions)[0]) => {
      return JSON.stringify({
        app: "proofplay",
        version: 1,
        eventId,
        missionId: mission.id,
        proofType: mission.proofType,
        checkpoint: `${eventId}:${mission.id}:${mission.title}`,
      });
    },
    [eventId],
  );

  const selectMission = useCallback(
    (mission: (typeof qrMissions)[0]) => {
      setSelectedMission({
        missionId: mission.id,
        missionTitle: mission.title,
        proofType: mission.proofType,
        payload: buildPayload(mission),
      });
      setCopied(false);
    },
    [buildPayload],
  );

  useEffect(() => {
    if (!selectedMission || !canvasRef.current) return;

    QRCode.toCanvas(canvasRef.current, selectedMission.payload, {
      width: 240,
      margin: 2,
      color: {
        dark: "#312e81",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    }).catch(() => {
      // QR render failed — canvas stays blank
    });
  }, [selectedMission]);

  const copyPayload = async () => {
    if (!selectedMission) return;
    try {
      await navigator.clipboard.writeText(selectedMission.payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  const downloadQR = () => {
    if (!canvasRef.current || !selectedMission) return;
    const link = document.createElement("a");
    link.download = `proofplay-qr-${selectedMission.missionId}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  if (qrMissions.length === 0) {
    return (
      <div className="bubbly-card bg-white p-5">
        <div className="flex items-center gap-2 text-xs font-bold opacity-60">
          <QrCode size={16} />
          No QR scan missions in this event. Add a QR mission to generate checkpoint codes.
        </div>
      </div>
    );
  }

  return (
    <div className="bubbly-card bg-white p-3 space-y-4 sm:p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)]">
          <QrCode size={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-bold sm:text-lg">Mission QR Codes</p>
          <p className="text-[10px] font-bold opacity-50">
            Print these and place them at each checkpoint
          </p>
        </div>
      </div>

      {/* Mission selector */}
      <div className="flex flex-wrap gap-2">
        {qrMissions.map((mission) => (
          <button
            key={mission.id}
            type="button"
            onClick={() => selectMission(mission)}
            className={`rounded-full border-2 border-[var(--color-primary-900)] px-3 py-1.5 text-[10px] font-bold transition-all hover:translate-y-0.5 ${
              selectedMission?.missionId === mission.id
                ? "bg-[var(--color-primary-900)] text-white shadow-none"
                : "bg-[var(--color-pastel-blue)] shadow-[2px_2px_0px_0px_#312e81]"
            }`}
          >
            {mission.title}
          </button>
        ))}
      </div>

      {/* QR display */}
      {selectedMission && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-3"
        >
          <div className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] p-3 sm:p-4">
            <div className="flex flex-col items-center gap-3">
              <p className="text-center text-xs font-bold">{selectedMission.missionTitle}</p>

              {/* Canvas for QR — fixed 240px internal resolution, CSS-scaled to fit */}
              <div className="rounded-xl border-2 border-[var(--color-primary-900)] bg-white p-3 shadow-[3px_3px_0px_0px_#312e81]">
                <canvas ref={canvasRef} className="h-auto w-full max-w-[240px] block" />
              </div>

              <p className="text-center text-[10px] font-bold opacity-50">
                {eventTitle} — Scan to complete mission
              </p>

              {/* Actions */}
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={downloadQR}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-3 py-1.5 text-[11px] font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none sm:w-auto"
                >
                  <Download size={12} />
                  Download PNG
                </button>
                <button
                  type="button"
                  onClick={copyPayload}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-white px-3 py-1.5 text-[11px] font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none sm:w-auto"
                >
                  {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy payload"}
                </button>
              </div>
            </div>
          </div>

          {/* Raw payload */}
          <details className="rounded-xl border-2 border-dashed border-[var(--color-primary-900)]/30 p-3">
            <summary className="cursor-pointer text-[10px] font-bold opacity-50">
              View raw QR payload
            </summary>
            <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[var(--color-bg-base)] p-2 text-[9px] font-bold opacity-70">
              {selectedMission.payload}
            </pre>
          </details>
        </motion.div>
      )}
    </div>
  );
}
