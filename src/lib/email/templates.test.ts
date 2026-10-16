import { describe, expect, it } from "vitest";
import { renderEmail } from "./templates";

const base = { brand: "Storyling", siteUrl: "https://storyling.example", locale: "en" as const };

describe("transactional emails", () => {
  it("escapes user-controlled text and links to the right page", () => {
    const e = renderEmail("book_ready", { ...base, recipientName: "<b>Hana</b>", bookTitle: `"Moon" & <stars>`, bookId: "b1" });
    expect(e.html).not.toContain("<b>Hana</b>");
    expect(e.html).toContain("&lt;b&gt;Hana&lt;/b&gt;");
    expect(e.html).toContain("&quot;Moon&quot; &amp; &lt;stars&gt;");
    expect(e.html).toContain("https://storyling.example/dashboard/books/b1");
    expect(e.text).toContain("https://storyling.example/dashboard/books/b1");
  });

  it("renders Arabic right-to-left", () => {
    const e = renderEmail("support_reply", { ...base, locale: "ar", ticketNumber: 12, ticketId: "t1" });
    expect(e.html).toContain('dir="rtl"');
    expect(e.html).toContain('lang="ar"');
    expect(e.subject).toContain("12");
  });

  it("never embeds images", () => {
    for (const t of ["welcome", "payment_receipt", "book_ready", "refund_confirmation", "support_reply"] as const) {
      expect(renderEmail(t, { ...base, bookId: "b", ticketId: "t", orderNumber: 1, amount: "$19.00", bookTitle: "x" }).html).not.toMatch(/<img/i);
    }
  });
});
