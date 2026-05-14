"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Plus, Trash2, ArrowLeft, Globe, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PROOF_TYPE_COPY, type ProofType } from "@/lib/mock-data";
import type { CommunityEvent, EventVisibility } from "@/lib/community-store";
import MissionQRCodePanel from "@/components/MissionQRCodePanel";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";

const MISSION_TEMPLATES = [
  { title: "Check in at entrance", type: "qr", proofType: "qr_scan", xp: 50, description: "Scan the venue entrance QR code." },
  { title: "Connect with 3 other attendees", type: "manual", proofType: "organizer_approval", xp: 120, description: "Connect with three attendees not already in your friend list." },
  { title: "Scan QR code at Superteam booth", type: "qr", proofType: "qr_scan", xp: 80, description: "Visit Superteam and scan their booth QR." },
  { title: "Test your knowledge on BlockNova", type: "text", proofType: "quiz_code", xp: 100, description: "Enter the BlockNova quiz or speaker code." },
  { title: "Collect any sponsor Merch", type: "photo", proofType: "photo_upload", xp: 90, description: "Upload proof of sponsor merch collected." },
  { title: "Upload the best picture you took at the venue", type: "photo", proofType: "photo_upload", xp: 110, description: "Upload your best venue photo." },
] satisfies Array<{ title: string; type: string; proofType: ProofType; xp: number; description: string }>;

const CATEGORIES = ["Conference", "Hackathon", "Meetup", "Workshop", "Festival", "Community", "Brand Activation"];

const PROOF_TYPE_OPTIONS: ProofType[] = ["qr_scan", "nfc_tap", "photo_upload", "quiz_code", "organizer_approval"];

function typeForProof(proofType: ProofType): string {
  switch (proofType) {
    case "qr_scan": return "qr";
    case "nfc_tap": return "nfc";
    case "photo_upload": return "photo";
    case "quiz_code": return "text";
    case "organizer_approval": return "manual";
  }
}

interface MissionDraft {
  id: number;
  title: string;
  type: string;
  proofType: ProofType;
  xp: number;
  description: string;
}

export default function AppCreateEventPage() {
  const auth = useProofPlayAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [missions, setMissions] = useState<MissionDraft[]>([]);
  const [nextMissionId, setNextMissionId] = useState(1);
  const [eventDetails, setEventDetails] = useState({
    title: "",
    description: "",
    location: "",
    maxAttendees: "300",
    startDate: "",
    endDate: "",
    category: "Community",
  });
  const [visibility, setVisibility] = useState<EventVisibility>("public");
  const [customDraft, setCustomDraft] = useState<{
    title: string;
    description: string;
    proofType: ProofType;
    xp: string;
  }>({
    title: "",
    description: "",
    proofType: "qr_scan",
    xp: "75",
  });
  const [customError, setCustomError] = useState("");
  const [createdEvent, setCreatedEvent] = useState<CommunityEvent | null>(null);
  const [submitStatus, setSubmitStatus] = useState("");

  const addMission = (template: typeof MISSION_TEMPLATES[0]) => {
    setMissions([...missions, { ...template, id: nextMissionId }]);
    setNextMissionId((prev) => prev + 1);
  };

  const addCustomMission = () => {
    setCustomError("");
    const title = customDraft.title.trim();
    if (!title) {
      setCustomError("Give your mission a title.");
      return;
    }
    const xpReward = Number(customDraft.xp);
    if (!Number.isFinite(xpReward) || xpReward <= 0) {
      setCustomError("XP must be a positive number.");
      return;
    }

    setMissions([
      ...missions,
      {
        id: nextMissionId,
        title,
        description: customDraft.description.trim() || "Complete this custom mission.",
        type: typeForProof(customDraft.proofType),
        proofType: customDraft.proofType,
        xp: xpReward,
      },
    ]);
    setNextMissionId((prev) => prev + 1);
    setCustomDraft({ title: "", description: "", proofType: "qr_scan", xp: "75" });
  };

  const removeMission = (id: number) => {
    setMissions(missions.filter((m) => m.id !== id));
  };

  const updateEventDetails = (key: keyof typeof eventDetails, value: string) => {
    setEventDetails((current) => ({ ...current, [key]: value }));
  };

  async function launchEvent() {
    if (!auth.authenticated || !auth.userId) {
      setSubmitStatus("Sign in to publish events under your account.");
      auth.login();
      return;
    }

    setSubmitStatus("Publishing event...");

    try {
      const headers = await auth.authHeaders();
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          ...eventDetails,
          organizerId: auth.userId,
          organizerName: auth.displayName,
          visibility,
          maxAttendees: Number(eventDetails.maxAttendees || 100),
          missions: missions.map((mission) => ({
            id: `mission_${mission.id}`,
            title: mission.title,
            description: mission.description,
            type: mission.type,
            proofType: mission.proofType,
            xpReward: mission.xp,
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.issues?.join(", ") ?? "Could not publish event");

      setCreatedEvent(data.event);
      setSubmitStatus("Event published. Opening your event dashboard...");
      router.push(`/organizer/event/${data.event.id}`);
    } catch (error) {
      setSubmitStatus(error instanceof Error ? error.message : "Could not publish event");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 sm:space-y-6">
      <Link href="/app?tab=created" className="inline-flex items-center gap-1 text-xs font-bold opacity-60 hover:opacity-100">
        <ArrowLeft size={14} /> Back to Events
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Create Event</h1>
        <p className="text-sm font-bold opacity-60 mt-1">Set up your event and add missions for attendees</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-2"
      >
        {[1, 2, 3].map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`flex-1 h-2 rounded-full border-2 border-[var(--color-primary-900)] transition-all ${
              s <= step ? "bg-[var(--color-pastel-purple)]" : "bg-gray-100"
            }`}
          />
        ))}
      </motion.div>

      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="bubbly-card p-6 bg-white space-y-4">
            <h2 className="font-display text-xl font-bold">Event Details</h2>

            <div>
              <label className="block text-xs font-bold mb-1">Event Name *</label>
              <input
                type="text"
                value={eventDetails.title}
                onChange={(event) => updateEventDetails("title", event.target.value)}
                placeholder="e.g. BlockNova Event"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-[var(--color-bg-base)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Description *</label>
              <textarea
                rows={3}
                value={eventDetails.description}
                onChange={(event) => updateEventDetails("description", event.target.value)}
                placeholder="Tell attendees what this event is about..."
                className="w-full px-4 py-2.5 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-[var(--color-bg-base)] resize-none"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold mb-1">Location *</label>
                <input
                  type="text"
                  value={eventDetails.location}
                  onChange={(event) => updateEventDetails("location", event.target.value)}
                  placeholder="City, Country"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-[var(--color-bg-base)]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Max Attendees</label>
                <input
                  type="number"
                  value={eventDetails.maxAttendees}
                  onChange={(event) => updateEventDetails("maxAttendees", event.target.value)}
                  placeholder="500"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-[var(--color-bg-base)]"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold mb-1">Start Date *</label>
                <input
                  type="date"
                  value={eventDetails.startDate}
                  onChange={(event) => updateEventDetails("startDate", event.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-[var(--color-bg-base)]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">End Date *</label>
                <input
                  type="date"
                  value={eventDetails.endDate}
                  onChange={(event) => updateEventDetails("endDate", event.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-[var(--color-bg-base)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Category *</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => updateEventDetails("category", cat)}
                    className={`px-3 py-1.5 rounded-full border-2 border-[var(--color-primary-900)] text-xs font-bold hover:bg-[var(--color-pastel-blue)] transition-colors ${
                      eventDetails.category === cat ? "bg-[var(--color-primary-900)] text-white" : ""
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Visibility *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`flex items-start gap-2 rounded-xl border-2 border-[var(--color-primary-900)] p-3 text-left transition-colors ${
                    visibility === "public" ? "bg-[var(--color-pastel-green)]" : "bg-white hover:bg-[var(--color-bg-base)]"
                  }`}
                >
                  <Globe size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Public</p>
                    <p className="text-[10px] font-bold opacity-60">Shows in Discover for everyone</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("private")}
                  className={`flex items-start gap-2 rounded-xl border-2 border-[var(--color-primary-900)] p-3 text-left transition-colors ${
                    visibility === "private" ? "bg-[var(--color-pastel-yellow)]" : "bg-white hover:bg-[var(--color-bg-base)]"
                  }`}
                >
                  <Lock size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Private</p>
                    <p className="text-[10px] font-bold opacity-60">Hidden — joinable only with the code or link</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full bg-[var(--color-primary-900)] text-white font-bold py-3 rounded-2xl border-2 border-[var(--color-primary-900)] hover:bg-[var(--color-primary-700)] transition-colors"
          >
            Next: Add Missions
          </button>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="bubbly-card p-5 bg-white">
            <h2 className="font-display text-xl font-bold mb-1">Add Missions</h2>
            <p className="text-xs font-bold opacity-60 mb-3">Pick from templates or create your own</p>

            <div className="grid gap-2 sm:grid-cols-2">
              {MISSION_TEMPLATES.map((template, i) => (
                <button
                  key={i}
                  onClick={() => addMission(template)}
                  className="bubbly-card p-3 bg-[var(--color-bg-base)] text-left transition-all active:translate-y-0.5 active:shadow-none"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold bg-[var(--color-pastel-blue)] px-1.5 py-0.5 rounded-full border border-[var(--color-primary-900)] uppercase">
                      {template.type}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--color-primary-500)]">+{template.xp} XP</span>
                  </div>
                  <p className="font-bold text-xs">{template.title}</p>
                  <p className="text-[9px] font-bold opacity-50 mt-1">{PROOF_TYPE_COPY[template.proofType].label}</p>
                  <Plus size={14} className="mt-1 opacity-40" />
                </button>
              ))}
            </div>
          </div>

          <div className="bubbly-card p-5 bg-white space-y-3">
            <div>
              <h3 className="font-display text-lg font-bold">Create custom mission</h3>
              <p className="text-xs font-bold opacity-60">Build a one-off mission with your own title, proof type, and XP.</p>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Title *</label>
              <input
                type="text"
                value={customDraft.title}
                onChange={(event) => setCustomDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g. Visit the rooftop terrace"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-[var(--color-bg-base)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Description</label>
              <textarea
                rows={2}
                value={customDraft.description}
                onChange={(event) => setCustomDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="What does the attendee need to do?"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-[var(--color-bg-base)] resize-none"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold mb-1">Proof type *</label>
                <select
                  value={customDraft.proofType}
                  onChange={(event) =>
                    setCustomDraft((current) => ({ ...current, proofType: event.target.value as ProofType }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-[var(--color-bg-base)]"
                >
                  {PROOF_TYPE_OPTIONS.map((proof) => (
                    <option key={proof} value={proof}>
                      {PROOF_TYPE_COPY[proof].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">XP reward *</label>
                <input
                  type="number"
                  min={1}
                  value={customDraft.xp}
                  onChange={(event) => setCustomDraft((current) => ({ ...current, xp: event.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-[var(--color-primary-900)] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-purple)] bg-[var(--color-bg-base)]"
                />
              </div>
            </div>

            {customError && (
              <p className="rounded-xl border-2 border-red-500 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700">
                {customError}
              </p>
            )}

            <button
              type="button"
              onClick={addCustomMission}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-purple)] px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
            >
              <Plus size={14} /> Add custom mission
            </button>
          </div>

          {missions.length > 0 && (
            <div className="bubbly-card p-5 bg-white">
              <h3 className="font-display text-lg font-bold mb-3">Your Missions ({missions.length})</h3>
              <div className="space-y-2">
                {missions.map((mission) => (
                  <div
                    key={mission.id}
                    className="rounded-xl border-2 border-[var(--color-primary-900)] p-3 bg-[var(--color-bg-base)] flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-xs">{mission.title}</p>
                      <span className="text-[10px] font-bold text-[var(--color-primary-500)]">
                        +{mission.xp} XP - {PROOF_TYPE_COPY[mission.proofType].label}
                      </span>
                    </div>
                    <button onClick={() => removeMission(mission.id)} className="opacity-40 hover:opacity-100 hover:text-red-500 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-white font-bold py-3 rounded-2xl border-2 border-[var(--color-primary-900)] hover:bg-gray-50 transition-colors shadow-[2px_2px_0px_0px_#312e81]"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 bg-[var(--color-primary-900)] text-white font-bold py-3 rounded-2xl border-2 border-[var(--color-primary-900)] hover:bg-[var(--color-primary-700)] transition-colors"
            >
              Next: Preview
            </button>
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="bubbly-card p-6 bg-gradient-to-br from-[var(--color-pastel-purple)] to-[var(--color-pastel-pink)] text-center">
            <h2 className="font-display text-2xl font-bold mb-2">{createdEvent ? "Event Live!" : "Ready to Launch"}</h2>
            <p className="text-sm font-bold opacity-70">
              {createdEvent
                ? "Your event is live. Print the QR codes below and place them at each checkpoint."
                : "Review your event, then hit Launch to publish."}
            </p>

            <div className="mt-4 bg-white/50 backdrop-blur-sm rounded-xl border-2 border-[var(--color-primary-900)] p-3 text-xs font-bold">
              <p>Event Link:</p>
              <p className="mt-0.5 break-all text-[var(--color-primary-500)]">
                {createdEvent ? `https://proofplayed.vercel.app${createdEvent.shareUrl}` : "Publish to generate a share link"}
              </p>
            </div>
          </div>

          <MissionQRCodePanel
            eventId={createdEvent?.id ?? `draft-${Date.now()}`}
            eventTitle={eventDetails.title || "Untitled Event"}
            missions={missions.map((m) => ({
              id: createdEvent
                ? (createdEvent.missions.find((cm) => cm.title === m.title)?.id ?? `mission_${m.id}`)
                : `mission_${m.id}`,
              title: m.title,
              type: m.type,
              proofType: m.proofType,
              xpReward: m.xp,
            }))}
          />

          <div className="bubbly-card p-5 bg-white">
            <h3 className="font-display text-lg font-bold mb-3">Event Summary</h3>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-[var(--color-bg-base)] border-2 border-[var(--color-primary-900)] p-3 text-center">
                <p className="font-bold text-xl">{missions.length}</p>
                <p className="text-xs font-bold opacity-60">Missions</p>
              </div>
              <div className="rounded-xl bg-[var(--color-bg-base)] border-2 border-[var(--color-primary-900)] p-3 text-center">
                <p className="font-bold text-xl">{missions.reduce((s, m) => s + m.xp, 0)}</p>
                <p className="text-xs font-bold opacity-60">Total XP</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => setStep(2)}
              className="flex-1 bg-white font-bold py-3 rounded-2xl border-2 border-[var(--color-primary-900)] hover:bg-gray-50 transition-colors shadow-[2px_2px_0px_0px_#312e81]"
            >
              Back
            </button>
            <button
              onClick={launchEvent}
              className="flex-1 bg-[var(--color-primary-900)] text-white font-bold py-3 rounded-2xl border-2 border-[var(--color-primary-900)] hover:bg-[var(--color-primary-700)] transition-colors"
            >
              Launch Event
            </button>
          </div>
          {submitStatus && (
            <p className="rounded-2xl border-2 border-[var(--color-primary-900)] bg-white p-3 text-center text-xs font-bold">
              {submitStatus}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
