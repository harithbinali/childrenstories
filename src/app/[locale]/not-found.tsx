import { locale as localeParam } from "next/root-params";
import { Button, FloatingDecor, Icon } from "@/components/storyling";
import { isLocale } from "@/i18n/config";

export default async function NotFound() {
  const l = await localeParam();
  const ar = isLocale(l) && l === "ar";
  return (
    <main id="main" style={{ minHeight: "100vh", display: "grid", placeItems: "center", position: "relative", background: "var(--blue-50)", padding: 24 }}>
      <FloatingDecor preset="sky" />
      <div style={{ position: "relative", textAlign: "center", display: "grid", gap: 16, justifyItems: "center" }}>
        <Icon name="map-trifold" weight="duotone" size={88} color="var(--blue-500)" />
        <h1 style={{ font: "var(--type-h1)" }}>{ar ? "هذه الصفحة ضاعت في الغابة" : "This page wandered off"}</h1>
        <p style={{ font: "var(--type-body-lg)", maxWidth: 460 }}>{ar ? "لم نجد ما تبحث عنه. لنعد إلى البداية." : "We couldn't find what you were looking for. Let's head back to the start."}</p>
        <Button href="/" iconStart="house">{ar ? "العودة للرئيسية" : "Back to home"}</Button>
      </div>
    </main>
  );
}
