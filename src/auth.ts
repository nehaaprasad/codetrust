import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

const githubClientId = process.env.AUTH_GITHUB_ID?.trim() ?? "";
const githubClientSecret = process.env.AUTH_GITHUB_SECRET?.trim() ?? "";

if (process.env.NODE_ENV === "development" && (!githubClientId || !githubClientSecret)) {
  console.warn(
    "[auth] AUTH_GITHUB_ID and AUTH_GITHUB_SECRET must be set in .env for Sign in with GitHub. " +
      "Create an OAuth App at https://github.com/settings/developers — empty client id causes GitHub 404.",
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    GitHub({
      clientId: githubClientId,
      clientSecret: githubClientSecret,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  secret:
    process.env.AUTH_SECRET ??
    "development-only-set-auth-secret-in-production",
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token && typeof account.access_token === "string") {
        token.githubAccessToken = account.access_token;
        // Some tooling expects a generic name; keep both.
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
