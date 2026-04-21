"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Subscription = {
  fullName: string;
  owner: string;
  repo: string;
  enabled: boolean;
  createdAt: string;
};

type SubscriptionsPayload = { items: Subscription[] };

/**
 * Single shared query: the set of repos the signed-in user has
 * enabled for auto-analyze. Each toggle reads from this shared cache
 * so the UI stays consistent across repos without per-row fetches.
 */
export function useAutoAnalyzeSubscriptions(enabled: boolean) {
  return useQuery<SubscriptionsPayload>({
    queryKey: ["github-subscriptions"],
    queryFn: async () => {
      const res = await fetch("/api/github/subscriptions", {
        credentials: "include",
      });
      const data = (await res.json()) as SubscriptionsPayload & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load subscriptions.");
      return data;
    },
    enabled,
    staleTime: 30_000,
  });
}

export type AutoAnalyzeToggleProps = {
  owner: string;
  repo: string;
  /** Whether this row is currently subscribed. */
  subscribed: boolean;
};

/**
 * Auto-analyze toggle for a single repository row.
 *
 * Click → POST/DELETE /api/github/subscriptions → refetch the shared
 * subscriptions list. Errors are surfaced inline under the button so
 * the user sees *why* a toggle didn't take (missing admin rights,
 * missing env var, etc.).
 */
export function AutoAnalyzeToggle({
  owner,
  repo,
  subscribed,
}: AutoAnalyzeToggleProps) {
  const qc = useQueryClient();
  const fullName = `${owner}/${repo}`;

  const mutation = useMutation<{ fullName: string; enabled: boolean }, Error, boolean>({
    mutationFn: async (desiredOn: boolean) => {
      if (desiredOn) {
        const res = await fetch("/api/github/subscriptions", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ owner, repo }),
        });
        const data = (await res.json()) as {
          fullName?: string;
          enabled?: boolean;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Could not enable auto-analyze.");
        return { fullName: data.fullName ?? fullName, enabled: true };
      }
      const url = new URL(
        "/api/github/subscriptions",
        typeof window === "undefined" ? "http://localhost" : window.location.origin,
      );
      url.searchParams.set("fullName", fullName);
      const res = await fetch(url.toString(), {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not disable auto-analyze.");
      return { fullName, enabled: false };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["github-subscriptions"] });
    },
  });

  const isOn = subscribed;
  const busy = mutation.isPending;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        aria-pressed={isOn}
        aria-label={
          isOn
            ? `Disable auto-analyze for ${fullName}`
            : `Enable auto-analyze for ${fullName}`
        }
        onClick={(e) => {
          e.stopPropagation();
          mutation.mutate(!isOn);
        }}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
          busy
            ? "cursor-progress border-zinc-300 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
            : isOn
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300 dark:hover:bg-emerald-400/20"
              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
      >
        <span
          className={`inline-block size-1.5 rounded-full ${
            busy
              ? "bg-zinc-400"
              : isOn
                ? "bg-emerald-500 dark:bg-emerald-400"
                : "bg-zinc-400 dark:bg-zinc-500"
          }`}
          aria-hidden="true"
        />
        {busy ? "Working…" : isOn ? "Auto-analyze on" : "Auto-analyze off"}
      </button>
      {mutation.isError ? (
        <p
          role="alert"
          className="max-w-[16rem] text-right text-[10.5px] leading-tight text-red-600 dark:text-red-400"
        >
          {mutation.error.message}
        </p>
      ) : null}
    </div>
  );
}
