/**
 * Transactional email templates (app-sent). Auth emails — verification and
 * password reset — are sent by Supabase Auth using supabase/templates/*.html.
 *
 * Templates never include child photographs or generated illustrations.
 * Layout and colours: ./layout.ts (shared with the Supabase Auth templates).
 */
import { emailShell } from "./layout";

export type EmailTemplate = "welcome" | "payment_receipt" | "book_ready" | "refund_confirmation" | "support_reply";

export type EmailData = {
  brand: string;
  siteUrl: string;
  recipientName?: string | null;
  locale: "en" | "ar";
  bookTitle?: string;
  bookId?: string;
  orderNumber?: number;
  amount?: string;
  ticketNumber?: number;
  ticketId?: string;
};

type Rendered = { subject: string; html: string; text: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(d: EmailData, heading: string, paragraphs: string[], cta: { label: string; href: string }, footer: string): string {
  return emailShell({
    lang: d.locale, brand: esc(d.brand), siteUrl: esc(d.siteUrl), preheader: esc(paragraphs[1] ?? heading), heading: esc(heading),
    paragraphs: paragraphs.map(esc), cta: { label: esc(cta.label), href: esc(cta.href) }, footer: esc(footer),
  });
}

const copy = {
  en: {
    hi: (n?: string | null) => (n ? `Hi ${n},` : "Hi there,"),
    footer: (b: string) => `You're receiving this because you have a ${b} account.`,
    welcome: { subject: (b: string) => `Welcome to ${b}!`, heading: "Your storybook adventure starts here", body: "Create a character for your child and turn them into the hero of their very own book.", cta: "Create my storybook" },
    receipt: { subject: (n?: number) => `Receipt for order #${n}`, heading: "Thank you for your order", body: (t?: string, a?: string) => `We've received your payment of ${a} for "${t}". We're now preparing the final illustrations — we'll email you when your book is ready.`, cta: "View order" },
    ready: { subject: (t?: string) => `"${t}" is ready to read!`, heading: "Your storybook is ready", body: (t?: string) => `"${t}" has been illustrated and saved to your library. You can read it online or download the PDF.`, cta: "Open my book" },
    refund: { subject: (n?: number) => `Refund for order #${n}`, heading: "Your refund is on its way", body: (a?: string) => `We've issued a refund of ${a}. Depending on your bank it can take 5–10 business days to appear.`, cta: "View orders" },
    support: { subject: (n?: number) => `New reply to your request #${n}`, heading: "We replied to your support request", body: "Our team has replied. Sign in to read the message and respond.", cta: "View conversation" },
  },
  ar: {
    hi: (n?: string | null) => (n ? `مرحباً ${n}،` : "مرحباً،"),
    footer: (b: string) => `تصلك هذه الرسالة لأن لديك حساباً في ${b}.`,
    welcome: { subject: (b: string) => `أهلاً بك في ${b}!`, heading: "تبدأ مغامرة كتابك من هنا", body: "أنشئ شخصية لطفلك واجعله بطل كتابه الخاص.", cta: "أنشئ كتابي" },
    receipt: { subject: (n?: number) => `إيصال الطلب رقم ${n}`, heading: "شكراً لطلبك", body: (t?: string, a?: string) => `استلمنا دفعتك بقيمة ${a} لكتاب «${t}». نقوم الآن بتجهيز الرسومات النهائية، وسنرسل لك بريداً عندما يصبح كتابك جاهزاً.`, cta: "عرض الطلب" },
    ready: { subject: (t?: string) => `كتاب «${t}» جاهز للقراءة!`, heading: "كتابك جاهز", body: (t?: string) => `تم رسم «${t}» وحفظه في مكتبتك. يمكنك قراءته على الإنترنت أو تنزيل ملف PDF.`, cta: "افتح كتابي" },
    refund: { subject: (n?: number) => `استرداد للطلب رقم ${n}`, heading: "تم إصدار المبلغ المسترد", body: (a?: string) => `أصدرنا مبلغاً مسترداً قدره ${a}. قد يستغرق ظهوره من ٥ إلى ١٠ أيام عمل حسب البنك.`, cta: "عرض الطلبات" },
    support: { subject: (n?: number) => `رد جديد على طلبك رقم ${n}`, heading: "رددنا على طلب الدعم", body: "رد فريقنا على طلبك. سجّل الدخول لقراءة الرسالة والرد.", cta: "عرض المحادثة" },
  },
} as const;

export function renderEmail(t: EmailTemplate, d: EmailData): Rendered {
  const c = copy[d.locale];
  const hi = c.hi(d.recipientName);
  let subject: string, heading: string, body: string, cta: { label: string; href: string };
  switch (t) {
    case "welcome":
      ({ heading } = c.welcome); subject = c.welcome.subject(d.brand); body = c.welcome.body;
      cta = { label: c.welcome.cta, href: `${d.siteUrl}/dashboard/create` };
      break;
    case "payment_receipt":
      subject = c.receipt.subject(d.orderNumber); heading = c.receipt.heading; body = c.receipt.body(d.bookTitle, d.amount);
      cta = { label: c.receipt.cta, href: `${d.siteUrl}/dashboard/orders` };
      break;
    case "book_ready":
      subject = c.ready.subject(d.bookTitle); heading = c.ready.heading; body = c.ready.body(d.bookTitle);
      cta = { label: c.ready.cta, href: `${d.siteUrl}/dashboard/books/${d.bookId}` };
      break;
    case "refund_confirmation":
      subject = c.refund.subject(d.orderNumber); heading = c.refund.heading; body = c.refund.body(d.amount);
      cta = { label: c.refund.cta, href: `${d.siteUrl}/dashboard/orders` };
      break;
    case "support_reply":
      subject = c.support.subject(d.ticketNumber); heading = c.support.heading; body = c.support.body;
      cta = { label: c.support.cta, href: `${d.siteUrl}/dashboard/support/${d.ticketId}` };
      break;
  }
  return { subject, html: layout(d, heading, [hi, body], cta, c.footer(d.brand)), text: `${hi}\n\n${body}\n\n${cta.label}: ${cta.href}` };
}
