"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Button, FloatingDecor, IconButton } from "@/components/storyling";
import { BookPage } from "@/components/book/BookPage";
import { buildPageSequence, buildSpreads, fitPage, shouldUseSpreads } from "@/lib/book/layout-spec";
import { saveReadingProgress } from "@/lib/books/progress-actions";
import type { ReaderBook } from "@/lib/books/reader";

export type ReaderLabels = { back: string; pageLabels: string[]; prev: string; next: string; theEnd: string; contents: string; fullscreen: string; exitFullscreen: string; title: string };

const HIDE_AFTER_MS = 3500;
/** Shown only if an illustration is missing (e.g. design previews); finished books always have art. */
const MISSING_ART = { position: "absolute", inset: 0, background: "repeating-linear-gradient(-45deg, var(--paper-2) 0 14px, var(--paper) 14px 28px)" } as const;

/**
 * Tablet-first storybook reader (Storyling bedtime reader). Spreads on wide
 * screens, single pages otherwise; swipe / tap / keys follow the book's
 * reading direction; controls auto-hide; position is saved for resuming.
 */
export function Reader({ book, labels, backHref, persistProgress = true }: { book: ReaderBook; labels: ReaderLabels; backHref: string; persistProgress?: boolean }) {
  const rtl = book.language === "ar";
  const stage = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [index, setIndex] = useState(book.startIndex);
  const [dir, setDir] = useState<1 | -1>(1);
  const [controls, setControls] = useState(true);
  const [thumbs, setThumbs] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const touchX = useRef<number | null>(null);

  // Measure the stage to size pages without cropping.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ width: e.contentRect.width, height: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const total = book.pages.length;
  const sequence = useMemo(() => buildPageSequence(book.pages.filter((p) => p.kind === "story").length, book.pages.some((p) => p.kind === "dedication")), [book.pages]);
  const spreads = useMemo(() => buildSpreads(sequence, book.language), [sequence, book.language]);
  const viewport = typeof window === "undefined" ? box : { width: window.innerWidth, height: window.innerHeight };
  const useSpreads = box.width > 0 && shouldUseSpreads(book.orientation, viewport);
  const spreadIndex = spreads.findIndex((s) => s.some((p) => p.index === index));
  const visible = useSpreads ? spreads[spreadIndex].map((p) => p.index) : [index];
  const across = visible.length;
  const size = fitPage(book.orientation, { width: Math.max(0, box.width - 16), height: Math.max(0, box.height - 16) }, across);
  const atStart = useSpreads ? spreadIndex === 0 : index === 0;
  const atEnd = useSpreads ? spreadIndex === spreads.length - 1 : index === total - 1;

  const poke = useCallback(() => {
    setControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), HIDE_AFTER_MS);
  }, []);
  // Controls start visible; only schedule the first auto-hide here.
  useEffect(() => {
    hideTimer.current = setTimeout(() => setControls(false), HIDE_AFTER_MS);
    return () => clearTimeout(hideTimer.current);
  }, []);

  const go = useCallback((delta: 1 | -1) => {
    setDir(delta);
    setIndex((i) => {
      if (!useSpreads) return Math.min(total - 1, Math.max(0, i + delta));
      const si = spreads.findIndex((s) => s.some((p) => p.index === i));
      const next = spreads[Math.min(spreads.length - 1, Math.max(0, si + delta))];
      return Math.min(...next.map((p) => p.index));
    });
  }, [useSpreads, spreads, total]);

  // Save progress (debounced) so the book reopens on this page.
  useEffect(() => {
    if (!persistProgress) return;
    const t = setTimeout(() => { void saveReadingProgress(book.id, Math.max(...visible), total); }, 800);
    return () => clearTimeout(t);
  }, [book.id, index, total, persistProgress]); // eslint-disable-line react-hooks/exhaustive-deps -- `visible` derives from index

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const forward = rtl ? "ArrowLeft" : "ArrowRight";
      const backward = rtl ? "ArrowRight" : "ArrowLeft";
      if (e.key === forward || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(1); }
      else if (e.key === backward || e.key === "PageUp") { e.preventDefault(); go(-1); }
      poke();
    };
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("fullscreenchange", onFs); };
  }, [go, poke, rtl]);

  /** Tap the leading/trailing third to turn pages; the middle toggles controls. */
  const onTap = (clientX: number) => {
    const rect = stage.current!.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    if (x < 0.3) go(rtl ? 1 : -1);
    else if (x > 0.7) go(rtl ? -1 : 1);
    else { setControls((c) => !c); clearTimeout(hideTimer.current); return; }
    poke();
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  const fade = { opacity: controls ? 1 : 0, pointerEvents: controls ? "auto" : "none", transition: "opacity var(--dur-base) var(--ease-soft)" } as const;
  const physicalSign = (rtl ? -1 : 1) * dir; // slide direction on screen

  return (
    <MotionConfig reducedMotion="user">
      <div style={{ height: "100dvh", background: "var(--night-900)", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", padding: "clamp(10px,2vw,24px)", gap: 12 }}
        onMouseMove={poke}>
        <FloatingDecor preset="night" />

        <header style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 14, ...fade }}>
          <IconButton icon="arrow-left" label={labels.back} variant="night" onClick={() => window.location.assign(backHref)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "var(--type-h4)", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{labels.title}</div>
            <div aria-live="polite" style={{ font: "var(--type-caption)", color: "var(--ink-300)" }}>{labels.pageLabels[Math.max(...visible)]}</div>
          </div>
          <IconButton icon="squares-four" label={labels.contents} variant="night" aria-expanded={thumbs} onClick={() => setThumbs(!thumbs)} />
          <IconButton icon={fullscreen ? "corners-in" : "corners-out"} label={fullscreen ? labels.exitFullscreen : labels.fullscreen} variant="night" onClick={toggleFullscreen} />
        </header>

        <div ref={stage} dir="ltr" style={{ position: "relative", flex: 1, minHeight: 0, display: "grid", placeItems: "center", perspective: 1600, touchAction: "pan-y" }}
          onClick={(e) => onTap(e.clientX)}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 50) { e.preventDefault(); go(((dx < 0) !== rtl ? 1 : -1) as 1 | -1); poke(); }
          }}>
          {box.width > 0 && (
            <AnimatePresence initial={false} mode="popLayout" custom={physicalSign}>
              <motion.div key={visible.join("-")} custom={physicalSign}
                initial={{ x: 80 * physicalSign, rotateY: 25 * physicalSign, opacity: 0 }}
                animate={{ x: 0, rotateY: 0, opacity: 1 }}
                exit={{ x: -80 * physicalSign, rotateY: -25 * physicalSign, opacity: 0 }}
                transition={{ type: "spring", stiffness: 170, damping: 24 }}
                style={{ display: "flex", boxShadow: "0 40px 80px -30px rgba(0,0,0,.6)", borderRadius: 14, overflow: "hidden" }}>
                {/* buildSpreads already orders each spread left-to-right on screen (reversed for Arabic). */}
                {visible.map((i, slot) => {
                  const p = book.pages[i];
                  return (
                    <div key={i} style={{ width: size.width, height: size.height, position: "relative" }}>
                      <BookPage kind={p.kind} orientation={book.orientation} language={book.language} ageRange={book.ageRange} text={p.text}
                        textPosition={p.textPosition} imageUrl={p.imageUrl} imageAlt={p.imageAlt} title={p.kind === "front_cover" ? book.title : undefined} pageNumber={p.pageNumber}
                        art={!p.imageUrl && p.kind !== "dedication" ? <div style={MISSING_ART} /> : undefined} />
                      {/* Soft spine shading where two pages meet. */}
                      {across === 2 && <div aria-hidden style={{ position: "absolute", insetBlock: 0, [slot === 0 ? "right" : "left"]: 0, width: "6%", pointerEvents: "none",
                        background: `linear-gradient(${slot === 0 ? "to left" : "to right"}, rgba(27,36,87,.18), transparent)` }} />}
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <footer dir={rtl ? "rtl" : "ltr"} style={{ position: "relative", zIndex: 2, display: "grid", gap: 12, justifyItems: "center", ...fade }}>
          <div role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={Math.max(...visible) + 1} style={{ width: "min(420px, 80%)", height: 8, borderRadius: 99, background: "var(--night-700)", overflow: "hidden", transform: rtl ? "scaleX(-1)" : undefined }}>
            <div style={{ height: "100%", width: `${((Math.max(...visible) + 1) / total) * 100}%`, background: "var(--sun-400)", borderRadius: 99, transition: "width var(--dur-slow) var(--ease-soft)" }} />
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <IconButton icon="arrow-left" label={labels.prev} variant="outline" size="lg" disabled={atStart} onClick={() => { go(-1); poke(); }} />
            {atEnd ? (
              <Button size="lg" iconStart="heart" variant="cherry" href={backHref}>{labels.theEnd}</Button>
            ) : (
              <IconButton icon="arrow-right" label={labels.next} variant="primary" size="lg" onClick={() => { go(1); poke(); }} />
            )}
          </div>
        </footer>

        {thumbs && (
          <nav aria-label={labels.contents} className="sl-pop-in" style={{ position: "absolute", insetInline: 12, bottom: 12, zIndex: 3, background: "var(--night-800)", borderRadius: 28, padding: 14, boxShadow: "var(--shadow-float)", display: "flex", gap: 10, overflowX: "auto" }}>
            {book.pages.map((p, i) => (
              <button key={i} type="button" aria-label={labels.pageLabels[i]} aria-current={visible.includes(i) ? "page" : undefined}
                onClick={() => { setDir(i > index ? 1 : -1); setIndex(i); setThumbs(false); poke(); }}
                style={{ flex: "none", width: book.orientation === "portrait" ? 64 : 96, aspectRatio: book.orientation === "portrait" ? "2 / 3" : "3 / 2", padding: 0, border: 0, borderRadius: 8, overflow: "hidden", cursor: "pointer",
                  outline: visible.includes(i) ? "3px solid var(--sun-400)" : "none", outlineOffset: 2 }}>
                <BookPage kind={p.kind} orientation={book.orientation} language={book.language} ageRange={book.ageRange} imageUrl={p.imageUrl}
                  text={p.kind === "story" ? "" : undefined} title={p.kind === "front_cover" ? book.title : undefined}
                  art={!p.imageUrl && p.kind !== "dedication" ? <div style={MISSING_ART} /> : undefined} />
              </button>
            ))}
          </nav>
        )}
      </div>
    </MotionConfig>
  );
}
