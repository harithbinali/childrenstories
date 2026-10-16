/**
 * AI cost estimation from the admin-maintained price table in
 * ai_model_settings.pricing. Returns null (unknown) instead of guessing when a
 * price is not configured — reports then show "cost unknown" for those calls.
 *
 * pricing JSON (USD):
 * {
 *   "input_per_1m": 1.25, "output_per_1m": 10,          // text tokens
 *   "image_input_per_1m": 8, "image_output_per_1m": 30, // image tokens (GPT image models)
 *   "per_image": { "high": { "1024x1536": 0.25 } }       // optional flat per-image price
 * }
 */

export type Pricing = {
  input_per_1m?: number;
  output_per_1m?: number;
  image_input_per_1m?: number;
  image_output_per_1m?: number;
  per_image?: Record<string, Record<string, number>>;
};

export type Usage = {
  inputTokens?: number;
  outputTokens?: number;
  imageInputTokens?: number;
  imageOutputTokens?: number;
  imageCount?: number;
  imageQuality?: string;
  imageSize?: string;
};

const per1m = (tokens: number | undefined, price: number | undefined) =>
  !tokens ? 0 : price === undefined ? null : (tokens / 1_000_000) * price;

export function estimateCostUsd(pricing: Pricing | null | undefined, u: Usage): number | null {
  if (!pricing) return null;
  // Flat per-image pricing wins when configured for this quality/size.
  if (u.imageCount && u.imageQuality && u.imageSize) {
    const flat = pricing.per_image?.[u.imageQuality]?.[u.imageSize];
    if (flat !== undefined) {
      const text = per1m(u.inputTokens, pricing.input_per_1m);
      return round6(flat * u.imageCount + (text ?? 0));
    }
  }
  const parts = [
    per1m(u.inputTokens, pricing.input_per_1m),
    per1m(u.outputTokens, pricing.output_per_1m),
    per1m(u.imageInputTokens, pricing.image_input_per_1m),
    per1m(u.imageOutputTokens, pricing.image_output_per_1m),
  ];
  if (parts.some((p) => p === null)) return null;
  const total = (parts as number[]).reduce((a, b) => a + b, 0);
  if (total === 0 && (u.imageCount ?? 0) > 0) return null; // images but no image pricing
  return round6(total);
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
