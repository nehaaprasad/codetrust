"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { LandingView } from "@/components/landing/landing-view";

/**
 * Public landing page. Signed-in users are sent to the app at /analyze.
 */
export default function LandingPage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/analyze");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="landing-root relative flex flex-1 flex-col items-center justify-center bg-[#f3e9de] py-24 text-stone-500">
        <div className="landing-bg pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="font-mono text-sm tracking-wide">Loading…</div>
      </div>
    );
  }

  if (status === "authenticated") {
    return (
      <div className="landing-root relative flex flex-1 flex-col items-center justify-center bg-[#f3e9de] py-24 text-stone-500">
        <div className="landing-bg pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="font-mono text-sm tracking-wide">Opening the app…</div>
      </div>
    );
  }

  return <LandingView />;
}
