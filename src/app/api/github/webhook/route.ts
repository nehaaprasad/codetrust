import { NextResponse } from "next/server";

/** GitHub webhook receiver — extend with signature verification and job enqueue later. */
export async function POST(req: Request) {
  let action = "unknown";
  try {
    const payload = await req.json();
    action = typeof payload?.action === "string" ? payload.action : "unknown";
  } catch {
    // Non-JSON body — acknowledge to avoid retries during setup.
  }

  return NextResponse.json({ ok: true, received: action });
}
