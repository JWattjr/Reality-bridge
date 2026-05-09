import { getZeroGBalance } from "@/lib/zero-g";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = url.searchParams.get("address");

  if (!address) {
    return Response.json({ status: "error", issue: "address is required" }, { status: 400 });
  }

  try {
    const balance = await getZeroGBalance(address);
    return Response.json({ status: "ok", balance });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        issue: error instanceof Error ? error.message : "Could not read 0G balance",
      },
      { status: 400 },
    );
  }
}
