/**
 * Concatenates supabase/migrations/*.sql (in order) into supabase/setup.sql,
 * so a new Supabase project can be set up by pasting one file into the
 * dashboard's SQL editor — no CLI or local machine needed.
 *
 *   npx tsx scripts/build-supabase-setup-sql.ts
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const parts = files.map((f) => `-- >>> ${f}\n${readFileSync(join(dir, f), "utf8").trim()}\n`);
writeFileSync(
  join(process.cwd(), "supabase", "setup.sql"),
  `-- Storyling database setup — generated from supabase/migrations by scripts/build-supabase-setup-sql.ts.\n` +
    `-- Run once on a NEW Supabase project (Dashboard → SQL Editor → paste → Run). Do not edit by hand.\n\n` +
    parts.join("\n"),
);
console.log(`combined ${files.length} migrations into supabase/setup.sql`);
