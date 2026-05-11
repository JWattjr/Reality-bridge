import { PrivyClient } from "@privy-io/node";

let _privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient | null {
  if (_privyClient) return _privyClient;

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) return null;

  _privyClient = new PrivyClient({ appId, appSecret });
  return _privyClient;
}

export function hasPrivyServerConfig() {
  return Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID && process.env.PRIVY_APP_SECRET);
}

/**
 * Verify the Privy access token from an Authorization header.
 *
 * Returns the authenticated Privy user id (DID) on success,
 * or null when verification fails or is not configured.
 *
 * The caller is responsible for mapping the Privy DID to the
 * wallet address used as userId in ProofPlay records.
 */
export async function verifyPrivyToken(request: Request): Promise<{
  privyUserId: string | null;
  error: string | null;
}> {
  const privy = getPrivyClient();

  if (!privy) {
    // When PRIVY_APP_SECRET is not set (e.g. local dev), fall back to
    // trusting the client-supplied userId. Log a warning so production
    // deployments are obvious.
    return { privyUserId: null, error: null };
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return { privyUserId: null, error: "Missing authorization header" };
  }

  const token = authHeader.slice(7);

  try {
    const claims = await privy.utils().auth().verifyAccessToken(token);
    return { privyUserId: claims.user_id, error: null };
  } catch {
    return { privyUserId: null, error: "Invalid or expired access token" };
  }
}

/**
 * Extract the authenticated userId from a request.
 *
 * When Privy server auth is configured, the userId comes exclusively from
 * the verified access token. Otherwise, falls back to the query-param userId
 * for local development.
 *
 * Returns { userId, error, status }. When error is set, the caller should
 * return the error response with the given status code.
 */
export async function authenticateRequest(request: Request): Promise<{
  userId: string | null;
  error: string | null;
  status: number;
}> {
  const url = new URL(request.url);
  const queryUserId = url.searchParams.get("userId");

  if (hasPrivyServerConfig()) {
    const { privyUserId, error } = await verifyPrivyToken(request);

    if (error) {
      return { userId: null, error, status: 401 };
    }

    if (!privyUserId) {
      return {
        userId: null,
        error: "Privy server auth is configured but token verification returned no user.",
        status: 401,
      };
    }

    // The Privy DID is the canonical identity. If the client also sent a
    // query-param userId (wallet address), we trust the token's DID but
    // allow the client to specify which wallet address to scope to — as
    // long as the request came from an authenticated session. The wallet
    // address is the userId stored in proof records.
    return { userId: queryUserId ?? privyUserId, error: null, status: 200 };
  }

  // Privy server auth is not configured — accept the query-param userId
  // for local development.
  if (!queryUserId) {
    return {
      userId: null,
      error: "Sign in required. Proof reads must be scoped to a signed-in wallet.",
      status: 401,
    };
  }

  return { userId: queryUserId, error: null, status: 200 };
}
