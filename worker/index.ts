/**
 * Storyling background worker — a long-running Node process (Railway, Fly.io,
 * Render, a VM, ...). It leases jobs from Postgres, so any number of workers
 * can run safely; jobs from a crashed worker are recovered when their lease
 * expires.
 *
 *   pnpm worker            # uses .env.local / process env
 */
import { hostname } from "node:os";
import { processBatch } from "@/lib/jobs/runner";
import { enqueueJob } from "@/lib/jobs/enqueue";
import { getSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

const workerId = `${process.env.WORKER_ID ?? "worker"}-${hostname()}-${process.pid}`;
const IDLE_DELAY_MS = 2000;
let stopping = false;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Daily maintenance, scheduled idempotently (one job per day across all workers). */
async function scheduleMaintenance() {
  const day = new Date().toISOString().slice(0, 10);
  await enqueueJob({ type: "purge_expired_photos", ownerId: null, idempotencyKey: `maintenance:purge_photos:${day}` });
  await createAdminClient().rpc("prune_rate_limits");
}

/** One slot = one job at a time. N slots run concurrently. */
async function slot(n: number) {
  while (!stopping) {
    try {
      const { claimed } = await processBatch(`${workerId}#${n}`, 1);
      if (claimed === 0) await sleep(IDLE_DELAY_MS);
    } catch (e) {
      console.error(`[worker] slot ${n} error`, e);
      await sleep(5000);
    }
  }
}

async function main() {
  const s = await getSettings({ "limits.worker_concurrency": 3 });
  const slots = Math.max(1, Math.min(16, Number(s["limits.worker_concurrency"])));
  console.log(`[worker] ${workerId} started with ${slots} slot(s)`);

  const maintenance = setInterval(() => void scheduleMaintenance().catch((e) => console.error("[worker] maintenance", e)), 3600_000);
  void scheduleMaintenance().catch((e) => console.error("[worker] maintenance", e));

  // Slots finish their current job before exiting (graceful drain).
  await Promise.all(Array.from({ length: slots }, (_, i) => slot(i)));
  clearInterval(maintenance);
  console.log("[worker] stopped");
}

for (const sig of ["SIGTERM", "SIGINT"] as const) {
  process.on(sig, () => {
    console.log(`[worker] ${sig} received, draining`);
    stopping = true;
  });
}

void main();
