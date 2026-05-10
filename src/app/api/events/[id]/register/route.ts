import { registerForEvent } from "@/lib/community-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  if (typeof body.userId !== "string" || !body.userId) {
    return Response.json({ status: "rejected", issues: ["userId is required"] }, { status: 422 });
  }

  try {
    const registration = await registerForEvent(id, body.userId);

    return Response.json({ status: "registered", registration });
  } catch (error) {
    return Response.json(
      {
        status: "rejected",
        issues: [error instanceof Error ? error.message : "Registration failed"],
      },
      { status: 500 },
    );
  }
}
