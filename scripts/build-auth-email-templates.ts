/**
 * Generates the Supabase Auth email templates (verification, password reset,
 * magic link, email change, invite, reauthentication) from the same Storyling
 * email shell the app uses. Output: supabase/templates/*.html (committed).
 *
 *   npx tsx scripts/build-auth-email-templates.ts
 *
 * Templates are Go templates rendered by Supabase. They pick the language from
 * the user metadata the app stores at sign-up ({{ .Data.locale }}).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { emailShell } from "../src/lib/email/layout";

const BRAND = "Storyling";
const SITE = "{{ .SiteURL }}";
type Copy = { subject: string; heading: string; body: string[]; cta?: string; fallback: string; footer: string };
type Template = { file: string; link: string; en: Copy; ar: Copy };

const footer = { en: "If you didn't ask for this, you can ignore this email.", ar: "إن لم تطلب هذا، يمكنك تجاهل هذه الرسالة." };
const fallback = { en: "Button not working? Copy this link into your browser:", ar: "الزر لا يعمل؟ انسخ هذا الرابط في متصفحك:" };

const TEMPLATES: Template[] = [
  { file: "confirmation.html", link: "{{ .ConfirmationURL }}",
    en: { subject: "Confirm your email for Storyling", heading: "Welcome to Storyling", body: ["Please confirm your email address to finish creating your account. Then you can create your child's character and their first storybook."], cta: "Confirm my email", fallback: fallback.en, footer: footer.en },
    ar: { subject: "أكّد بريدك الإلكتروني في Storyling", heading: "أهلاً بك في Storyling", body: ["من فضلك أكّد بريدك الإلكتروني لإكمال إنشاء حسابك. بعدها يمكنك إنشاء شخصية طفلك وكتابه الأول."], cta: "أكّد بريدي", fallback: fallback.ar, footer: footer.ar } },
  { file: "recovery.html", link: "{{ .ConfirmationURL }}",
    en: { subject: "Reset your Storyling password", heading: "Reset your password", body: ["We received a request to reset the password for {{ .Email }}. This link works for a limited time."], cta: "Choose a new password", fallback: fallback.en, footer: footer.en },
    ar: { subject: "إعادة تعيين كلمة مرور Storyling", heading: "إعادة تعيين كلمة المرور", body: ["تلقّينا طلباً لإعادة تعيين كلمة المرور للحساب {{ .Email }}. يعمل هذا الرابط لفترة محدودة."], cta: "اختر كلمة مرور جديدة", fallback: fallback.ar, footer: footer.ar } },
  { file: "magic_link.html", link: "{{ .ConfirmationURL }}",
    en: { subject: "Your Storyling sign-in link", heading: "Sign in to Storyling", body: ["Use the button below to sign in. The link can only be used once."], cta: "Sign in", fallback: fallback.en, footer: footer.en },
    ar: { subject: "رابط الدخول إلى Storyling", heading: "سجّل الدخول إلى Storyling", body: ["استخدم الزر أدناه لتسجيل الدخول. يمكن استخدام الرابط مرة واحدة فقط."], cta: "تسجيل الدخول", fallback: fallback.ar, footer: footer.ar } },
  { file: "email_change.html", link: "{{ .ConfirmationURL }}",
    en: { subject: "Confirm your new email for Storyling", heading: "Confirm your new email", body: ["Please confirm that you want to change your Storyling email from {{ .Email }} to {{ .NewEmail }}."], cta: "Confirm new email", fallback: fallback.en, footer: footer.en },
    ar: { subject: "أكّد بريدك الجديد في Storyling", heading: "أكّد بريدك الجديد", body: ["من فضلك أكّد رغبتك في تغيير بريدك في Storyling من {{ .Email }} إلى {{ .NewEmail }}."], cta: "أكّد البريد الجديد", fallback: fallback.ar, footer: footer.ar } },
  { file: "invite.html", link: "{{ .ConfirmationURL }}",
    en: { subject: "You're invited to Storyling", heading: "You're invited", body: ["You've been invited to create a Storyling account. Accept the invitation to set up your account."], cta: "Accept invitation", fallback: fallback.en, footer: footer.en },
    ar: { subject: "دعوة للانضمام إلى Storyling", heading: "لديك دعوة", body: ["تمت دعوتك لإنشاء حساب في Storyling. اقبل الدعوة لإعداد حسابك."], cta: "اقبل الدعوة", fallback: fallback.ar, footer: footer.ar } },
  { file: "reauthentication.html", link: "",
    en: { subject: "Your Storyling verification code", heading: "Confirm it's you", body: ["Enter this code to continue:", "<strong style=\"font-size:28px;letter-spacing:6px\">{{ .Token }}</strong>"], fallback: "", footer: footer.en },
    ar: { subject: "رمز التحقق من Storyling", heading: "تأكيد هويتك", body: ["أدخل هذا الرمز للمتابعة:", "<strong dir=\"ltr\" style=\"font-size:28px;letter-spacing:6px\">{{ .Token }}</strong>"], fallback: "", footer: footer.ar } },
];

function render(t: Template, lang: "en" | "ar") {
  const c = t[lang];
  return emailShell({
    lang, brand: BRAND, siteUrl: SITE, preheader: c.body[0].replace(/<[^>]+>/g, ""), heading: c.heading, paragraphs: c.body, footer: c.footer,
    cta: c.cta ? { label: c.cta, href: t.link } : undefined,
    fallbackLink: t.link ? { label: c.fallback, href: t.link } : undefined,
  });
}

const out = join(process.cwd(), "supabase", "templates");
mkdirSync(out, { recursive: true });
const subjects: string[] = [];
for (const t of TEMPLATES) {
  // Arabic when the parent chose Arabic at sign-up; English otherwise (printf keeps a missing value safe).
  const html = `{{ if eq (printf "%v" .Data.locale) "ar" }}${render(t, "ar")}{{ else }}${render(t, "en")}{{ end }}\n`;
  writeFileSync(join(out, t.file), html);
  subjects.push(`| ${t.file} | ${t.en.subject} |`);
}
writeFileSync(join(out, "README.md"), `# Supabase Auth email templates

Generated by \`npx tsx scripts/build-auth-email-templates.ts\` from \`src/lib/email/layout.ts\`
(the same Storyling layout as the app's transactional emails). Do not edit the HTML by hand.

Each file contains English and Arabic versions; Supabase picks one using the language saved
in the user's metadata at sign-up (\`{{ .Data.locale }}\`; users without one get English).

## Installing (hosted Supabase)
Dashboard → Authentication → Emails → Templates. For each template paste the HTML file's
contents and set the subject. Supabase subjects are a single string, so the English
subject is used for everyone (the body is localised).

| File | Subject |
|---|---|
${subjects.join("\n")}

Template ↔ dashboard name: confirmation = "Confirm signup", recovery = "Reset password",
magic_link = "Magic link", email_change = "Change email address", invite = "Invite user",
reauthentication = "Reauthentication".

With the Supabase CLI, reference them from \`supabase/config.toml\`:

\`\`\`toml
[auth.email.template.confirmation]
subject = "Confirm your email for Storyling"
content_path = "./supabase/templates/confirmation.html"
\`\`\`
`);
console.log(`wrote ${TEMPLATES.length} templates to ${out}`);
