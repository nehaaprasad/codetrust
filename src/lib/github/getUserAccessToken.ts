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
    const fromSession = (session as Record<string, unknown> | null)?.githubAccessToken;
    if (typeof fromSession === "string") {
      return fromSession;
    }
    // Debug: log session details in production
    if (process.env.NODE_ENV === "production") {
      console.log("[getGitHubAccessToken] Session exists:", !!session);
    }
  } catch (e) {
    if (process.env.NODE_ENV === "production") {
      console.log("[getGitHubAccessToken] auth() error:", e);
    }
  }

  // Debug info for production diagnostics
  if (process.env.NODE_ENV === "production") {
    console.log("[getGitHubAccessToken] All methods exhausted, no token found");
  }

  return null;
}
