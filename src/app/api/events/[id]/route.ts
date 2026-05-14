import { listCommunityEvents } from "@/lib/community-store";

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
