import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Client, type PoolClient, Pool } from "pg";

const ROOT = join(__dirname, "..");

/**
 * Creates a throw-away database, applies the Supabase shim + every migration
 * in order, and returns a pool connected to it.
 * Requires TEST_DATABASE_URL pointing at a PostgreSQL 15+ server (superuser).
 */
export async function createTestDatabase(): Promise<{ pool: Pool; drop: () => Promise<void> }> {
  const adminUrl = process.env.TEST_DATABASE_URL;
  if (!adminUrl) throw new Error("TEST_DATABASE_URL is not set");
  const dbName = `storyling_t_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`create database ${dbName}`);
  await admin.end();

  const url = new URL(adminUrl);
  url.pathname = `/${dbName}`;
  const pool = new Pool({ connectionString: url.toString(), max: 6 });

  const files = [
    join(ROOT, "tests", "supabase_shim.sql"),
    ...readdirSync(join(ROOT, "migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((f) => join(ROOT, "migrations", f)),
  ];
  for (const file of files) {
    await pool.query(readFileSync(file, "utf8"));
  }

  return {
    pool,
    drop: async () => {
      await pool.end();
      const c = new Client({ connectionString: adminUrl });
      await c.connect();
      await c.query(`drop database if exists ${dbName} with (force)`);
      await c.end();
    },
  };
}

type Who = { role: "anon" } | { role: "authenticated"; sub: string } | { role: "service_role" };

/** Runs fn inside a transaction impersonating a Supabase request context. Always rolls back unless commit=true. */
export async function as<T>(pool: Pool, who: Who, fn: (c: PoolClient) => Promise<T>, commit = false): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    const claims = who.role === "authenticated" ? { sub: who.sub, role: who.role } : { role: who.role };
    await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
    await c.query(`set local role ${who.role}`);
    const result = await fn(c);
    await c.query(commit ? "commit" : "rollback");
    return result;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

export async function createUser(pool: Pool, email: string, roles: Array<"staff" | "admin"> = []): Promise<string> {
  const { rows } = await pool.query(`insert into auth.users (email, raw_user_meta_data) values ($1, '{"display_name":"Test"}') returning id`, [email]);
  const id = rows[0].id as string;
  for (const r of roles) await pool.query(`insert into public.user_roles (user_id, role) values ($1, $2)`, [id, r]);
  return id;
}
