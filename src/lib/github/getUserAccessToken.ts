import { getToken } from "next-auth/jwt";
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
  const token = await getToken({ req, secret: authSecret() });
  const t = token?.githubAccessToken;
  return typeof t === "string" ? t : null;
}
