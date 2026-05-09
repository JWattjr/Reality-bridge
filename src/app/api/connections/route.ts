import { connectWithUser } from "@/lib/community-store";

export async function POST(request: Request) {
  const body = await request.json();
  const issues: string[] = [];

  if (typeof body.requesterUserId !== "string" || !body.requesterUserId) {
    issues.push("requesterUserId is required");
  }

  if (typeof body.targetUserTag !== "string" || !body.targetUserTag) {
    issues.push("targetUserTag is required");
  }

  if (issues.length > 0) {
    return Response.json({ status: "rejected", issues }, { status: 422 });
  }

  try {
    const connection = await connectWithUser({
      requesterUserId: body.requesterUserId,
      targetUserTag: body.targetUserTag,
      eventId: typeof body.eventId === "string" ? body.eventId : undefined,
    });

    return Response.json({ status: "connected", connection });
  } catch (error) {
    return Response.json(
      { status: "rejected", issues: [error instanceof Error ? error.message : "Connection failed"] },
      { status: 422 },
    );
  }
}
