import { upsertUserProfile } from "@/lib/community-store";

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return Response.json({ status: "rejected", issues: ["Invalid JSON body"] }, { status: 400 });
  }

  if (typeof body.userId !== "string" || !body.userId) {
    return Response.json({ status: "rejected", issues: ["userId is required"] }, { status: 422 });
  }

  try {
    const profile = await upsertUserProfile({
      userId: body.userId,
      walletAddress: typeof body.walletAddress === "string" ? body.walletAddress : undefined,
      displayName: typeof body.displayName === "string" ? body.displayName : undefined,
      handle: typeof body.handle === "string" ? body.handle : undefined,
      userTag: typeof body.userTag === "string" ? body.userTag : undefined,
      bio: typeof body.bio === "string" ? body.bio : undefined,
      avatar: typeof body.avatar === "string" ? body.avatar : undefined,
      mode: body.mode === "update" ? "update" : "ensure",
    });

    return Response.json({ status: "saved", profile });
  } catch (error) {
    return Response.json(
      { status: "rejected", issues: [error instanceof Error ? error.message : "Profile save failed"] },
      { status: 500 },
    );
  }
}
