/**
 * Transactional email templates (app-sent). Auth emails — verification and
 * password reset — are sent by Supabase Auth using supabase/templates/*.html.
 *
 * Templates never include child photographs or generated illustrations.
 * Visual styling is a placeholder until Storyling email tokens are applied.
 */

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

function layout(d: EmailData, heading: string, paragraphs: string[], cta?: { label: string; href: string }): string {
  const dir = d.locale === "ar" ? "rtl" : "ltr";
  return `<!doctype html><html lang="${d.locale}" dir="${dir}"><body style="margin:0;background:#fff7ec;font-family:Arial,Helvetica,sans-serif;color:#2b2238">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:24px;padding:32px" cellpadding="0" cellspacing="0">
<tr><td style="font-size:22px;font-weight:bold;padding-bottom:16px">${esc(d.brand)}</td></tr>
<tr><td style="font-size:20px;font-weight:bold;padding-bottom:12px">${esc(heading)}</td></tr>
${paragraphs.map((p) => `<tr><td style="font-size:16px;line-height:1.6;padding-bottom:12px">${esc(p)}</td></tr>`).join("")}
${cta ? `<tr><td style="padding:16px 0"><a href="${esc(cta.href)}" style="display:inline-block;background:#2b2238;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold">${esc(cta.label)}</a></td></tr>` : ""}
</table></td></tr></table></body></html>`;
}

const copy = {
  en: {
    hi: (n?: string | null) => (n ? `Hi ${n},` : "Hi there,"),
    welcome: { subject: (b: string) => `Welcome to ${b}!`, heading: "Your storybook adventure starts here", body: "Create a character for your child and turn them into the hero of their very own book.", cta: "Create my storybook" },
    receipt: { subject: (n?: number) => `Receipt for order #${n}`, heading: "Thank you for your order", body: (t?: string, a?: string) => `We've received your payment of ${a} for "${t}". We're now preparing the final illustrations — we'll email you when your book is ready.`, cta: "View order" },
    ready: { subject: (t?: string) => `"${t}" is ready to read!`, heading: "Your storybook is ready", body: (t?: string) => `"${t}" has been illustrated and saved to your library. You can read it online or download the PDF.`, cta: "Open my book" },
    refund: { subject: (n?: number) => `Refund for order #${n}`, heading: "Your refund is on its way", body: (a?: string) => `We've issued a refund of ${a}. Depending on your bank it can take 5–10 business days to appear.`, cta: "View orders" },
    support: { subject: (n?: number) => `New reply to your request #${n}`, heading: "We replied to your support request", body: "Our team has replied. Sign in to read the message and respond.", cta: "View conversation" },
  },
  ar: {
    hi: (n?: string | null) => (n ? `مرحباً ${n}،` : "مرحباً،"),
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
  return { subject, html: layout(d, heading, [hi, body], cta), text: `${hi}\n\n${body}\n\n${cta.label}: ${cta.href}` };
}
