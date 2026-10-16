/**
 * Storyling email shell. Email clients ignore most CSS, so this is table
 * layout with inline styles using the Storyling palette (hex values from
 * styles/storyling/colors.css). Web fonts load where supported; every font
 * stack falls back to system fonts. No images, emoji or icon glyphs — and
 * never any child photo or illustration.
 */
export const EMAIL = {
  paper: "#FFFBF2", paper2: "#FFF4E0", white: "#FFFFFF", ink900: "#1B2457", ink700: "#3A4580", ink500: "#5E6798", ink100: "#E9EBF6",
  sun400: "#FFC93C", sun600: "#E09600", blue600: "#1F64D6",
} as const;

const FONTS_URL = "https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito:wght@400;700&family=Baloo+Bhaijaan+2:wght@600;700&family=Tajawal:wght@400;700&display=swap";

export type ShellInput = {
  lang: "en" | "ar";
  brand: string;
  siteUrl: string;
  preheader: string;
  heading: string;
  /** Already-escaped HTML fragments (or Go-template expressions for Supabase templates). */
  paragraphs: string[];
  cta?: { label: string; href: string };
  /** Shown under the button for clients that block links in buttons. */
  fallbackLink?: { label: string; href: string };
  footer: string;
};

export function emailShell(i: ShellInput): string {
  const ar = i.lang === "ar";
  const display = ar ? "'Baloo Bhaijaan 2', Tahoma, Arial, sans-serif" : "Fredoka, 'Trebuchet MS', Arial, sans-serif";
  const body = ar ? "Tajawal, Tahoma, Arial, sans-serif" : "Nunito, 'Segoe UI', Helvetica, Arial, sans-serif";
  const align = ar ? "right" : "left";
  return `<!doctype html>
<html lang="${i.lang}" dir="${ar ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light">
<title>${i.heading}</title>
<link href="${FONTS_URL}" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${EMAIL.paper};color:${EMAIL.ink900};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${i.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL.paper}">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 8px 18px;text-align:${align};font:700 30px/1 ${display};color:${EMAIL.blue600}">${i.brand}</td></tr>
<tr><td style="background:${EMAIL.white};border:2px solid ${EMAIL.ink100};border-radius:28px;padding:32px 28px;text-align:${align}">
<h1 style="margin:0 0 14px;font:700 26px/1.2 ${display};color:${EMAIL.ink900}">${i.heading}</h1>
${i.paragraphs.map((p) => `<p style="margin:0 0 14px;font:400 16px/1.6 ${body};color:${EMAIL.ink700}">${p}</p>`).join("\n")}
${i.cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px"><tr><td style="background:${EMAIL.sun400};border-radius:999px;border-bottom:4px solid ${EMAIL.sun600}">
<a href="${i.cta.href}" style="display:inline-block;padding:14px 28px;font:700 17px/1 ${display};color:${EMAIL.ink900};text-decoration:none">${i.cta.label}</a>
</td></tr></table>` : ""}
${i.fallbackLink ? `<p style="margin:18px 0 0;font:400 13px/1.5 ${body};color:${EMAIL.ink500}">${i.fallbackLink.label}<br><a href="${i.fallbackLink.href}" style="color:${EMAIL.blue600};word-break:break-all">${i.fallbackLink.href}</a></p>` : ""}
</td></tr>
<tr><td style="padding:18px 8px 0;text-align:${align};font:400 13px/1.5 ${body};color:${EMAIL.ink500}">${i.footer}<br><a href="${i.siteUrl}" style="color:${EMAIL.ink500}">${i.siteUrl.replace(/^https?:\/\//, "")}</a></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
