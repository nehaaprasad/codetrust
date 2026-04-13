import "next-auth";
import "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT {
    /** GitHub OAuth access token (server-side use only; never sent to client). */
    githubAccessToken?: string;
  }
}
