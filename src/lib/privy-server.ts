import { PrivyClient } from "@privy-io/node";

let _privyClient: PrivyClient | null = null;

type AuthenticatedWalletRequest = {
  userId: string | null;
  privyUserId: string | null;
  error: string | null;
  status: number;
};

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
 */
export async function verifyPrivyToken(request: Request): Promise<{
  privyUserId: string | null;
  error: string | null;
}> {
  const privy = getPrivyClient();

  if (!privy) {
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
 * Extract the authenticated wallet address from a request query string.
 */
export async function authenticateRequest(request: Request): Promise<AuthenticatedWalletRequest> {
  const url = new URL(request.url);
  return authenticateWalletRequest(request, url.searchParams.get("userId"));
}

/**
 * Verify that the signed-in Privy user owns the wallet address used for proof reads/writes.
 */
export async function authenticateWalletRequest(
  request: Request,
  requestedUserId: string | null | undefined,
): Promise<AuthenticatedWalletRequest> {
  const requestedWallet = requestedUserId?.trim() || null;

  if (hasPrivyServerConfig()) {
    const { privyUserId, error } = await verifyPrivyToken(request);

    if (error) {
      return { userId: null, privyUserId: null, error, status: 401 };
    }

    if (!privyUserId) {
      return {
        userId: null,
        privyUserId: null,
        error: "Privy server auth is configured but token verification returned no user.",
        status: 401,
      };
    }

    const walletAddresses = await getPrivyUserWalletAddresses(privyUserId);

    if (requestedWallet) {
      const ownsRequestedWallet = walletAddresses.some(
        (address) => address.toLowerCase() === requestedWallet.toLowerCase(),
      );

      if (!ownsRequestedWallet) {
        return {
          userId: null,
          privyUserId,
          error: "This signed-in Privy account does not own the requested wallet.",
          status: 403,
        };
      }

      return { userId: requestedWallet, privyUserId, error: null, status: 200 };
    }

    if (walletAddresses[0]) {
      return { userId: walletAddresses[0], privyUserId, error: null, status: 200 };
    }

    return {
      userId: null,
      privyUserId,
      error: "No Privy wallet found for this signed-in account.",
      status: 401,
    };
  }

  // Privy server auth is not configured - accept the query-param userId for local development.
  if (!requestedWallet) {
    return {
      userId: null,
      privyUserId: null,
      error: "Sign in required. Proof reads must be scoped to a signed-in wallet.",
      status: 401,
    };
  }

  return { userId: requestedWallet, privyUserId: null, error: null, status: 200 };
}

async function getPrivyUserWalletAddresses(privyUserId: string): Promise<string[]> {
  const privy = getPrivyClient();
  if (!privy) return [];

  try {
    const user = await privy.users()._get(privyUserId);
    return user.linked_accounts
      .map((account) => {
        if (
          (account.type === "wallet" || account.type === "smart_wallet") &&
          "address" in account &&
          typeof account.address === "string"
        ) {
          return account.address;
        }

        return null;
      })
      .filter((address): address is string => Boolean(address));
  } catch {
    return [];
  }
}
