import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { BlobFrame, Card, FloatingDecor, SpeechBubble } from "@/components/storyling";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Wordmark } from "@/components/marketing/Wordmark";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function AuthLayout({ children }: LayoutProps<"/[locale]">) {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  const d = getDictionary(l);
  return (
    <div style={{ minHeight: "100dvh", background: "var(--blue-50)", position: "relative", overflow: "hidden" }}>
      <FloatingDecor preset="sky" />
      <header className="sl-wrap" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", paddingBlock: 18 }}>
        <Wordmark name={d.brand} />
        <LanguageToggle locale={l} label={d.common.language} ariaLabel={d.common.languageLabel} />
      </header>
      <main id="main" className="sl-wrap grid wide:grid-cols-[1fr_minmax(0,480px)] gap-10 items-center" style={{ position: "relative", paddingBlock: "clamp(12px, 4vw, 48px) 64px" }}>
        <div className="hidden wide:block" style={{ position: "relative", minHeight: 460 }}>
          <BlobFrame shape={2} tone="sun" icon="book-open-text" label="Storybook illustration" style={{ width: "72%", transform: "rotate(-3deg)", marginInline: "auto" }} />
          <SpeechBubble tone="night" tail="bottom-start" className="sl-float" style={{ position: "absolute", top: "6%", insetInlineEnd: "4%", maxWidth: 240 }}>{d.home.bubble}</SpeechBubble>
        </div>
        <Card padding="clamp(24px, 4vw, 40px)" wobble style={{ width: "100%", maxWidth: 480, marginInline: "auto" }}>
          {children}
        </Card>
      </main>
    </div>
  );
}
