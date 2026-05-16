"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Check, ExternalLink, Globe, Lock, MapPin, Pencil, Plus, ShieldAlert, Target, Trash2, Trophy, Users, X } from "lucide-react";
import type { CommunityEvent, CommunityMission, EventVisibility } from "@/lib/community-store";
import type { LeaderboardEntry, ProofType } from "@/lib/mock-data";
import { PROOF_TYPE_COPY } from "@/lib/mock-data";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";
import MissionQRCodePanel from "@/components/MissionQRCodePanel";
import EventEntriesDialog from "@/components/EventEntriesDialog";

const CATEGORIES = ["Conference", "Hackathon", "Meetup", "Workshop", "Festival", "Community", "Brand Activation"];

const PROOF_TYPE_OPTIONS: ProofType[] = ["qr_scan", "nfc_tap", "photo_upload", "quiz_code", "organizer_approval"];

function typeForProof(proofType: ProofType): CommunityMission["type"] {
  switch (proofType) {
    case "qr_scan": return "qr";
    case "nfc_tap": return "nfc";
    case "photo_upload": return "photo";
    case "quiz_code": return "text";
    case "organizer_approval": return "manual";
  }
}

type EditDraft = {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  category: string;
  maxAttendees: string;
  visibility: EventVisibility;
};

type MissionDraft = {
  title: string;
  description: string;
  proofType: ProofType;
  xp: string;
};

const emptyMissionDraft: MissionDraft = { title: "", description: "", proofType: "qr_scan", xp: "75" };

function draftFromEvent(event: CommunityEvent): EditDraft {
  return {
    title: event.title,
    description: event.description,
    location: event.location,
    startDate: event.startDate,
    endDate: event.endDate,
    category: event.category,
    maxAttendees: String(event.maxAttendees),
    visibility: event.visibility,
  };
}

export default function OrganizerEventDashboard() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const auth = useProofPlayAuth();
  const [event, setEvent] = useState<CommunityEvent | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState<null | "link" | "code">(null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingMission, setAddingMission] = useState(false);
  const [missionDraft, setMissionDraft] = useState<MissionDraft>(emptyMissionDraft);
  const [missionError, setMissionError] = useState("");
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  const [missionEditDraft, setMissionEditDraft] = useState<MissionDraft>(emptyMissionDraft);
  const [missionEditError, setMissionEditError] = useState("");
  const [pendingMissionDeleteId, setPendingMissionDeleteId] = useState<string | null>(null);
  const [entriesOpen, setEntriesOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function patchEvent(updates: Record<string, unknown>) {
    if (!auth.userId) {
      throw new Error("Sign in to edit this event.");
    }

    const headers = await auth.authHeaders();
    const response = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ userId: auth.userId, ...updates }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.issues?.join(", ") ?? "Update failed");
    setEvent(data.event as CommunityEvent);
    return data.event as CommunityEvent;
  }

  function startEditing() {
    if (!event) return;
    setEditDraft(draftFromEvent(event));
    setEditError("");
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditError("");
    setEditDraft(null);
  }

  async function saveEdit() {
    if (!editDraft) return;
    const title = editDraft.title.trim();
    if (!title) {
      setEditError("Event name is required.");
      return;
    }
    const maxAttendees = Number(editDraft.maxAttendees || 0);
    if (!Number.isFinite(maxAttendees) || maxAttendees <= 0) {
      setEditError("Max attendees must be a positive number.");
      return;
    }

    setSaving(true);
    setEditError("");
    try {
      await patchEvent({
        title,
        description: editDraft.description.trim(),
        location: editDraft.location.trim(),
        startDate: editDraft.startDate,
        endDate: editDraft.endDate,
        category: editDraft.category,
        maxAttendees,
        visibility: editDraft.visibility,
      });
      setEditing(false);
      setEditDraft(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent() {
    if (!auth.userId) {
      setDeleteError("Sign in to delete this event.");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      const headers = await auth.authHeaders();
      const response = await fetch(
        `/api/events/${encodeURIComponent(eventId)}?userId=${encodeURIComponent(auth.userId)}`,
        { method: "DELETE", headers },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.issues?.join(", ") ?? "Delete failed");
      router.push("/app?tab=created");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  async function addMission() {
    if (!event) return;
    setMissionError("");
    const title = missionDraft.title.trim();
    if (!title) {
      setMissionError("Give the mission a title.");
      return;
    }
    const xpReward = Number(missionDraft.xp);
    if (!Number.isFinite(xpReward) || xpReward <= 0) {
      setMissionError("XP must be a positive number.");
      return;
    }

    const newMission: CommunityMission = {
      id: `mission_${Date.now()}`,
      title,
      description: missionDraft.description.trim() || "Complete this custom mission.",
      type: typeForProof(missionDraft.proofType),
      proofType: missionDraft.proofType,
      xpReward,
    };

    setSaving(true);
    try {
      await patchEvent({ missions: [...event.missions, newMission] });
      setMissionDraft(emptyMissionDraft);
      setAddingMission(false);
    } catch (err) {
      setMissionError(err instanceof Error ? err.message : "Could not add mission");
    } finally {
      setSaving(false);
    }
  }

  function startEditMission(mission: CommunityMission) {
    setEditingMissionId(mission.id);
    setMissionEditDraft({
      title: mission.title,
      description: mission.description,
      proofType: mission.proofType,
      xp: String(mission.xpReward),
    });
    setMissionEditError("");
    setPendingMissionDeleteId(null);
  }

  function cancelEditMission() {
    setEditingMissionId(null);
    setMissionEditDraft(emptyMissionDraft);
    setMissionEditError("");
  }

  async function saveEditMission(missionId: string) {
    if (!event) return;
    const title = missionEditDraft.title.trim();
    if (!title) {
      setMissionEditError("Mission title is required.");
      return;
    }
    const xpReward = Number(missionEditDraft.xp);
    if (!Number.isFinite(xpReward) || xpReward <= 0) {
      setMissionEditError("XP must be a positive number.");
      return;
    }

    const nextMissions = event.missions.map((mission) =>
      mission.id === missionId
        ? {
            ...mission,
            title,
            description: missionEditDraft.description.trim() || mission.description,
            type: typeForProof(missionEditDraft.proofType),
            proofType: missionEditDraft.proofType,
            xpReward,
          }
        : mission,
    );

    setSaving(true);
    try {
      await patchEvent({ missions: nextMissions });
      cancelEditMission();
    } catch (err) {
      setMissionEditError(err instanceof Error ? err.message : "Could not save mission");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMission(missionId: string) {
    if (!event) return;
    setSaving(true);
    try {
      await patchEvent({ missions: event.missions.filter((mission) => mission.id !== missionId) });
      setPendingMissionDeleteId(null);
      if (editingMissionId === missionId) cancelEditMission();
    } catch (err) {
      setMissionError(err instanceof Error ? err.message : "Could not delete mission");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/events/${encodeURIComponent(eventId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.issues?.join(", ") ?? "Event not found");
        return data.event as CommunityEvent;
      })
      .then((found) => {
        if (!cancelled) setEvent(found);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load event");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    fetch(`/api/leaderboard?eventId=${encodeURIComponent(eventId)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { entries?: LeaderboardEntry[] }) => setLeaderboard(data.entries ?? []))
      .catch(() => setLeaderboard([]));
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-primary-900)] border-t-[var(--color-pastel-blue)]" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-md bubbly-card bg-white p-6 text-center">
        <h1 className="font-display text-2xl font-bold">Event not found</h1>
        <p className="mt-2 text-xs font-bold opacity-60">{error || "This event link may have changed."}</p>
        <Link href="/app?tab=created" className="mt-4 inline-flex rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] px-5 py-2 text-xs font-bold">
          Back to Events
        </Link>
      </div>
    );
  }

  const isOwner = auth.userId === event.organizerId;

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-md bubbly-card bg-white p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-pink)]">
          <ShieldAlert size={22} />
        </div>
        <h1 className="font-display text-2xl font-bold">Not your event</h1>
        <p className="mt-2 text-xs font-bold opacity-60">
          Only <span className="font-bold">{event.organizerName}</span> can manage this event. Sign in with the organizer account to access this dashboard.
        </p>
        <Link href={`/app/event/${event.id}`} className="mt-4 inline-flex rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] px-5 py-2 text-xs font-bold">
          View attendee page
        </Link>
      </div>
    );
  }

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${event.shareUrl}` : event.shareUrl;
  const totalXp = event.missions.reduce((sum, mission) => sum + mission.xpReward, 0);

  const stats = [
    { label: "Attendees", value: `${event.attendees}/${event.maxAttendees}`, icon: <Users size={18} />, color: "var(--color-pastel-blue)" },
    { label: "Missions", value: event.missions.length.toString(), icon: <Target size={18} />, color: "var(--color-pastel-green)" },
    { label: "Total XP", value: totalXp.toLocaleString(), icon: <Trophy size={18} />, color: "var(--color-pastel-yellow)" },
    { label: "Top score", value: leaderboard[0]?.xp?.toLocaleString() ?? "—", icon: <Trophy size={18} />, color: "var(--color-pastel-purple)" },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-8">
      <Link href="/app?tab=created" className="inline-flex items-center gap-1 text-xs font-bold opacity-60 hover:opacity-100">
        <ArrowLeft size={14} /> Back to Events
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bubbly-card bg-white p-4 sm:p-6"
      >
        {!editing || !editDraft ? (
          <div className="space-y-3 sm:flex sm:items-start sm:justify-between sm:gap-3 sm:space-y-0">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-[var(--color-primary-900)] bg-[var(--color-pastel-yellow)] px-2 py-0.5 text-[10px] font-bold">
                  {event.category}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-primary-900)] bg-[var(--color-bg-base)] px-2 py-0.5 text-[10px] font-bold">
                  {event.visibility === "private" ? <><Lock size={10} /> Private</> : <><Globe size={10} /> Public</>}
                </span>
              </div>
              <h1 className="mt-3 font-display text-xl font-bold leading-tight sm:text-3xl">{event.title}</h1>
              {event.description && (
                <p className="mt-2 text-xs font-bold opacity-60 sm:text-sm">{event.description}</p>
              )}
              <div className="mt-3 flex flex-col gap-1 text-[11px] font-bold opacity-70 sm:flex-row sm:flex-wrap sm:gap-3 sm:text-xs">
                <span className="inline-flex items-center gap-1"><MapPin size={12} className="shrink-0" /> <span className="truncate">{event.location}</span></span>
                <span className="inline-flex items-center gap-1"><CalendarDays size={12} className="shrink-0" /> {event.startDate} → {event.endDate}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] px-3 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none sm:w-auto sm:py-1.5"
            >
              <Pencil size={12} /> Edit details
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-bold">Edit event</p>
              <button
                type="button"
                onClick={cancelEditing}
                aria-label="Cancel"
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--color-primary-900)] bg-white shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
              >
                <X size={14} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Event Name *</label>
              <input
                type="text"
                value={editDraft.title}
                onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-[var(--color-bg-base)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Description</label>
              <textarea
                rows={3}
                value={editDraft.description}
                onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-[var(--color-bg-base)] resize-none"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold mb-1">Location</label>
                <input
                  type="text"
                  value={editDraft.location}
                  onChange={(e) => setEditDraft({ ...editDraft, location: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-[var(--color-bg-base)]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Max Attendees</label>
                <input
                  type="number"
                  min={1}
                  value={editDraft.maxAttendees}
                  onChange={(e) => setEditDraft({ ...editDraft, maxAttendees: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-[var(--color-bg-base)]"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold mb-1">Start Date</label>
                <input
                  type="date"
                  value={editDraft.startDate}
                  onChange={(e) => setEditDraft({ ...editDraft, startDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-[var(--color-bg-base)]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">End Date</label>
                <input
                  type="date"
                  value={editDraft.endDate}
                  onChange={(e) => setEditDraft({ ...editDraft, endDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-[var(--color-bg-base)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setEditDraft({ ...editDraft, category: cat })}
                    className={`px-3 py-1.5 rounded-full border-2 border-[var(--color-primary-900)] text-xs font-bold transition-colors ${
                      editDraft.category === cat ? "bg-[var(--color-primary-900)] text-white" : "hover:bg-[var(--color-pastel-blue)]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Visibility</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditDraft({ ...editDraft, visibility: "public" })}
                  className={`flex items-start gap-2 rounded-xl border-2 border-[var(--color-primary-900)] p-3 text-left transition-colors ${
                    editDraft.visibility === "public" ? "bg-[var(--color-pastel-green)]" : "bg-white hover:bg-[var(--color-bg-base)]"
                  }`}
                >
                  <Globe size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Public</p>
                    <p className="text-[10px] font-bold opacity-60">Shows in Discover</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setEditDraft({ ...editDraft, visibility: "private" })}
                  className={`flex items-start gap-2 rounded-xl border-2 border-[var(--color-primary-900)] p-3 text-left transition-colors ${
                    editDraft.visibility === "private" ? "bg-[var(--color-pastel-yellow)]" : "bg-white hover:bg-[var(--color-bg-base)]"
                  }`}
                >
                  <Lock size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Private</p>
                    <p className="text-[10px] font-bold opacity-60">Hidden from Discover</p>
                  </div>
                </button>
              </div>
            </div>

            {editError && (
              <p className="rounded-xl border-2 border-red-500 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700">
                {editError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="flex-1 rounded-2xl border-2 border-[var(--color-primary-900)] bg-white py-2.5 text-sm font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-primary-900)] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--color-primary-700)] disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-3 rounded-2xl border-2 border-dashed border-[var(--color-primary-900)]/40 bg-[var(--color-bg-base)] p-3">
            <p className="text-[10px] font-bold opacity-70">
              Attendees can join by scanning the share link as a QR, pasting the link, or entering the event code in the <span className="font-bold">Enter an Event</span> dialog.
            </p>

            <div className="space-y-1">
              <p className="text-[10px] font-bold opacity-60">Event code</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="break-all rounded-lg border-2 border-[var(--color-primary-900)] bg-white px-2 py-1 font-mono text-[11px] font-bold">
                  {event.slug}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(event.slug).then(
                      () => {
                        setCopied("code");
                        setTimeout(() => setCopied(null), 1800);
                      },
                      () => undefined,
                    );
                  }}
                  className="rounded-full border-2 border-[var(--color-primary-900)] bg-white px-3 py-1 text-[11px] font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
                >
                  {copied === "code" ? "Copied" : "Copy code"}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold opacity-60">Share link</p>
              <p className="break-all font-mono text-[11px] font-bold leading-snug">{shareUrl}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(shareUrl).then(
                      () => {
                        setCopied("link");
                        setTimeout(() => setCopied(null), 1800);
                      },
                      () => undefined,
                    );
                  }}
                  className="flex-1 rounded-full border-2 border-[var(--color-primary-900)] bg-white px-3 py-1.5 text-[11px] font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none sm:flex-none"
                >
                  {copied === "link" ? "Copied" : "Copy link"}
                </button>
                <Link
                  href={event.shareUrl}
                  target="_blank"
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-blue)] px-3 py-1.5 text-[11px] font-bold sm:flex-none"
                >
                  Open <ExternalLink size={10} />
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] p-4 text-center sm:min-w-[160px]">
            <Users size={18} className="mb-1.5" />
            <p className="text-[10px] font-bold opacity-70">Total entries</p>
            <p className="font-display text-3xl font-bold leading-none">{event.attendees}</p>
            <p className="mt-1 text-[10px] font-bold opacity-70">of {event.maxAttendees} max</p>
            <button
              type="button"
              onClick={() => setEntriesOpen(true)}
              className="mt-2 text-[10px] font-bold underline underline-offset-2 opacity-80 transition-opacity hover:opacity-100"
            >
              View entries
            </button>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {stats.map((stat) => (
          <div key={stat.label} className="bubbly-card p-3 sm:p-4" style={{ backgroundColor: stat.color }}>
            <div className="mb-1.5">{stat.icon}</div>
            <p className="font-display text-lg font-bold sm:text-2xl">{stat.value}</p>
            <p className="text-[10px] font-bold opacity-70 sm:text-xs">{stat.label}</p>
          </div>
        ))}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="mb-2 flex items-end justify-between gap-3">
          <h2 className="font-display text-lg font-bold sm:text-xl">Missions</h2>
          {!addingMission && (
            <button
              type="button"
              onClick={() => { setAddingMission(true); setMissionError(""); }}
              className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-purple)] px-3 py-1 text-[11px] font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
            >
              <Plus size={12} /> Add mission
            </button>
          )}
        </div>
        <div className="bubbly-card bg-white p-3 sm:p-4 space-y-3">
          {event.missions.length === 0 ? (
            <p className="text-xs font-bold opacity-60">No missions configured yet.</p>
          ) : (
            <ul className="space-y-2">
              {event.missions.map((mission) => {
                const isEditing = editingMissionId === mission.id;
                const isPendingDelete = pendingMissionDeleteId === mission.id;
                return (
                  <li key={mission.id} className="rounded-xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] p-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-xs">Edit mission</p>
                          <button
                            type="button"
                            onClick={cancelEditMission}
                            aria-label="Cancel"
                            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--color-primary-900)] bg-white"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={missionEditDraft.title}
                          onChange={(e) => setMissionEditDraft({ ...missionEditDraft, title: e.target.value })}
                          placeholder="Mission title"
                          className="w-full px-3 py-2 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-white"
                        />
                        <textarea
                          rows={2}
                          value={missionEditDraft.description}
                          onChange={(e) => setMissionEditDraft({ ...missionEditDraft, description: e.target.value })}
                          placeholder="Description"
                          className="w-full px-3 py-2 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-white resize-none"
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <select
                            value={missionEditDraft.proofType}
                            onChange={(e) => setMissionEditDraft({ ...missionEditDraft, proofType: e.target.value as ProofType })}
                            className="w-full px-3 py-2 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-white"
                          >
                            {PROOF_TYPE_OPTIONS.map((proof) => (
                              <option key={proof} value={proof}>{PROOF_TYPE_COPY[proof].label}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={1}
                            value={missionEditDraft.xp}
                            onChange={(e) => setMissionEditDraft({ ...missionEditDraft, xp: e.target.value })}
                            placeholder="XP reward"
                            className="w-full px-3 py-2 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-white"
                          />
                        </div>
                        {missionEditError && (
                          <p className="rounded-xl border-2 border-red-500 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700">
                            {missionEditError}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={cancelEditMission}
                            disabled={saving}
                            className="flex-1 rounded-full border-2 border-[var(--color-primary-900)] bg-white py-1.5 text-[11px] font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEditMission(mission.id)}
                            disabled={saving}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-primary-900)] py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[var(--color-primary-700)] disabled:opacity-60"
                          >
                            <Check size={12} /> {saving ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold sm:text-sm">{mission.title}</p>
                          <p className="truncate text-[10px] font-bold opacity-60">{mission.proofType} · {mission.proofLocation ?? "Anywhere"}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-2 py-0.5 text-[10px] font-bold">
                          +{mission.xpReward} XP
                        </span>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditMission(mission)}
                            aria-label="Edit mission"
                            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--color-primary-900)] bg-white shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
                          >
                            <Pencil size={12} />
                          </button>
                          {!isPendingDelete ? (
                            <button
                              type="button"
                              onClick={() => setPendingMissionDeleteId(mission.id)}
                              aria-label="Delete mission"
                              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-red-600 bg-red-50 text-red-700 shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
                            >
                              <Trash2 size={12} />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setPendingMissionDeleteId(null)}
                                disabled={saving}
                                aria-label="Cancel delete"
                                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--color-primary-900)] bg-white"
                              >
                                <X size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteMission(mission.id)}
                                disabled={saving}
                                aria-label="Confirm delete"
                                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-red-600 bg-red-600 text-white disabled:opacity-60"
                              >
                                <Check size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {addingMission && (
            <div className="space-y-3 rounded-2xl border-2 border-dashed border-[var(--color-primary-900)]/40 bg-[var(--color-bg-base)] p-3">
              <div className="flex items-center justify-between">
                <p className="font-bold text-xs">New mission</p>
                <button
                  type="button"
                  onClick={() => { setAddingMission(false); setMissionDraft(emptyMissionDraft); setMissionError(""); }}
                  aria-label="Cancel"
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--color-primary-900)] bg-white"
                >
                  <X size={12} />
                </button>
              </div>

              <input
                type="text"
                value={missionDraft.title}
                onChange={(e) => setMissionDraft({ ...missionDraft, title: e.target.value })}
                placeholder="Mission title"
                className="w-full px-3 py-2 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-white"
              />

              <textarea
                rows={2}
                value={missionDraft.description}
                onChange={(e) => setMissionDraft({ ...missionDraft, description: e.target.value })}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-white resize-none"
              />

              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={missionDraft.proofType}
                  onChange={(e) => setMissionDraft({ ...missionDraft, proofType: e.target.value as ProofType })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-white"
                >
                  {PROOF_TYPE_OPTIONS.map((proof) => (
                    <option key={proof} value={proof}>{PROOF_TYPE_COPY[proof].label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={missionDraft.xp}
                  onChange={(e) => setMissionDraft({ ...missionDraft, xp: e.target.value })}
                  placeholder="XP reward"
                  className="w-full px-3 py-2 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-white"
                />
              </div>

              {missionError && (
                <p className="rounded-xl border-2 border-red-500 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700">
                  {missionError}
                </p>
              )}

              <button
                type="button"
                onClick={addMission}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-primary-900)] px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[var(--color-primary-700)] disabled:opacity-60"
              >
                <Plus size={12} /> {saving ? "Adding..." : "Add mission"}
              </button>
            </div>
          )}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="font-display text-lg font-bold mb-2 sm:text-xl">Mission QR codes</h2>
        <MissionQRCodePanel
          eventId={event.id}
          eventTitle={event.title}
          missions={event.missions.map((mission) => ({
            id: mission.id,
            title: mission.title,
            type: mission.type,
            proofType: mission.proofType,
            xpReward: mission.xpReward,
          }))}
        />
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h2 className="font-display text-lg font-bold mb-2 sm:text-xl">Top participants</h2>
        <div className="bubbly-card bg-white p-3 sm:p-4">
          {leaderboard.length === 0 ? (
            <p className="text-xs font-bold opacity-60">No proof-backed rankings yet. Submissions from attendees will populate this list.</p>
          ) : (
            <ul className="space-y-2">
              {leaderboard.slice(0, 10).map((entry) => (
                <li key={entry.userId} className="flex items-center justify-between gap-3 rounded-xl border-2 border-[var(--color-primary-900)] bg-[var(--color-bg-base)] p-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-5 text-center text-xs font-bold opacity-50">#{entry.rank}</span>
                    <span>{entry.avatar}</span>
                    <span className="truncate text-xs font-bold">{entry.name}</span>
                  </div>
                  <span className="shrink-0 text-xs font-bold opacity-70">{entry.xp} XP</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="font-display text-lg font-bold mb-2 sm:text-xl">Danger zone</h2>
        <div className="bubbly-card bg-white p-4 sm:p-5">
          {!confirmingDelete ? (
            <div className="space-y-3 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:space-y-0">
              <div className="min-w-0">
                <p className="text-sm font-bold">Delete this event</p>
                <p className="text-xs font-bold opacity-60">
                  Removes the event, its missions, and all registrations. This can&apos;t be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setConfirmingDelete(true); setDeleteError(""); }}
                className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-full border-2 border-red-600 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none sm:w-auto sm:py-1.5"
              >
                <Trash2 size={12} /> Delete event
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-bold">
                Permanently delete <span className="font-display">{event.title}</span>?
              </p>
              <p className="text-xs font-bold opacity-60">
                Type the event name exactly to confirm, or cancel to keep the event.
              </p>
              <DeleteConfirm
                expected={event.title}
                disabled={deleting}
                onConfirm={deleteEvent}
                onCancel={() => { setConfirmingDelete(false); setDeleteError(""); }}
              />
              {deleteError && (
                <p className="rounded-xl border-2 border-red-500 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700">
                  {deleteError}
                </p>
              )}
            </div>
          )}
        </div>
      </motion.section>

      <EventEntriesDialog
        open={entriesOpen}
        onClose={() => setEntriesOpen(false)}
        eventId={event.id}
        eventTitle={event.title}
      />
    </div>
  );
}

function DeleteConfirm({
  expected,
  disabled,
  onConfirm,
  onCancel,
}: {
  expected: string;
  disabled: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const matches = value.trim() === expected.trim();
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={expected}
        className="w-full px-3 py-2 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="flex-1 rounded-2xl border-2 border-[var(--color-primary-900)] bg-white py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!matches || disabled}
          className="flex-1 rounded-2xl border-2 border-red-600 bg-red-600 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {disabled ? "Deleting..." : "Delete event"}
        </button>
      </div>
    </div>
  );
}
