import { listEventRegistrations } from "@/lib/community-store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const code = decodeURIComponent(id).trim();
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return Response.json({ status: "rejected", issues: ["userId is required"] }, { status: 422 });
  }

  try {
    const entries = await listEventRegistrations(code, userId);
    return Response.json({ status: "ok", entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read entries";
    const status = message.includes("Not authorized") ? 403 : message.includes("not found") ? 404 : 500;
    return Response.json({ status: "rejected", issues: [message] }, { status });
  }
}
