import type { LegalDocs } from "./types";

export const legalEn: LegalDocs = {
  privacy: {
    title: "Privacy policy",
    summary: "What we collect, why, who helps us run Storyling, and the choices you have.",
    sections: [
      { heading: "Who we are", paragraphs: [
        "Storyling is operated by [COMPANY LEGAL NAME], [COMPANY ADDRESS] (\"we\", \"us\"). We are the controller of the personal data described here. You can reach us at [PRIVACY CONTACT EMAIL].",
      ] },
      { heading: "Who Storyling is for", paragraphs: [
        "Storyling accounts are for adults — parents, guardians and other grown-ups making books for a child. Children do not create accounts or use the dashboard. When you add a child or upload their photo, you confirm you are their parent or legal guardian, or have their parent's or guardian's permission.",
      ] },
      { heading: "What we collect", bullets: [
        "Account details: your email address, the name you choose to show, your language and your email preferences.",
        "Child profiles: a first name or nickname, age, favourite things, appearance notes and story language. We ask for first names only — never surnames.",
        "Child photos: the photos you upload to create a character. See the child photo privacy notice for exactly how these are handled.",
        "What you create: characters, stories, illustrations, dedications and PDFs.",
        "Orders: what you bought, the amount, and the payment status. Card and PayPal details are handled by Stripe and PayPal — we never see or store full card numbers.",
        "Support conversations: messages you send us and our replies.",
        "Technical data: IP address and request logs used for security, rate limiting and fraud prevention.",
      ] },
      { heading: "Why we use it", bullets: [
        "To provide the service you asked for: creating characters, writing and illustrating books, and delivering them to you (contract).",
        "To take payments, issue refunds and keep financial records (contract and legal obligation).",
        "To keep Storyling safe: automated content safety checks, abuse prevention and security logs (legitimate interests).",
        "To send transactional emails such as receipts and \"your book is ready\". Marketing emails are only sent if you opt in, and you can opt out any time in Settings (consent).",
      ] },
      { heading: "AI and automated processing", paragraphs: [
        "Stories, characters and illustrations are created with AI models provided by OpenAI. We send them only what is needed for each step — for example the child's first name, age range, interests and the character reference image. Text and images are also checked by automated safety filters.",
        "We do not use your child's photos or your books to train AI models, and we do not authorise our providers to do so. [CONFIRM PROVIDER DATA-USE TERMS BEFORE LAUNCH]",
      ] },
      { heading: "Who helps us run Storyling", paragraphs: ["We use these service providers (processors), each bound by a data processing agreement:"], bullets: [
        "Supabase — database, sign-in and private file storage.",
        "OpenAI — story writing, image generation and safety checks.",
        "Stripe and PayPal — payments and refunds.",
        "Resend — transactional email delivery.",
        "Vercel — website hosting.",
        "[ADD OR REMOVE PROVIDERS TO MATCH YOUR DEPLOYMENT]",
      ] },
      { heading: "International transfers", paragraphs: ["Some providers process data outside your country. Where required we rely on appropriate safeguards such as standard contractual clauses. [CONFIRM TRANSFER MECHANISMS]"] },
      { heading: "How long we keep data", bullets: [
        "Original child photos: deleted automatically after 30 days by default, or straight away when you delete them.",
        "Characters, books and PDFs: kept in your private library until you delete them or your account.",
        "Orders and payment records: kept for [RETENTION PERIOD REQUIRED BY TAX LAW], in anonymised form after account deletion where the law requires us to keep them.",
        "Security logs: kept for [LOG RETENTION PERIOD].",
      ] },
      { heading: "Your choices and rights", paragraphs: [
        "You can view and edit your details and your child profiles at any time, delete photos, characters and books, change your email preferences, and request deletion of your whole account in Settings. Account deletion has a 7-day grace period in which you can change your mind.",
        "Depending on where you live you may also have rights to access, correct, port or restrict processing of your data, and to complain to your data protection authority. To exercise them, contact [PRIVACY CONTACT EMAIL].",
      ] },
      { heading: "Security", paragraphs: [
        "Private files are stored in non-public storage and shared only through short-lived signed links. Database access rules keep every family's data separate, and our support staff cannot view children's photos. No system is perfectly secure, but we work hard to protect your data.",
      ] },
      { heading: "Changes", paragraphs: ["If we make material changes we will tell you by email or in the app before they take effect. Last updated: [DATE]."] },
    ],
  },
  photoPrivacy: {
    title: "Child photo privacy",
    summary: "A plain-language promise about the photos you upload of your child.",
    sections: [
      { heading: "Why we ask for a photo", paragraphs: ["A photo helps us draw a cartoon character that looks like your child. It is used only for that, and only for your account."] },
      { heading: "Only a parent or guardian may upload", paragraphs: ["Before uploading you confirm that you are the child's parent or legal guardian, or have their permission. We record when you confirmed."] },
      { heading: "What happens when you upload", bullets: [
        "The photo is shrunk and re-encoded in your browser before it is sent.",
        "On our server we remove hidden information such as location and camera details (EXIF/GPS metadata).",
        "An automated safety check runs on every photo. If the check is unavailable, the upload is refused rather than skipped.",
        "The photo is stored in private storage. It is never public and is only shown to you through short-lived links.",
      ] },
      { heading: "Who can see it", paragraphs: ["Only you. Storyling support and admin staff cannot open your child's original photos — our database rules block it. The AI provider receives the photo only to draw your character."] },
      { heading: "Never published, never used for training", paragraphs: ["We never publish your child's photos, never use them in marketing, and never use them to train AI models. Your books are private to your account — there is no public gallery or marketplace."] },
      { heading: "How long we keep it", paragraphs: ["Original photos are deleted automatically 30 days after upload by default. You can delete a photo sooner from your child's profile at any time. The cartoon character made from it stays in your account until you delete it."] },
      { heading: "Questions", paragraphs: ["Write to [PRIVACY CONTACT EMAIL] or use Help in your account."] },
    ],
  },
  terms: {
    title: "Terms of service",
    summary: "The agreement between you and Storyling when you use the service.",
    sections: [
      { heading: "The agreement", paragraphs: ["These terms are between you and [COMPANY LEGAL NAME] ([COMPANY ADDRESS]). By creating an account you agree to them. You must be at least 18 years old, or the age of majority where you live."] },
      { heading: "Your account", paragraphs: ["Keep your sign-in details safe and tell us if you think someone else has access. You are responsible for activity on your account."] },
      { heading: "Children's information and photos", paragraphs: ["You may only add a child or upload their photo if you are their parent or legal guardian, or have permission. You must not upload photos of anyone else without their permission, or any content that is unlawful or harmful."] },
      { heading: "How books are made", paragraphs: [
        "Storyling uses AI to write stories and draw illustrations. Results vary and may not always look exactly as you imagined. You can review the story, edit text and redraw pages within the limits shown in your book before you buy.",
        "Free previews and redraws are limited to keep the service fair and affordable. Limits are shown in the app.",
      ] },
      { heading: "Purchases", paragraphs: [
        "Prices are shown before you pay, in [CURRENCY], and include [TAX TREATMENT]. Payment is taken by Stripe or PayPal. When payment is confirmed, the full book is produced and added to your library, with a PDF to download.",
        "Refunds are covered by our refund policy.",
      ] },
      { heading: "Your content and our licence", paragraphs: [
        "You own the books you make, to the extent the law allows. You may print and share them for personal, non-commercial use. You give us the limited permission we need to store, process and display your content to you in order to provide the service.",
        "Storyling's design, software, illustration styles and brand remain ours.",
      ] },
      { heading: "Acceptable use", bullets: [
        "No content that sexualises, harms or exploits children, or is hateful, violent or unlawful.",
        "No attempts to get around safety filters, usage limits or payments.",
        "No reselling books or using Storyling to build a competing service.",
      ] },
      { heading: "Suspension and termination", paragraphs: ["We may suspend accounts that break these terms. You can delete your account at any time in Settings."] },
      { heading: "Liability", paragraphs: ["[LIMITATION OF LIABILITY CLAUSE — TO BE DRAFTED BY COUNSEL]"] },
      { heading: "Governing law", paragraphs: ["These terms are governed by the laws of [GOVERNING LAW JURISDICTION]. Disputes will be heard in [COURTS]."] },
      { heading: "Changes and contact", paragraphs: ["We will tell you about material changes before they take effect. Contact: [SUPPORT EMAIL]. Last updated: [DATE]."] },
    ],
  },
  refunds: {
    title: "Refund policy",
    summary: "What to do if a book isn't right.",
    sections: [
      { heading: "Try before you buy", paragraphs: ["You can read the whole story, edit the text and see preview illustrations before paying, so you know what you're getting."] },
      { heading: "If something goes wrong", paragraphs: [
        "If a paid book fails to produce, has a technical fault, or a page doesn't come out right, contact us through Help in your account (choose \"Order or payment\") within [NUMBER] days of purchase. We'll first try to fix it — for example by redrawing pages.",
        "If we can't fix it, we'll refund you in full or in part, depending on the problem.",
      ] },
      { heading: "How refunds work", bullets: [
        "Refunds go back to the original payment method through Stripe or PayPal. Your bank may take [NUMBER] business days to show it.",
        "After a full refund the finished book returns to preview and the PDF is no longer available to download.",
        "A partial refund keeps the full book in your library.",
        "You'll receive an email confirming every refund, and it appears on your Orders page.",
      ] },
      { heading: "Your legal rights", paragraphs: ["Because each book is personalised and produced on request, statutory withdrawal rights may not apply once production has started. This policy does not affect your other statutory rights. [CONFIRM CONSUMER-LAW POSITION FOR YOUR MARKETS]"] },
      { heading: "Contact", paragraphs: ["[SUPPORT EMAIL] · Last updated: [DATE]."] },
    ],
  },
};
