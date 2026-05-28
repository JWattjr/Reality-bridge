"use client";

import { Check, ShieldCheck, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { XLayerClaimPanel } from "@/components/XLayerClaimPanel";
import { formatUSDT } from "@/lib/football-data";
import { useAuthStore } from "@/store/useAuthStore";
import { useUserProfile, useUpdateProfile, useUserPredictions } from "@/hooks/useApi";

type ProfileForm = {
  displayName: string;
  handle: string;
  userTag: string;
  bio: string;
  avatar: string;
};

export default function ProfilePage() {
  const auth = useAuthStore();
  const { data: profile, isLoading: isProfileLoading } = useUserProfile(auth);
  const updateProfileMutation = useUpdateProfile(auth);
  const { data: userDbPredictions = [] } = useUserPredictions(auth);

  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState<ProfileForm>({
    displayName: "",
    handle: "",
    userTag: "",
    bio: "",
    avatar: "",
  });

  const visibleProfile = {
    displayName: profile?.displayName ?? auth.displayName ?? "ProofPlayer",
    avatar: profile?.avatar ?? initialsFor(auth.displayName ?? "ProofPlayer"),
    handle: profile?.handle ?? "proofplayer",
    userTag: profile?.userTag ?? "PP-SIGNIN",
    bio: profile?.bio ?? "Football fan backing picks on ProofPlay.",
  };

  const stats = useMemo(() => {
    return {
      gamesPlayed: new Set(userDbPredictions.map((pick) => pick.gameId)).size,
      correct: userDbPredictions.filter((pick) => pick.isCorrect).length,
      staked: userDbPredictions.reduce((sum, pick) => sum + pick.amountUSDT, 0),
      won: userDbPredictions.reduce((sum, pick) => sum + (pick.winningsUSDT ?? 0), 0),
      nftsWon: 0,
    };
  }, [userDbPredictions]);

  async function saveProfile() {
    if (!auth.authenticated || !auth.userId) {
      auth.login();
      return;
    }

    setStatus("Saving profile...");
    try {
      await updateProfileMutation.mutateAsync(form);
      setIsEditing(false);
      setStatus("Profile saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Profile save failed");
    }
  }

  if (isProfileLoading) {
    return (
      <div className="py-20 text-center font-display text-lg font-bold opacity-60">
        Loading player profile...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="bubbly-card bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-3 border-primary-900 bg-pastel-blue font-display text-3xl font-bold shadow-[3px_3px_0px_0px_#312e81]">
              {visibleProfile.avatar}
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold">{visibleProfile.displayName}</h1>
              <p className="text-xs font-bold opacity-60">@{visibleProfile.handle}</p>
              <p className="mt-1 max-w-md text-sm font-bold opacity-70">{visibleProfile.bio}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm({
                displayName: visibleProfile.displayName,
                handle: visibleProfile.handle,
                userTag: visibleProfile.userTag,
                bio: visibleProfile.bio,
                avatar: visibleProfile.avatar,
              });
              setIsEditing((current) => !current);
              setStatus("");
            }}
            className="rounded-full border-2 border-primary-900 bg-pastel-green px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none"
          >
            Edit Profile
          </button>
        </div>
      </section>

      {isEditing && (
        <section className="bubbly-card bg-white p-4">
          <h2 className="font-display text-xl font-bold">Profile Basics</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ProfileField label="Username" value={form.displayName} onChange={(value) => setForm((current) => ({ ...current, displayName: value }))} />
            <ProfileField label="Handle" value={form.handle} onChange={(value) => setForm((current) => ({ ...current, handle: value }))} />
            <ProfileField label="Player tag" value={form.userTag} onChange={(value) => setForm((current) => ({ ...current, userTag: value }))} />
            <ProfileField label="Avatar" value={form.avatar} maxLength={3} onChange={(value) => setForm((current) => ({ ...current, avatar: value.toUpperCase() }))} />
          </div>
          <label className="mt-3 block">
            <span className="text-[10px] font-bold uppercase opacity-50">Bio</span>
            <textarea
              value={form.bio}
              onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
              className="mt-1 min-h-20 w-full rounded-2xl border-2 border-primary-900 bg-bg-base px-3 py-2 text-xs font-bold outline-none"
            />
          </label>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs font-bold opacity-70">{status}</p>
            <button
              type="button"
              onClick={saveProfile}
              className="inline-flex items-center gap-1 rounded-full border-2 border-primary-900 bg-pastel-green px-4 py-2 text-xs font-bold"
            >
              <Check size={14} /> Save
            </button>
          </div>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-5">
        <StatCard label="Games" value={stats.gamesPlayed.toString()} />
        <StatCard label="Correct Picks" value={stats.correct.toString()} />
        <StatCard label="USDT Staked" value={formatUSDT(stats.staked)} />
        <StatCard label="USDT Won" value={formatUSDT(stats.won)} />
        <StatCard label="NFTs Won" value={stats.nftsWon.toString()} />
      </section>

      <section>
        <div className="bubbly-card bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Trophy size={18} />
            <h2 className="font-display text-xl font-bold">Recent Game Results</h2>
          </div>
          <div className="space-y-2">
            {userDbPredictions.map((pick) => (
              <div key={pick.id} className="flex items-center justify-between rounded-2xl border-2 border-primary-900 bg-bg-base px-3 py-2 text-xs font-bold">
                <span>{pick.optionLabel}</span>
                <span>{pick.status === "ACTIVE" ? "Active" : `${pick.pointsEarned} point`}</span>
              </div>
            ))}
            {userDbPredictions.length === 0 && (
              <p className="text-sm font-bold opacity-60">No picks backed yet.</p>
            )}
          </div>
        </div>
      </section>

      <XLayerClaimPanel />

      <section className="bubbly-card bg-white p-4">
        <div className="flex items-start gap-2">
          <ShieldCheck size={18} className="mt-0.5" />
          <p className="text-xs font-bold opacity-70">
            Profile is intentionally minimal: username, wallet, game totals, USDT totals, NFTs won, and recent match results. No XP, reputation score, feeds, comments, or attendance credentials.
          </p>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bubbly-card bg-white p-3 text-center">
      <p className="font-display text-xl font-bold">{value}</p>
      <p className="text-[10px] font-bold uppercase opacity-50">{label}</p>
    </div>
  );
}

function ProfileField({
  label,
  value,
  maxLength = 40,
  onChange,
}: {
  label: string;
  value: string;
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase opacity-50">{label}</span>
      <input
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-full border-2 border-primary-900 bg-bg-base px-3 py-2 text-xs font-bold outline-none"
      />
    </label>
  );
}

function initialsFor(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "PP";
}
