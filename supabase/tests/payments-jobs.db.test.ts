import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { createTestDatabase, createUser } from "./db-helpers";

let pool: Pool;
let drop: () => Promise<void>;
let parent: string;

beforeAll(async () => {
  ({ pool, drop } = await createTestDatabase());
  parent = await createUser(pool, "parent@example.test");
});
afterAll(async () => {
  await drop?.();
});

async function newPendingOrder(total = 2400) {
  const book = (await pool.query(`insert into books (owner_id, page_count) values ($1, 12) returning id`, [parent])).rows[0].id as string;
  const order = (
    await pool.query(
      `insert into orders (owner_id, book_id, currency, subtotal_amount, total_amount) values ($1, $2, 'USD', $3, $3) returning id`,
      [parent, book, total],
    )
  ).rows[0].id as string;
  return { book, order };
}

describe("mark_order_paid", () => {
  it("is idempotent under duplicate webhooks", async () => {
    const { book, order } = await newPendingOrder();
    const first = (await pool.query(`select mark_order_paid($1, 'stripe', 'pi_dup', 2400, 'usd') r`, [order])).rows[0].r;
    const second = (await pool.query(`select mark_order_paid($1, 'stripe', 'pi_dup', 2400, 'USD') r`, [order])).rows[0].r;
    expect(first.already_paid).toBe(false);
    expect(second.already_paid).toBe(true);

    const counts = (
      await pool.query(
        `select
           (select count(*)::int from payments where order_id = $1) payments,
           (select count(*)::int from book_entitlements where book_id = $2 and revoked_at is null) entitlements,
           (select count(*)::int from generation_jobs where book_id = $2 and type = 'book_production') jobs,
           (select status::text from orders where id = $1) order_status,
           (select status::text from books where id = $2) book_status`,
        [order, book],
      )
    ).rows[0];
    expect(counts).toEqual({ payments: 1, entitlements: 1, jobs: 1, order_status: "paid", book_status: "producing" });
  });

  it("concurrent duplicate confirmations still produce exactly one payment and job", async () => {
    const { book, order } = await newPendingOrder();
    await Promise.all(
      Array.from({ length: 5 }, () => pool.query(`select mark_order_paid($1, 'paypal', 'cap_concurrent', 2400, 'USD')`, [order])),
    );
    const r = (
      await pool.query(
        `select (select count(*)::int from payments where order_id = $1) p,
                (select count(*)::int from generation_jobs where book_id = $2) j`,
        [order, book],
      )
    ).rows[0];
    expect(r).toEqual({ p: 1, j: 1 });
  });

  it("rejects an amount mismatch, keeps the order pending and records the failed payment", async () => {
    const { order } = await newPendingOrder();
    const r = (await pool.query(`select mark_order_paid($1, 'stripe', 'pi_short', 100, 'USD') r`, [order])).rows[0].r;
    expect(r.error).toBe("amount_or_currency_mismatch");
    const o = (await pool.query(`select status::text from orders where id = $1`, [order])).rows[0];
    const p = (await pool.query(`select status::text, failure_reason from payments where gateway_payment_id = 'pi_short'`)).rows[0];
    expect(o.status).toBe("pending");
    expect(p).toEqual({ status: "failed", failure_reason: "amount_or_currency_mismatch" });
  });

  it("only one live order may exist per book", async () => {
    const { book } = await newPendingOrder();
    await expect(
      pool.query(`insert into orders (owner_id, book_id, currency, subtotal_amount, total_amount) values ($1, $2, 'USD', 1, 1)`, [parent, book]),
    ).rejects.toThrow(/orders_one_live_per_book_idx/);
  });

  it("orders and payments can never be deleted", async () => {
    const { order } = await newPendingOrder();
    await expect(pool.query(`delete from orders where id = $1`, [order])).rejects.toThrow(/cannot be deleted/);
  });
});

describe("record_refund", () => {
  it("handles partial then full refunds and revokes the entitlement", async () => {
    const { book, order } = await newPendingOrder(2400);
    await pool.query(`select mark_order_paid($1, 'stripe', 'pi_refund', 2400, 'USD')`, [order]);

    const partial = (await pool.query(`select record_refund($1, 're_1', 400, 'USD', 'succeeded') r`, [order])).rows[0].r;
    expect(partial).toMatchObject({ status: "partially_refunded", refunded_amount: 400 });
    // duplicate webhook for the same refund changes nothing
    const dup = (await pool.query(`select record_refund($1, 're_1', 400, 'USD', 'succeeded') r`, [order])).rows[0].r;
    expect(dup).toMatchObject({ status: "partially_refunded", refunded_amount: 400 });

    const ent1 = (await pool.query(`select revoked_at from book_entitlements where book_id = $1`, [book])).rows[0];
    expect(ent1.revoked_at).toBeNull();

    const full = (await pool.query(`select record_refund($1, 're_2', 2000, 'USD', 'succeeded') r`, [order])).rows[0].r;
    expect(full).toMatchObject({ status: "refunded", refunded_amount: 2400 });
    const ent2 = (await pool.query(`select revoked_at, revoked_reason from book_entitlements where book_id = $1`, [book])).rows[0];
    expect(ent2.revoked_reason).toBe("refunded");
    expect(await pool.query(`select has_book_entitlement($1, $2) e`, [book, parent]).then((r) => r.rows[0].e)).toBe(false);
  });

  it("refuses refunds above the order total", async () => {
    const { order } = await newPendingOrder(1000);
    await pool.query(`select mark_order_paid($1, 'stripe', 'pi_over', 1000, 'USD')`, [order]);
    await expect(pool.query(`select record_refund($1, 're_over', 1500, 'USD', 'succeeded')`, [order])).rejects.toThrow(/exceed/);
  });
});

describe("generation job queue", () => {
  beforeEach(async () => {
    await pool.query(`delete from generation_jobs`);
  });

  async function enqueue(key: string | null, maxAttempts = 3) {
    return (
      await pool.query(`select (enqueue_generation_job('page_illustration', $1, '{}', null, null, null, $2, 0::smallint, $3)).id`, [
        parent,
        key,
        maxAttempts,
      ])
    ).rows[0].id as string;
  }

  it("enqueue is idempotent per key", async () => {
    const a = await enqueue("k1");
    const b = await enqueue("k1");
    expect(a).toBe(b);
  });

  it("concurrent workers never claim the same job", async () => {
    for (let i = 0; i < 10; i++) await enqueue(`c${i}`);
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, w) => pool.query(`select id from claim_generation_jobs($1, 3, 60, null)`, [`worker-${w}`])),
    );
    const ids = results.flatMap((r) => r.rows.map((x) => x.id));
    expect(ids.length).toBe(10);
    expect(new Set(ids).size).toBe(10);
  });

  it("retryable failures back off, then fail permanently after max attempts", async () => {
    const id = await enqueue("retry", 2);
    await pool.query(`select * from claim_generation_jobs('w1', 1, 60, null)`);
    const s1 = (await pool.query(`select fail_generation_job($1, 'w1', 'boom', true) s`, [id])).rows[0].s;
    expect(s1).toBe("queued");
    const runAfter = (await pool.query(`select run_after > now() future from generation_jobs where id = $1`, [id])).rows[0].future;
    expect(runAfter).toBe(true);

    await pool.query(`update generation_jobs set run_after = now() where id = $1`, [id]);
    await pool.query(`select * from claim_generation_jobs('w2', 1, 60, null)`);
    const s2 = (await pool.query(`select fail_generation_job($1, 'w2', 'boom again', true) s`, [id])).rows[0].s;
    expect(s2).toBe("failed");

    const attempts = (await pool.query(`select attempt_number, status::text from generation_attempts where job_id = $1 order by 1`, [id])).rows;
    expect(attempts).toEqual([
      { attempt_number: 1, status: "failed" },
      { attempt_number: 2, status: "failed" },
    ]);
  });

  it("a worker cannot complete a job leased to another worker", async () => {
    const id = await enqueue("lease");
    await pool.query(`select * from claim_generation_jobs('owner-worker', 1, 60, null)`);
    const ok = (await pool.query(`select complete_generation_job($1, 'intruder', null) ok`, [id])).rows[0].ok;
    expect(ok).toBe(false);
    const ok2 = (await pool.query(`select complete_generation_job($1, 'owner-worker', '{"x":1}') ok`, [id])).rows[0].ok;
    expect(ok2).toBe(true);
  });

  it("recovers jobs whose worker crashed (expired lease)", async () => {
    const id = await enqueue("crash");
    await pool.query(`select * from claim_generation_jobs('crashy', 1, 60, null)`);
    await pool.query(`update generation_jobs set locked_until = now() - interval '1 second' where id = $1`, [id]);
    const reclaimed = (await pool.query(`select id, attempts from claim_generation_jobs('healthy', 1, 60, null)`)).rows;
    expect(reclaimed).toEqual([{ id, attempts: 2 }]);
    const first = (await pool.query(`select status::text, error from generation_attempts where job_id = $1 and attempt_number = 1`, [id])).rows[0];
    expect(first).toEqual({ status: "failed", error: "lease expired" });
  });

  it("manual retry re-queues a failed job", async () => {
    const id = await enqueue("manual", 1);
    await pool.query(`select * from claim_generation_jobs('w', 1, 60, null)`);
    await pool.query(`select fail_generation_job($1, 'w', 'nope', true)`, [id]);
    expect((await pool.query(`select retry_generation_job($1) r`, [id])).rows[0].r).toBe(true);
    const j = (await pool.query(`select status::text, max_attempts from generation_jobs where id = $1`, [id])).rows[0];
    expect(j).toEqual({ status: "queued", max_attempts: 2 });
  });
});

describe("rate limiting", () => {
  it("allows up to the limit within a window", async () => {
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) results.push((await pool.query(`select hit_rate_limit('upload:u1', 3, 3600) ok`)).rows[0].ok);
    expect(results).toEqual([true, true, true, false]);
    expect((await pool.query(`select hit_rate_limit('upload:u2', 3, 3600) ok`)).rows[0].ok).toBe(true);
  });
});
