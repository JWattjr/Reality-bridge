import { forwardZeroGJsonRpc, getAllowedStorageNodeUrls } from "@/lib/zero-g-proxy";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return Response.json({ error: "Missing storage node URL" }, { status: 400 });
  }

  const allowedUrls = await getAllowedStorageNodeUrls();

  if (!allowedUrls.has(targetUrl)) {
    return Response.json({ error: "Storage node URL is not allowlisted by the 0G indexer" }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON-RPC body" }, { status: 400 });
  }

  return forwardZeroGJsonRpc(targetUrl, body);
}
