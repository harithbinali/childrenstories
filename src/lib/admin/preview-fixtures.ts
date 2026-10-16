import type { AiSettingRow, ContentRow, CustomerRow, DiscountRow, GatewayRow, OrderDetail, Overview, Page, ProductRow, Report, StaffTicket, StyleRow, ThemeRow } from "./queries";

/** Made-up rows for design review of the admin screens (preview routes only — never shown to customers). */
const page = <T,>(rows: T[]): Page<T> => ({ rows, total: rows.length, page: 1, pages: 1 });
const U = ["0b6a2c1e-1111-4a1a-9a1a-000000000001", "0b6a2c1e-2222-4a1a-9a1a-000000000002", "0b6a2c1e-3333-4a1a-9a1a-000000000003"];
const B = ["5f1e0c9a-aaaa-4b2b-8b2b-00000000000a", "5f1e0c9a-bbbb-4b2b-8b2b-00000000000b", "5f1e0c9a-cccc-4b2b-8b2b-00000000000c"];
export const previewEmails = new Map([[U[0], "hana@example.com"], [U[1], "omar.parent@example.com"], [U[2], "staff@example.com"]]);
const at = (daysAgo: number) => new Date(Date.UTC(2026, 9, 16) - daysAgo * 86400_000).toISOString();

export const previewOverview: Overview = {
  parents: 128, children: 171, characters: 203, books: 342, paid_books: 96, revenue: { USD: 228400 }, refunds: { USD: 2400 }, ai_cost_usd: 412.3812,
  ai_unpriced_calls: 0, ai_cost_24h_usd: 18.204, pending_jobs: 7, failed_jobs: 3, failed_jobs_24h: 1, open_tickets: 4, pending_deletions: 1,
};

export const previewReport: Report = {
  from: at(13),
  days: Array.from({ length: 14 }, (_, i) => ({ day: at(13 - i).slice(0, 10), sales: [3, 5, 2, 6, 4, 8, 7, 5, 9, 6, 4, 7, 10, 8][i], revenue_usd: [3, 5, 2, 6, 4, 8, 7, 5, 9, 6, 4, 7, 10, 8][i] * 2400, refunds_usd: i === 6 ? 2400 : 0, ai_cost_usd: 9 + (i % 5) * 3.1, new_customers: [4, 6, 3, 8, 5, 9, 7, 6, 11, 8, 5, 9, 12, 10][i] })),
  themes: [{ slug: "space", name_en: "Space adventure", name_ar: "مغامرة فضائية", books: 41, paid: 14 }, { slug: "ocean", name_en: "Under the sea", name_ar: "تحت البحر", books: 33, paid: 11 }, { slug: "bedtime", name_en: "Bedtime story", name_ar: "قصة قبل النوم", books: 28, paid: 9 }],
  payments: [{ gateway: "stripe", status: "paid", count: 71, amount: 170400, currency: "USD" }, { gateway: "paypal", status: "paid", count: 25, amount: 58000, currency: "USD" }, { gateway: "stripe", status: "failed", count: 6, amount: 14400, currency: "USD" }],
  checkouts: { started: 131, paid: 96, failed: 6 },
};

export const previewCustomers = page<CustomerRow>([
  { id: U[0], email: "hana@example.com", display_name: "Hana", status: "active", locale: "en", created_at: at(40), roles: ["parent"], children: 2, books: 5, paid_orders: 2, deletion_status: null },
  { id: U[1], email: "omar.parent@example.com", display_name: "عمر", status: "suspended", locale: "ar", created_at: at(12), roles: ["parent"], children: 1, books: 1, paid_orders: 0, deletion_status: "pending" },
  { id: U[2], email: "staff@example.com", display_name: "Support", status: "active", locale: "en", created_at: at(90), roles: ["parent", "staff"], children: 0, books: 0, paid_orders: 0, deletion_status: null },
]);

export const previewCustomer = {
  ...previewCustomers.rows[1], suspendedReason: "Repeated attempts to bypass safety filters",
  children: [{ id: "c1", display_name: "Yusuf", age_years: 6, preferred_language: "ar", created_at: at(12) }],
  books: [{ id: B[1], title: "يوسف والنجمة", status: "preview_ready", page_count: 8, created_at: at(11) }],
  orders: [{ id: "o9", order_number: 1051, status: "failed", total_amount: 1900, refunded_amount: 0, currency: "USD", created_at: at(10) }],
  deletions: [{ id: "r1", status: "pending", reason: "We no longer need the account.", requested_at: at(9), scheduled_for: at(2), processed_at: null }],
};

export const previewBooks = page([
  { id: B[0], owner_id: U[0], title: "Layla and the Lost Cloud", page_count: 12, orientation: "portrait", status: "completed", ai_cost_usd: 3.4122, created_at: at(5), payment: "paid", failedJobs: 0 },
  { id: B[1], owner_id: U[1], title: "يوسف والنجمة", page_count: 8, orientation: "landscape", status: "preview_ready", ai_cost_usd: 0.9871, created_at: at(11), payment: "unpaid", failedJobs: 0 },
  { id: B[2], owner_id: U[0], title: "Omar and the Starfish", page_count: 16, orientation: "portrait", status: "producing", ai_cost_usd: 2.105, created_at: at(1), payment: "paid", failedJobs: 2 },
]);

export const previewJobs = page([
  { id: "9a1b2c3d-0000-4000-8000-000000000001", type: "page_illustration", status: "failed", stage: "illustrating", progress: 25, attempts: 5, max_attempts: 5, last_error: "OpenAI request timed out after 300000 ms", run_after: at(0), created_at: at(1), updated_at: at(0), book_id: B[2], owner_id: U[0] },
  { id: "9a1b2c3d-0000-4000-8000-000000000002", type: "pdf_render", status: "queued", stage: "queued", progress: 0, attempts: 0, max_attempts: 5, last_error: null, run_after: at(0), created_at: at(0), updated_at: at(0), book_id: B[0], owner_id: U[0] },
  { id: "9a1b2c3d-0000-4000-8000-000000000003", type: "story_generate", status: "completed", stage: "done", progress: 100, attempts: 1, max_attempts: 3, last_error: null, run_after: at(2), created_at: at(2), updated_at: at(2), book_id: B[1], owner_id: U[1] },
]);

export const previewOrders = page([
  { id: "o1", order_number: 1042, owner_id: U[0], customer_email: "hana@example.com", status: "paid", total_amount: 2160, refunded_amount: 0, currency: "USD", gateway: "stripe", paid_at: at(4), created_at: at(4), books: { title: "Layla and the Lost Cloud" } },
  { id: "o2", order_number: 1017, owner_id: U[0], customer_email: "hana@example.com", status: "partially_refunded", total_amount: 1900, refunded_amount: 500, currency: "USD", gateway: "paypal", paid_at: at(16), created_at: at(16), books: { title: "Omar and the Starfish" } },
  { id: "o9", order_number: 1051, owner_id: U[1], customer_email: "omar.parent@example.com", status: "failed", total_amount: 1900, refunded_amount: 0, currency: "USD", gateway: "stripe", paid_at: null, created_at: at(10), books: { title: "يوسف والنجمة" } },
]);

export const previewOrder: OrderDetail = {
  id: "o1", order_number: 1042, owner_id: U[0], customer_email: "hana@example.com", status: "paid", currency: "USD", subtotal_amount: 2400, discount_amount: 240, total_amount: 2160, refunded_amount: 0,
  gateway: "stripe", gateway_checkout_id: "cs_test_123", paid_at: at(4), created_at: at(4), books: { id: B[0], title: "Layla and the Lost Cloud" },
  order_items: [{ description: "Personalised storybook", page_count: 12, unit_amount: 2400, quantity: 1, currency: "USD" }],
  payments: [{ id: "p1", gateway: "stripe", gateway_payment_id: "pi_3Q0example", status: "paid", amount: 2160, currency: "USD", failure_reason: null, created_at: at(4) }],
  refunds: [],
};

export const previewPayments = page([
  { id: "p1", order_id: "o1", gateway: "stripe", gateway_payment_id: "pi_3Q0example", status: "paid", amount: 2160, currency: "USD", failure_reason: null, created_at: at(4), orders: { order_number: 1042 } },
  { id: "p2", order_id: "o9", gateway: "stripe", gateway_payment_id: "pi_3Q1declined", status: "failed", amount: 1900, currency: "USD", failure_reason: "card_declined", created_at: at(10), orders: { order_number: 1051 } },
]);
export const previewWebhooks = [
  { gateway: "stripe", event_id: "evt_1", event_type: "checkout.session.completed", received_at: at(4), processed_at: at(4), processing_error: null },
  { gateway: "paypal", event_id: "WH-2", event_type: "PAYMENT.CAPTURE.REFUNDED", received_at: at(14), processed_at: null, processing_error: "order not found for capture" },
];

export const previewRefunds = page([
  { id: "r1", order_id: "o2", amount: 500, currency: "USD", status: "succeeded", reason: "Page 4 printed with a glitch", gateway_refund_id: "re_123", requested_by: U[2], created_at: at(14), orders: { order_number: 1017, gateway: "paypal" } },
]);

export const previewProducts: ProductRow[] = [8, 12, 16].map((n, i) => ({ id: `pr${n}`, sku: `book-${n}`, name_en: `${n}-page storybook`, name_ar: `كتاب من ${n} صفحة`, page_count: n, price_amount: [1900, 2400, 2900][i], currency: "USD", is_active: true, free_preview_pages: 2, included_regenerations: n, sort_order: i }));
export const previewDiscounts: DiscountRow[] = [
  { id: "d1", code: "WELCOME10", percent_off: 10, amount_off: null, currency: null, max_redemptions: 500, redeemed_count: 37, starts_at: null, expires_at: at(-30), is_active: true, created_at: at(20) },
  { id: "d2", code: "EID5", percent_off: null, amount_off: 500, currency: "USD", max_redemptions: null, redeemed_count: 12, starts_at: at(60), expires_at: at(30), is_active: false, created_at: at(61) },
];

export const previewThemes: ThemeRow[] = [
  { id: "t1", slug: "space", name_en: "Space adventure", name_ar: "مغامرة فضائية", description_en: "Rockets, planets and friendly aliens.", description_ar: "صواريخ وكواكب ومخلوقات لطيفة.", prompt_guidance: "A gentle, wonder-filled journey through space.", is_custom: false, is_featured: true, is_active: true, sort_order: 1 },
  { id: "t2", slug: "custom", name_en: "Custom Story", name_ar: "قصة مخصّصة", description_en: "Your own idea.", description_ar: "فكرتك الخاصة.", prompt_guidance: "Follow the parent's idea closely while keeping it age-appropriate.", is_custom: true, is_featured: false, is_active: true, sort_order: 14 },
];
export const previewStyles: StyleRow[] = [
  { id: "s1", slug: "storybook-soft", name_en: "Soft storybook", name_ar: "قصص ناعمة", description_en: "Warm, rounded and gentle.", description_ar: "دافئ ومستدير ولطيف.", prompt_template: "Soft painterly children's book illustration…", is_active: true, sort_order: 1 },
];

export const previewAi: AiSettingRow[] = [
  { purpose: "image", model: "gpt-image-2", params: { preview_quality: "medium", final_quality: "high", output_format: "png" }, timeout_ms: 300000, max_retries: 2, pricing: {}, updated_at: at(3) },
  { purpose: "story", model: "gpt-5.5", params: { reasoning_effort: "medium" }, timeout_ms: 180000, max_retries: 2, pricing: {}, updated_at: at(3) },
];
export const previewGateways: GatewayRow[] = [
  { gateway: "stripe", is_enabled: true, is_default: true, mode: "sandbox", supported_currencies: ["USD"], updated_at: at(3) },
  { gateway: "paypal", is_enabled: false, is_default: false, mode: "sandbox", supported_currencies: ["USD"], updated_at: at(3) },
];
export const previewContent: ContentRow[] = [
  { key: "site.banner", locale: "en", content: { text: "Eid gift books — 10% off with WELCOME10", href: "/pricing", enabled: true }, is_published: true, updated_at: at(2) },
];

export const previewTickets = page([
  { id: "t2", ticket_number: 208, owner_id: U[0], subject: "My book's PDF won't download", category: "book", status: "awaiting_staff", priority: "high", assigned_to: U[2], updated_at: at(0), created_at: at(1) },
  { id: "t1", ticket_number: 175, owner_id: U[1], subject: "سؤال عن الاسترداد", category: "order", status: "resolved", priority: "normal", assigned_to: null, updated_at: at(13), created_at: at(15) },
]);
export const previewTicket: StaffTicket = {
  id: "t2", ticket_number: 208, owner_id: U[0], subject: "My book's PDF won't download", category: "book", status: "awaiting_staff", priority: "high", assigned_to: U[2],
  books: { id: B[0], title: "Layla and the Lost Cloud" }, orders: { id: "o1", order_number: 1042 },
  support_messages: [
    { id: "m1", body: "Hi! When I press download nothing happens. Could you help?", is_staff: false, author_id: U[0], created_at: at(1) },
    { id: "m2", body: "Thanks for getting in touch! We're looking into it now.", is_staff: true, author_id: U[2], created_at: at(0.5) },
  ],
};

export const previewAudit = page([
  { id: 3, actor_id: U[2], action: "order.refund", target_table: "orders", target_id: "o2", details: { amount: 500, reason: "Page 4 printed with a glitch" }, ip_address: "203.0.113.7", created_at: at(14) },
  { id: 2, actor_id: U[2], action: "customer.suspend", target_table: "profiles", target_id: U[1], details: { reason: "Repeated attempts to bypass safety filters" }, ip_address: "203.0.113.7", created_at: at(8) },
]);

export const previewChildren = page([
  { id: "c1", owner_id: U[0], display_name: "Layla", age_years: 5, preferred_language: "en", created_at: at(40), characters: 2, books: 3 },
  { id: "c2", owner_id: U[1], display_name: "Yusuf", age_years: 6, preferred_language: "ar", created_at: at(12), characters: 1, books: 1 },
]);
export const previewCharacters = page([
  { id: "ch1", owner_id: U[0], name: "Layla", status: "approved", generation_count: 2, approved_at: at(39), created_at: at(40), child_profiles: { display_name: "Layla" }, illustration_styles: { name_en: "Soft storybook", name_ar: "قصص ناعمة" } },
  { id: "ch2", owner_id: U[1], name: "Yusuf", status: "failed", generation_count: 3, approved_at: null, created_at: at(12), child_profiles: { display_name: "Yusuf" }, illustration_styles: { name_en: "Bright cartoon", name_ar: "كرتون مشرق" } },
]);

export const previewSettingsValues = { "brand.name": "Storyling", "brand.support_email": "support@example.com", "retention.child_photo_days": 30, "features.google_auth": false, "features.design_system_public": false };
export const previewLimits = { "limits.free_character_attempts": 3, "limits.free_story_attempts": 3, "limits.free_illustration_previews": 2, "limits.daily_image_generations_per_user": 30, "limits.daily_text_generations_per_user": 40, "limits.max_concurrent_jobs_per_user": 4 };
