import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID ?? "",
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? "",
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
      }
      return token;
    },
  },
});
