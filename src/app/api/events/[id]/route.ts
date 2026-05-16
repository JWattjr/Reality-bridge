import { deleteCommunityEvent, listCommunityEvents, normalizeCommunityMission, updateCommunityEvent } from "@/lib/community-store";
import type { EventVisibility } from "@/lib/community-store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const code = decodeURIComponent(id).trim();

  if (!code) {
    return Response.json({ status: "rejected", issues: ["event code is required"] }, { status: 400 });
  }

  const events = await listCommunityEvents();
  const event = events.find((item) => item.id === code || item.slug === code);

  if (!event) {
    return Response.json({ status: "not_found", issues: ["No event matches that code."] }, { status: 404 });
  }

  return Response.json({ status: "ok", event });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const code = decodeURIComponent(id).trim();
  const body = await request.json().catch(() => ({}));

  if (typeof body.userId !== "string" || !body.userId) {
    return Response.json({ status: "rejected", issues: ["userId is required"] }, { status: 422 });
  }

  const visibility: EventVisibility | undefined =
    body.visibility === "private" ? "private" : body.visibility === "public" ? "public" : undefined;

  const maxAttendees =
    typeof body.maxAttendees === "number"
      ? body.maxAttendees
      : typeof body.maxAttendees === "string" && body.maxAttendees
        ? Number(body.maxAttendees)
        : undefined;

  const updates = {
    title: typeof body.title === "string" ? body.title : undefined,
    description: typeof body.description === "string" ? body.description : undefined,
    location: typeof body.location === "string" ? body.location : undefined,
    startDate: typeof body.startDate === "string" ? body.startDate : undefined,
    endDate: typeof body.endDate === "string" ? body.endDate : undefined,
    category: typeof body.category === "string" ? body.category : undefined,
    maxAttendees: Number.isFinite(maxAttendees) ? maxAttendees : undefined,
    visibility,
    missions: Array.isArray(body.missions) ? body.missions.map(normalizeCommunityMission) : undefined,
  };

  try {
    const event = await updateCommunityEvent(code, body.userId, updates);
    return Response.json({ status: "updated", event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    const status = message.includes("Not authorized") ? 403 : message.includes("not found") ? 404 : 500;
    return Response.json({ status: "rejected", issues: [message] }, { status });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const code = decodeURIComponent(id).trim();
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return Response.json({ status: "rejected", issues: ["userId is required"] }, { status: 422 });
  }

  try {
    const result = await deleteCommunityEvent(code, userId);
    return Response.json({ status: "deleted", id: result.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    const status = message.includes("Not authorized") ? 403 : message.includes("not found") ? 404 : 500;
    return Response.json({ status: "rejected", issues: [message] }, { status });
  }
}
