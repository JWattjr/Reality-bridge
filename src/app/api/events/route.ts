import { createCommunityEvent, listCommunityEvents, normalizeCommunityMission } from "@/lib/community-store";

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

  try {
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
      missions: Array.isArray(body.missions) ? body.missions.map(normalizeCommunityMission) : undefined,
      visibility: body.visibility === "private" ? "private" : "public",
    });

    return Response.json({ status: "created", event }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        status: "rejected",
        issues: [error instanceof Error ? error.message : "Could not publish event"],
      },
      { status: 500 },
    );
  }
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

