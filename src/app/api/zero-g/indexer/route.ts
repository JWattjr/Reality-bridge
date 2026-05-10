import { rewriteIndexerResponse } from "@/lib/zero-g-proxy";

export async function POST(request: Request) {
  let body: { method?: string; params?: unknown[] };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON-RPC body" }, { status: 400 });
  }

  return rewriteIndexerResponse(request, body);
}
