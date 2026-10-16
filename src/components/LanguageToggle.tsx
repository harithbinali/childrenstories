"use client";
import { useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/storyling";
import { setLocale } from "@/lib/i18n/actions";
import type { Locale } from "@/i18n/config";

/** EN ⇄ العربية pill from the Storyling website kit. */
export function LanguageToggle({ locale, label, ariaLabel, style }: { locale: Locale; label: string; ariaLabel: string; style?: CSSProperties }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = locale === "en" ? "ar" : "en";
  return (
    <button
      type="button"
      lang={next}
      aria-label={ariaLabel}
      disabled={pending}
      onClick={() => start(async () => { await setLocale(next); router.refresh(); })}
      style={{ border: 0, background: "var(--white)", borderRadius: 999, height: 40, padding: "0 14px", font: "700 14px/1 var(--font-body)", color: "var(--ink-800)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "var(--shadow-xs)", opacity: pending ? 0.6 : 1, ...style }}
    >
      <Icon name="globe-simple" weight="bold" />
      {label}
    </button>
  );
}
