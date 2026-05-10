import { readLeaderboard } from "@/lib/leaderboard";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId") ?? undefined;
  const entries = await readLeaderboard(eventId);

  return Response.json({
    eventId,
    entries,
  });
}
