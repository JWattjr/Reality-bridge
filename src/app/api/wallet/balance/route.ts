import { getXLayerOKBBalance } from "@/lib/xlayer";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = url.searchParams.get("address");

  if (!address) {
    return Response.json({ status: "error", issue: "address is required" }, { status: 400 });
  }

  try {
    const balance = await getXLayerOKBBalance(address);
    return Response.json({ status: "ok", balance });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        issue: error instanceof Error ? error.message : "Could not read X Layer balance",
      },
      { status: 400 },
    );
  }
}
