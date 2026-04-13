"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Analyze" },
  { href: "/connect", label: "Connect" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/90 bg-white/80 px-6 py-3 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/70 dark:backdrop-blur-md">
      <nav className="flex flex-wrap items-center gap-1">
        {links.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sky-100 text-sky-950 shadow-sm dark:bg-sky-500/15 dark:text-sky-100 dark:shadow-[inset_0_0_0_1px_rgba(56,189,248,0.35)]"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/60",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 text-sm">
        {status === "loading" ? (
          <span className="text-zinc-500">…</span>
        ) : session?.user ? (
          <>
            <span className="max-w-[200px] truncate text-zinc-600 dark:text-zinc-400">
              {session.user.name ?? session.user.email}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={() => signOut()}>
              Sign out
            </Button>
          </>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => signIn("github")}>
            Sign in with GitHub
          </Button>
        )}
      </div>
    </div>
  );
}
