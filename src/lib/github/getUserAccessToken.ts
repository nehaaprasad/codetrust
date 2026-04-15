import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

function authSecret(): string {
  return (
    process.env.AUTH_SECRET ?? "development-only-set-auth-secret-in-production"
  );
}

/** GitHub OAuth access token for the current session (API routes only). */
export async function getGitHubAccessTokenFromRequest(
  req: NextRequest,
): Promise<string | null> {
  const authSecretValue = authSecret();

  // Method 1: Try reading from request directly
  let token = await getToken({ req, secret: authSecretValue });
  let t = token?.githubAccessToken ?? token?.accessToken;
  if (typeof t === "string") {
    return t;
  }

  // Method 2: Get cookie header directly (more reliable in edge)
  try {
    const h = await headers();
    const cookieHeader = h.get("cookie") ?? "";
    if (cookieHeader) {
      // Also extract cookie value for getToken
      token = await getToken({
        req: new Request(req.url, { headers: { cookie: cookieHeader } }),
        secret: authSecretValue,
      });
      t = token?.githubAccessToken ?? token?.accessToken;
      if (typeof t === "string") {
        return t;
      }
    }
  } catch {
    // Continue to next method
  }

  // Method 3: Try server-side session auth()
  try {
    const session = await auth();
    const sessionData = session as Record<string, unknown> | null;
    const fromSession =
      (sessionData?.accessToken as string) ??
      (sessionData?.githubAccessToken as string);
    if (typeof fromSession === "string") {
      return fromSession;
    }
  } catch {
    // Continue
  }

  return null;
}
