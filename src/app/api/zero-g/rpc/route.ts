import { forwardZeroGJsonRpc, getZeroGProxyTargets } from "@/lib/zero-g-proxy";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON-RPC body" }, { status: 400 });
  }

  return forwardZeroGJsonRpc(getZeroGProxyTargets().rpcUrl, body);
}
