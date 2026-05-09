import { upsertUserProfile } from "@/lib/community-store";

export async function POST(request: Request) {
  const body = await request.json();

  if (typeof body.userId !== "string" || !body.userId) {
    return Response.json({ status: "rejected", issues: ["userId is required"] }, { status: 422 });
  }

  const profile = await upsertUserProfile({
    userId: body.userId,
    walletAddress: typeof body.walletAddress === "string" ? body.walletAddress : undefined,
    displayName: typeof body.displayName === "string" ? body.displayName : undefined,
  });

  return Response.json({ status: "saved", profile });
}
