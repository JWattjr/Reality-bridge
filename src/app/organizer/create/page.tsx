"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PROOF_TYPE_COPY, type ProofType } from "@/lib/mock-data";
import type { CommunityEvent } from "@/lib/community-store";

const MISSION_TEMPLATES = [
  { title: "Check in at entrance", type: "qr", proofType: "qr_scan", xp: 50, description: "Scan the venue entrance QR code." },
  { title: "Connect with 3 other attendees", type: "manual", proofType: "organizer_approval", xp: 120, description: "Connect with three attendees not already in your friend list." },
  { title: "Scan QR code at Superteam booth", type: "qr", proofType: "qr_scan", xp: 80, description: "Visit Superteam and scan their booth QR." },
  { title: "Test your knowledge on BlockNova", type: "text", proofType: "quiz_code", xp: 100, description: "Enter the BlockNova quiz or speaker code." },
  { title: "Collect any sponsor Merch", type: "photo", proofType: "photo_upload", xp: 90, description: "Upload proof of sponsor merch collected." },
  { title: "Upload the best picture you took at the venue", type: "photo", proofType: "photo_upload", xp: 110, description: "Upload your best venue photo." },
] satisfies Array<{ title: string; type: string; proofType: ProofType; xp: number; description: string }>;

const CATEGORIES = ["Conference", "Hackathon", "Meetup", "Workshop", "Festival", "Community", "Brand Activation"];

interface MissionDraft {
  id: number;
  title: string;
  type: string;
  proofType: ProofType;
  xp: number;
  description: string;
}

export default function CreateEventPage() {
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
  const [createdEvent, setCreatedEvent] = useState<CommunityEvent | null>(null);
  const [submitStatus, setSubmitStatus] = useState("");

  const addMission = (template: typeof MISSION_TEMPLATES[0]) => {
    setMissions([...missions, { ...template, id: nextMissionId }]);
    setNextMissionId((prev) => prev + 1);
  };

  const removeMission = (id: number) => {
    setMissions(missions.filter((m) => m.id !== id));
  };

  const updateEventDetails = (key: keyof typeof eventDetails, value: string) => {
    setEventDetails((current) => ({ ...current, [key]: value }));
  };

  async function launchEvent() {
    setSubmitStatus("Publishing event...");

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...eventDetails,
          organizerId: "organizer-demo",
          organizerName: "ProofPlay Host",
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
      setSubmitStatus("Event published. It now appears in Current Events.");
    } catch (error) {
      setSubmitStatus(error instanceof Error ? error.message : "Could not publish event");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/organizer" className="inline-flex items-center gap-1 text-xs font-bold opacity-60 hover:opacity-100">
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-3xl font-bold">✨ Create Event</h1>
        <p className="text-sm font-bold opacity-60 mt-1">Set up your event and add missions for attendees</p>
      </motion.div>

      {/* Step Indicator */}
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

      {/* Step 1: Event Details */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="bubbly-card p-6 bg-white space-y-4">
            <h2 className="font-display text-xl font-bold">📋 Event Details</h2>

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

            <div className="grid grid-cols-2 gap-3">
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

            <div className="grid grid-cols-2 gap-3">
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
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full bg-[var(--color-primary-900)] text-white font-bold py-3 rounded-2xl border-2 border-[var(--color-primary-900)] hover:bg-[var(--color-primary-700)] transition-colors"
          >
            Next: Add Missions →
          </button>
        </motion.div>
      )}

      {/* Step 2: Missions */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          {/* Templates */}
          <div className="bubbly-card p-5 bg-white">
            <h2 className="font-display text-xl font-bold mb-1">🚀 Add Missions</h2>
            <p className="text-xs font-bold opacity-60 mb-3">Pick from templates or create custom ones</p>

            <div className="grid grid-cols-2 gap-2">
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

          {/* Added Missions */}
          {missions.length > 0 && (
            <div className="bubbly-card p-5 bg-white">
              <h3 className="font-display text-lg font-bold mb-3">📋 Your Missions ({missions.length})</h3>
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

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-white font-bold py-3 rounded-2xl border-2 border-[var(--color-primary-900)] hover:bg-gray-50 transition-colors shadow-[2px_2px_0px_0px_#312e81]"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 bg-[var(--color-primary-900)] text-white font-bold py-3 rounded-2xl border-2 border-[var(--color-primary-900)] hover:bg-[var(--color-primary-700)] transition-colors"
            >
              Next: Preview →
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 3: Preview & QR */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="bubbly-card p-6 bg-gradient-to-br from-[var(--color-pastel-purple)] to-[var(--color-pastel-pink)] text-center">
            <h2 className="font-display text-2xl font-bold mb-2">🎉 Ready to Launch!</h2>
            <p className="text-sm font-bold opacity-70">Your event is ready. Share the QR code with attendees.</p>

            {/* QR Code Placeholder */}
            <div className="w-40 h-40 mx-auto mt-6 bg-white bubbly-border flex items-center justify-center shadow-[3px_3px_0px_0px_#312e81]">
              <div className="text-center">
                <p className="text-4xl mb-1">📱</p>
                <p className="text-[10px] font-bold opacity-60">QR Code</p>
              </div>
            </div>

            <div className="mt-4 bg-white/50 backdrop-blur-sm rounded-xl border-2 border-[var(--color-primary-900)] p-3 text-xs font-bold">
              <p>Event Link:</p>
              <p className="text-[var(--color-primary-500)] mt-0.5">
                {createdEvent ? `https://proofplayed.vercel.app${createdEvent.shareUrl}` : "Publish to generate a share link"}
              </p>
            </div>
          </div>

          <div className="bubbly-card p-5 bg-white">
            <h3 className="font-display text-lg font-bold mb-3">📊 Event Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
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

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 bg-white font-bold py-3 rounded-2xl border-2 border-[var(--color-primary-900)] hover:bg-gray-50 transition-colors shadow-[2px_2px_0px_0px_#312e81]"
            >
              ← Back
            </button>
            <button
              onClick={launchEvent}
              className="flex-1 bg-[var(--color-primary-900)] text-white font-bold py-3 rounded-2xl border-2 border-[var(--color-primary-900)] hover:bg-[var(--color-primary-700)] transition-colors"
            >
              🚀 Launch Event
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
