import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";

function authSecret(): string {
  return (
    process.env.AUTH_SECRET ?? "development-only-set-auth-secret-in-production"
  );
}

/** GitHub OAuth access token for the current session (API routes only). */
export async function getGitHubAccessTokenFromRequest(
  req: NextRequest,
): Promise<string | null> {
  let token = await getToken({ req, secret: authSecret() });
  let t = token?.githubAccessToken ?? token?.accessToken;
  if (typeof t === "string") return t;

  /** App Router: cookie on `headers()` can be more reliable than `req` alone. */
  try {
    const h = await headers();
    const cookie = h.get("cookie");
    if (!cookie) return null;
    token = await getToken({
      req: new Request(req.url, { headers: { cookie } }),
      secret: authSecret(),
    });
    t = token?.githubAccessToken ?? token?.accessToken;
    return typeof t === "string" ? t : null;
  } catch {
    return null;
  }
}
