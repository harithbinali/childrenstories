import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { as, createTestDatabase, createUser } from "./db-helpers";

let pool: Pool;
let drop: () => Promise<void>;
let alice: string, bob: string, staff: string, admin: string;
let aliceChild: string, aliceBook: string, aliceOrder: string;

beforeAll(async () => {
  ({ pool, drop } = await createTestDatabase());
  alice = await createUser(pool, "alice@example.test");
  bob = await createUser(pool, "bob@example.test");
  staff = await createUser(pool, "staff@example.test", ["staff"]);
  admin = await createUser(pool, "admin@example.test", ["admin"]);

  aliceChild = (await pool.query(`insert into child_profiles (owner_id, display_name, age_years) values ($1, 'Lina', 5) returning id`, [alice])).rows[0].id;
  await pool.query(
    `insert into child_photos (child_id, owner_id, storage_path, mime_type, size_bytes, sha256, guardian_attested_at)
     values ($1, $2, $3, 'image/jpeg', 1000, 'abc', now())`,
    [aliceChild, alice, `${alice}/${aliceChild}/p1.jpg`],
  );
  aliceBook = (await pool.query(`insert into books (owner_id, child_id, page_count) values ($1, $2, 8) returning id`, [alice, aliceChild])).rows[0].id;
  aliceOrder = (
    await pool.query(
      `insert into orders (owner_id, book_id, currency, subtotal_amount, total_amount) values ($1, $2, 'USD', 1900, 1900) returning id`,
      [alice, aliceBook],
    )
  ).rows[0].id;
  await pool.query(`insert into storage.objects (bucket_id, name) values ('child-photos', $1)`, [`${alice}/${aliceChild}/p1.jpg`]);
});

afterAll(async () => {
  await drop?.();
});

describe("identity & privilege escalation", () => {
  it("creates a profile and parent role for every new auth user", async () => {
    const { rows } = await pool.query(`select p.status, r.role from profiles p join user_roles r on r.user_id = p.id where p.id = $1`, [alice]);
    expect(rows).toEqual([{ status: "active", role: "parent" }]);
  });

  it("a parent cannot grant themselves admin", async () => {
    await expect(
      as(pool, { role: "authenticated", sub: alice }, (c) => c.query(`insert into user_roles (user_id, role) values ($1, 'admin')`, [alice])),
    ).rejects.toThrow(/permission denied|row-level security/);
  });

  it("a parent cannot change their own account status", async () => {
    await expect(
      as(pool, { role: "authenticated", sub: alice }, (c) => c.query(`update profiles set status = 'active', suspended_reason = 'x' where id = $1`, [alice])),
    ).rejects.toThrow(/permission denied/);
  });

  it("a parent can update their display name", async () => {
    const n = await as(pool, { role: "authenticated", sub: alice }, async (c) => (await c.query(`update profiles set display_name = 'Mum' where id = $1`, [alice])).rowCount);
    expect(n).toBe(1);
  });

  it("is_admin / is_staff reflect roles", async () => {
    const r = await as(pool, { role: "authenticated", sub: admin }, async (c) => (await c.query(`select is_admin() a, is_staff() s`)).rows[0]);
    expect(r).toEqual({ a: true, s: true });
    const s = await as(pool, { role: "authenticated", sub: staff }, async (c) => (await c.query(`select is_admin() a, is_staff() s`)).rows[0]);
    expect(s).toEqual({ a: false, s: true });
  });
});

describe("cross-account isolation", () => {
  const tables = ["child_profiles", "child_photos", "books", "orders"];
  for (const t of tables) {
    it(`bob cannot see alice's ${t}`, async () => {
      const n = await as(pool, { role: "authenticated", sub: bob }, async (c) => (await c.query(`select count(*)::int n from ${t}`)).rows[0].n);
      expect(n).toBe(0);
    });
    it(`alice sees her own ${t}`, async () => {
      const n = await as(pool, { role: "authenticated", sub: alice }, async (c) => (await c.query(`select count(*)::int n from ${t}`)).rows[0].n);
      expect(n).toBe(1);
    });
  }

  it("bob cannot update or delete alice's child", async () => {
    const r = await as(pool, { role: "authenticated", sub: bob }, async (c) => {
      const u = await c.query(`update child_profiles set display_name = 'x' where id = $1`, [aliceChild]);
      const d = await c.query(`delete from child_profiles where id = $1`, [aliceChild]);
      return [u.rowCount, d.rowCount];
    });
    expect(r).toEqual([0, 0]);
  });

  it("bob cannot create a child owned by alice", async () => {
    await expect(
      as(pool, { role: "authenticated", sub: bob }, (c) => c.query(`insert into child_profiles (owner_id, display_name) values ($1, 'x')`, [alice])),
    ).rejects.toThrow(/row-level security/);
  });

  it("bob cannot record reading progress on alice's book", async () => {
    await expect(
      as(pool, { role: "authenticated", sub: bob }, (c) => c.query(`insert into reading_progress (user_id, book_id, last_page) values ($1, $2, 3)`, [bob, aliceBook])),
    ).rejects.toThrow(/row-level security/);
  });

  it("bob cannot read alice's storage objects", async () => {
    const n = await as(pool, { role: "authenticated", sub: bob }, async (c) => (await c.query(`select count(*)::int n from storage.objects`)).rows[0].n);
    expect(n).toBe(0);
    const m = await as(pool, { role: "authenticated", sub: alice }, async (c) => (await c.query(`select count(*)::int n from storage.objects`)).rows[0].n);
    expect(m).toBe(1);
  });

  it("anonymous visitors see no private data", async () => {
    for (const t of ["child_profiles", "books", "orders", "profiles"]) {
      await expect(as(pool, { role: "anon" }, (c) => c.query(`select * from ${t}`))).rejects.toThrow(/permission denied/);
    }
  });
});

describe("book write protection", () => {
  it("a parent can toggle favorite", async () => {
    const n = await as(pool, { role: "authenticated", sub: alice }, async (c) => (await c.query(`update books set is_favorite = true where id = $1`, [aliceBook])).rowCount);
    expect(n).toBe(1);
  });

  it("a parent cannot mark their own book completed", async () => {
    await expect(
      as(pool, { role: "authenticated", sub: alice }, (c) => c.query(`update books set status = 'completed' where id = $1`, [aliceBook])),
    ).rejects.toThrow(/permission denied/);
  });

  it("a parent cannot grant themselves an entitlement", async () => {
    await expect(
      as(pool, { role: "authenticated", sub: alice }, (c) => c.query(`insert into book_entitlements (book_id, user_id) values ($1, $2)`, [aliceBook, alice])),
    ).rejects.toThrow(/permission denied/);
  });

  it("a parent cannot call server-only functions", async () => {
    await expect(
      as(pool, { role: "authenticated", sub: alice }, (c) => c.query(`select mark_order_paid($1, 'stripe', 'pi_x', 1900, 'USD')`, [aliceOrder])),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as(pool, { role: "authenticated", sub: alice }, (c) => c.query(`select * from claim_generation_jobs('w', 1, 60, null)`)),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("staff access boundaries", () => {
  it("staff can read books and orders for operations", async () => {
    const r = await as(pool, { role: "authenticated", sub: staff }, async (c) => [
      (await c.query(`select count(*)::int n from books`)).rows[0].n,
      (await c.query(`select count(*)::int n from orders`)).rows[0].n,
    ]);
    expect(r[0]).toBeGreaterThanOrEqual(1);
    expect(r[1]).toBeGreaterThanOrEqual(1);
  });

  it("staff and admins can NOT see child photos or their files", async () => {
    for (const who of [staff, admin]) {
      const r = await as(pool, { role: "authenticated", sub: who }, async (c) => [
        (await c.query(`select count(*)::int n from child_photos`)).rows[0].n,
        (await c.query(`select count(*)::int n from storage.objects where bucket_id = 'child-photos'`)).rows[0].n,
      ]);
      expect(r).toEqual([0, 0]);
    }
  });

  it("staff cannot read audit logs; admins can", async () => {
    await pool.query(`insert into admin_audit_logs (actor_id, action) values ($1, 'test')`, [admin]);
    const s = await as(pool, { role: "authenticated", sub: staff }, async (c) => (await c.query(`select count(*)::int n from admin_audit_logs`)).rows[0].n);
    const a = await as(pool, { role: "authenticated", sub: admin }, async (c) => (await c.query(`select count(*)::int n from admin_audit_logs`)).rows[0].n);
    expect(s).toBe(0);
    expect(a).toBeGreaterThanOrEqual(1);
  });

  it("audit logs are immutable even for the database owner", async () => {
    await expect(pool.query(`update admin_audit_logs set action = 'tampered'`)).rejects.toThrow(/immutable/);
    await expect(pool.query(`delete from admin_audit_logs`)).rejects.toThrow(/cannot be deleted/);
  });
});

describe("catalog visibility", () => {
  it("anonymous visitors see only active products/themes/styles", async () => {
    await pool.query(`update story_themes set is_active = false where slug = 'learning'`);
    const r = await as(pool, { role: "anon" }, async (c) => ({
      themes: (await c.query(`select count(*)::int n from story_themes`)).rows[0].n,
      styles: (await c.query(`select count(*)::int n from illustration_styles`)).rows[0].n,
      products: (await c.query(`select count(*)::int n from book_products`)).rows[0].n,
      secretSettings: (await c.query(`select count(*)::int n from platform_settings where not is_public`)).rows[0].n,
    }));
    expect(r).toEqual({ themes: 13, styles: 4, products: 3, secretSettings: 0 });
    await pool.query(`update story_themes set is_active = true where slug = 'learning'`);
  });
});

describe("support", () => {
  it("a parent cannot impersonate staff in a ticket thread", async () => {
    const ticket = await as(
      pool,
      { role: "authenticated", sub: alice },
      async (c) => (await c.query(`insert into support_tickets (owner_id, subject) values ($1, 'Help please') returning id`, [alice])).rows[0].id,
      true,
    );
    await expect(
      as(pool, { role: "authenticated", sub: alice }, (c) =>
        c.query(`insert into support_messages (ticket_id, author_id, is_staff, body) values ($1, $2, true, 'fake staff')`, [ticket, alice]),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(pool, { role: "authenticated", sub: bob }, (c) =>
        c.query(`insert into support_messages (ticket_id, author_id, body) values ($1, $2, 'hi')`, [ticket, bob]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("a parent cannot open a ticket pre-prioritised, pre-assigned or for someone else", async () => {
    for (const sql of [
      `insert into support_tickets (owner_id, subject, priority) values ($1, 'Urgent!', 'urgent')`,
      `insert into support_tickets (owner_id, subject, status) values ($1, 'Done', 'resolved')`,
      `insert into support_tickets (owner_id, subject, assigned_to) values ($1, 'Mine', $1)`,
    ]) {
      await expect(as(pool, { role: "authenticated", sub: alice }, (c) => c.query(sql, [alice]))).rejects.toThrow(/row-level security/);
    }
    await expect(
      as(pool, { role: "authenticated", sub: bob }, (c) => c.query(`insert into support_tickets (owner_id, subject) values ($1, 'As alice')`, [alice])),
    ).rejects.toThrow(/row-level security/);
  });

  it("a parent cannot change a ticket's status directly, and cannot reply to a closed ticket", async () => {
    const ticket = (await pool.query(`insert into support_tickets (owner_id, subject, status) values ($1, 'Old one', 'closed') returning id`, [alice])).rows[0].id;
    const updated = await as(pool, { role: "authenticated", sub: alice }, async (c) => {
      try { return (await c.query(`update support_tickets set status = 'open' where id = $1`, [ticket])).rowCount; } catch { return 0; }
    });
    expect(updated).toBe(0);
    await expect(
      as(pool, { role: "authenticated", sub: alice }, (c) => c.query(`insert into support_messages (ticket_id, author_id, body) values ($1, $2, 'hello?')`, [ticket, alice])),
    ).rejects.toThrow(/row-level security/);
  });

  it("bob cannot read alice's tickets", async () => {
    const n = await as(pool, { role: "authenticated", sub: bob }, async (c) => (await c.query(`select 1 from support_tickets where owner_id = $1`, [alice])).rowCount);
    expect(n).toBe(0);
  });
});

describe("account deletion requests", () => {
  it("a parent can request deletion of their own account only, once at a time, with a grace period", async () => {
    await expect(
      as(pool, { role: "authenticated", sub: bob }, (c) => c.query(`insert into account_deletion_requests (user_id) values ($1)`, [alice])),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(pool, { role: "authenticated", sub: alice }, (c) => c.query(`insert into account_deletion_requests (user_id, status) values ($1, 'completed')`, [alice])),
    ).rejects.toThrow(/row-level security/);
    const row = await as(pool, { role: "authenticated", sub: alice },
      async (c) => (await c.query(`insert into account_deletion_requests (user_id) values ($1) returning scheduled_for > now() + interval '6 days' as later`, [alice])).rows[0], true);
    expect(row.later).toBe(true);
    await expect(
      as(pool, { role: "authenticated", sub: alice }, (c) => c.query(`insert into account_deletion_requests (user_id) values ($1)`, [alice])),
    ).rejects.toThrow(/duplicate key/);
    // Cancelling (service role) frees the slot for a future request.
    await pool.query(`update account_deletion_requests set status = 'cancelled' where user_id = $1`, [alice]);
    const again = await as(pool, { role: "authenticated", sub: alice }, async (c) => (await c.query(`insert into account_deletion_requests (user_id) values ($1)`, [alice])).rowCount);
    expect(again).toBe(1);
  });
});
