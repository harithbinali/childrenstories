import "@/lib/server-guard";
import { z } from "zod";

/**
 * Server environment, validated lazily so `next build` works without secrets
 * and a missing key fails loudly only where it is actually needed.
 */
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  OPENAI_API_KEY: z.string().startsWith("sk-"),
  OPENAI_ORG_ID: z.string().optional(),
  OPENAI_PROJECT_ID: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  PAYPAL_CLIENT_ID: z.string().min(10),
  PAYPAL_CLIENT_SECRET: z.string().min(10),
  PAYPAL_WEBHOOK_ID: z.string().min(5),
  PAYPAL_ENVIRONMENT: z.enum(["sandbox", "live"]).default("sandbox"),
  RESEND_API_KEY: z.string().startsWith("re_"),
  EMAIL_FROM: z.string().min(3),
  CRON_SECRET: z.string().min(16),
  WORKER_ID: z.string().default("worker"),
});

type Env = z.infer<typeof schema>;

export function env<K extends keyof Env>(key: K): Env[K] {
  const parsed = schema.shape[key].safeParse(process.env[key] === "" ? undefined : process.env[key]);
  if (!parsed.success) {
    throw new Error(`Missing or invalid environment variable ${key}. See .env.example.`);
  }
  return parsed.data as Env[K];
}

export function hasEnv(...keys: Array<keyof Env>): boolean {
  return keys.every((k) => schema.shape[k].safeParse(process.env[k] === "" ? undefined : process.env[k]).success);
}
