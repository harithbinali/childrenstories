"use client";
import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { IconButton, Icon } from "@/components/storyling";
import { BookPage } from "@/components/book/BookPage";
import type { Locale } from "@/i18n/config";

type SamplePage = { text: string; icon: string; tone: string };

/** Interactive sample: flip through a few illustrated pages (art is placeholder until real samples exist). */
export function SampleBook({ locale, pages, prevLabel, nextLabel, pageOfLabels }: {
  locale: Locale; pages: readonly SamplePage[]; prevLabel: string; nextLabel: string; pageOfLabels: readonly string[];
}) {
  const [[index, dir], setState] = useState<[number, 1 | -1]>([0, 1]);
  const rtl = locale === "ar";
  const go = (delta: 1 | -1) => setState(([i]) => [Math.min(pages.length - 1, Math.max(0, i + delta)), delta]);
  const page = pages[index];
  // Turning "forward" moves toward the reading direction's start edge.
  const sign = (rtl ? -1 : 1) * dir;
  const tone = page.tone === "sky" ? "blue" : page.tone;

  // reducedMotion="user": page turns become simple fades for reduced-motion users,
  // with identical server/client markup (no hydration mismatch).
  return (
    <MotionConfig reducedMotion="user">
    <div style={{ display: "grid", justifyItems: "center", gap: 22 }}>
      <div
        style={{ width: "min(420px, 100%)", aspectRatio: "2 / 3", position: "relative", perspective: 1400 }}
        onTouchStart={(e) => ((e.currentTarget as HTMLDivElement).dataset.x = String(e.touches[0].clientX))}
        onTouchEnd={(e) => {
          const start = Number((e.currentTarget as HTMLDivElement).dataset.x);
          const dx = e.changedTouches[0].clientX - start;
          if (Math.abs(dx) > 40) go(((dx < 0) !== rtl ? 1 : -1) as 1 | -1);
        }}
      >
        <AnimatePresence initial={false} mode="popLayout" custom={sign}>
          <motion.div
            key={index}
            custom={sign}
            initial={{ rotateY: 70 * sign, x: 60 * sign, opacity: 0 }}
            animate={{ rotateY: 0, x: 0, opacity: 1 }}
            exit={{ rotateY: -70 * sign, x: -60 * sign, opacity: 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 22 }}
            style={{ position: "absolute", inset: 0, borderRadius: 18, overflow: "hidden", boxShadow: "var(--shadow-float)", transformOrigin: rtl ? "right center" : "left center" }}
          >
            <BookPage
              kind="story" orientation="portrait" language={locale} ageRange="3-5" text={page.text} textPosition="bottom" pageNumber={index + 1}
              art={
                <div style={{ position: "absolute", inset: 0, background: `radial-gradient(120% 90% at 30% 20%, var(--${tone}-100), var(--${tone}-400))`, display: "grid", placeItems: "center", paddingBottom: "30%" }}>
                  <Icon name={page.icon} weight="duotone" size={120} color={`var(--${tone}-600)`} />
                </div>
              }
            />
          </motion.div>
        </AnimatePresence>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <IconButton icon="arrow-left" label={prevLabel} onClick={() => go(-1)} disabled={index === 0} />
        <span aria-live="polite" style={{ font: "700 15px var(--font-body)", color: "var(--ink-700)", minWidth: 110, textAlign: "center" }}>{pageOfLabels[index]}</span>
        <IconButton icon="arrow-right" label={nextLabel} variant="secondary" onClick={() => go(1)} disabled={index === pages.length - 1} />
      </div>
    </div>
    </MotionConfig>
  );
}
