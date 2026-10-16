import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { processBatch } from "@/lib/jobs/runner";
import { webSafeHandlers } from "@/lib/jobs/handlers/web-safe";

/**
 * Vercel Cron fallback for small deployments without a dedicated worker.
 * Runs a bounded batch of short jobs; long jobs (PDF rendering needs
 * Chromium) are left to the worker.
 */
export const maxDuration = 300;

// Only text/email/orchestration jobs: image generation can exceed function time limits.
const { story_generate, story_rewrite_page, send_email, purge_expired_photos, book_production } = webSafeHandlers;
const SHORT_JOBS = { story_generate, story_rewrite_page, send_email, purge_expired_photos, book_production };

export async function GET(request: NextRequest) {
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  const got = request.headers.get("authorization") ?? "";
  if (!process.env.CRON_SECRET || got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await processBatch(`vercel-cron-${Date.now()}`, 3, SHORT_JOBS);
  return NextResponse.json(result);
}
