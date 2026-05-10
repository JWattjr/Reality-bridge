import { ZERO_G_MAINNET } from "@/lib/zero-g";

type JsonRpcBody = {
  method?: string;
  params?: unknown[];
};

type ShardedNode = {
  url?: string;
  [key: string]: unknown;
};

type ShardedNodesResult = {
  trusted?: ShardedNode[];
  discovered?: ShardedNode[];
  [key: string]: unknown;
};

export function getZeroGProxyTargets() {
  return {
    rpcUrl: process.env.ZERO_G_RPC_URL ?? ZERO_G_MAINNET.rpcUrl,
    indexerUrl: process.env.ZERO_G_INDEXER_URL ?? ZERO_G_MAINNET.indexerUrl,
  };
}

export async function forwardZeroGJsonRpc(targetUrl: string, body: unknown) {
  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await response.text();

  return new Response(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export async function getAllowedStorageNodeUrls() {
  const { indexerUrl } = getZeroGProxyTargets();
  const response = await fetch(indexerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "proofplay-node-allowlist",
      method: "indexer_getShardedNodes",
    }),
    cache: "no-store",
  });
  const payload = await response.json();
  const nodes = payload.result as ShardedNodesResult | undefined;
  const urls = [
    ...(nodes?.trusted ?? []),
    ...(nodes?.discovered ?? []),
  ]
    .map((node) => node.url)
    .filter((url): url is string => Boolean(url));

  return new Set(urls);
}

export async function rewriteIndexerResponse(request: Request, body: JsonRpcBody) {
  const { indexerUrl } = getZeroGProxyTargets();
  const response = await fetch(indexerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json();

  if (body.method === "indexer_getShardedNodes" && payload.result) {
    payload.result = rewriteShardedNodes(request, payload.result as ShardedNodesResult);
  }

  return Response.json(payload, {
    status: response.status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function rewriteShardedNodes(request: Request, result: ShardedNodesResult) {
  return {
    ...result,
    trusted: rewriteNodes(request, result.trusted),
    discovered: rewriteNodes(request, result.discovered),
  };
}

function rewriteNodes(request: Request, nodes?: ShardedNode[]) {
  return nodes?.map((node) => ({
    ...node,
    url: node.url ? proxiedNodeUrl(request, node.url) : node.url,
  }));
}

function proxiedNodeUrl(request: Request, nodeUrl: string) {
  const origin = new URL(request.url).origin;
  return `${origin}/api/zero-g/node?url=${encodeURIComponent(nodeUrl)}`;
}
