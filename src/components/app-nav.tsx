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
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
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
                  ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900",
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
