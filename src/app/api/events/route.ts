import { createCommunityEvent, listCommunityEvents } from "@/lib/community-store";
import type { CommunityMission } from "@/lib/community-store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query") ?? undefined;
  const userId = url.searchParams.get("userId") ?? undefined;
  const events = await listCommunityEvents({ query, userId });

  return Response.json({ status: "ok", events });
}

export async function POST(request: Request) {
  const body = await request.json();
  const issues = validateEventBody(body);

  if (issues.length > 0) {
    return Response.json({ status: "rejected", issues }, { status: 422 });
  }

  const event = await createCommunityEvent({
    title: body.title,
    description: body.description,
    location: body.location,
    startDate: body.startDate,
    endDate: body.endDate,
    organizerId: body.organizerId,
    organizerName: body.organizerName,
    category: body.category,
    maxAttendees: Number(body.maxAttendees ?? 100),
    missions: Array.isArray(body.missions) ? body.missions.map(normalizeMission) : undefined,
  });

  return Response.json({ status: "created", event }, { status: 201 });
}

function validateEventBody(body: Record<string, unknown>) {
  const issues: string[] = [];

  for (const key of ["title", "description", "location", "startDate", "endDate", "organizerId", "category"]) {
    if (typeof body[key] !== "string" || !body[key]) {
      issues.push(`${key} is required`);
    }
  }

  return issues;
}

function normalizeMission(mission: Record<string, unknown>, index: number): CommunityMission {
  return {
    id: typeof mission.id === "string" ? mission.id : `mission_${index + 1}`,
    title: typeof mission.title === "string" ? mission.title : `Mission ${index + 1}`,
    description: typeof mission.description === "string" ? mission.description : "Complete this event task.",
    type: mission.type === "nfc" || mission.type === "text" || mission.type === "photo" || mission.type === "manual" ? mission.type : "qr",
    proofType: mission.proofType === "nfc_tap" || mission.proofType === "organizer_approval" || mission.proofType === "photo_upload" || mission.proofType === "quiz_code" ? mission.proofType : "qr_scan",
    xpReward: Number(mission.xpReward ?? mission.xp ?? 50),
    proofLocation: typeof mission.proofLocation === "string" ? mission.proofLocation : undefined,
  };
}
