import type { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      /** GitHub user id (`sub`) for dashboard scope and API keys. */
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** GitHub OAuth access token (server-side use only; never sent to client). */
    githubAccessToken?: string;
  }
}
