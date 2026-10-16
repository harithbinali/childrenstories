import "@/lib/server-guard";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

export const MARKETING_TAG = "marketing-content";

export type MarketingContent = {
  hero?: Partial<Record<"eyebrow" | "h1a" | "h1b" | "h1c" | "sub" | "cta", string>>;
  pricing?: Partial<Record<"title" | "sub", string>>;
  faqs?: Array<{ q: string; a: string }>;
  banner?: { text?: string; href?: string; enabled?: boolean };
  contact?: { email?: string; address?: string };
};

const KEYS = { "home.hero": "hero", "home.pricing": "pricing", "home.faqs": "faqs", "site.banner": "banner", "site.contact": "contact" } as const;

/** Published admin overrides for the marketing site (anon read via RLS). Empty when not configured. */
export async function getMarketingContent(locale: Locale): Promise<MarketingContent> {
  "use cache";
  cacheLife("hours");
  cacheTag(MARKETING_TAG);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return {};
  const { data } = await createClient(url, key, { auth: { persistSession: false } })
    .from("marketing_content").select("key, content").eq("locale", locale).eq("is_published", true).in("key", Object.keys(KEYS));
  const out: Record<string, unknown> = {};
  for (const row of data ?? []) out[KEYS[row.key as keyof typeof KEYS]] = row.content;
  return out as MarketingContent;
}

/** Non-empty override strings win; everything else keeps the built-in copy. */
const pick = (override: string | undefined, fallback: string) => (override && override.trim() ? override : fallback);

export function applyMarketingContent(d: Dictionary, c: MarketingContent): Dictionary {
  if (!c.hero && !c.pricing && !c.faqs?.length) return d;
  return {
    ...d,
    home: {
      ...d.home,
      eyebrow: pick(c.hero?.eyebrow, d.home.eyebrow), h1a: pick(c.hero?.h1a, d.home.h1a), h1b: pick(c.hero?.h1b, d.home.h1b), h1c: pick(c.hero?.h1c, d.home.h1c),
      sub: pick(c.hero?.sub, d.home.sub), cta: pick(c.hero?.cta, d.home.cta),
      pricingTitle: pick(c.pricing?.title, d.home.pricingTitle), pricingSub: pick(c.pricing?.sub, d.home.pricingSub),
      faqs: c.faqs?.length ? c.faqs : d.home.faqs,
    },
  };
}
