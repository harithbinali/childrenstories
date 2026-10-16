import "@/lib/server-guard";
import { runAI, type AiContext } from "./run";

export type ModerationVerdict = { flagged: boolean; categories: string[] };

/**
 * Moderates parent-supplied text (story ideas, dedications, corrections, page
 * edits), generated story text, and uploaded photos. Children's content uses a
 * stricter bar than the API default: any flagged category blocks.
 */
export async function moderate(
  input: { text?: string; imageDataUrls?: string[] },
  ctx: AiContext,
): Promise<ModerationVerdict> {
  const parts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [];
  if (input.text?.trim()) parts.push({ type: "text", text: input.text.slice(0, 20000) });
  for (const url of input.imageDataUrls ?? []) parts.push({ type: "image_url", image_url: { url } });
  if (!parts.length) return { flagged: false, categories: [] };

  const { result } = await runAI("moderation", "moderations.create", ctx, async (client, setting, { signal }) => {
    const res = await client.moderations.create({ model: setting.model, input: parts }, { signal });
    const categories = new Set<string>();
    for (const r of res.results) {
      for (const [name, hit] of Object.entries(r.categories ?? {})) if (hit) categories.add(name);
    }
    return { result: { flagged: res.results.some((r) => r.flagged), categories: [...categories] }, usage: {}, requestId: res._request_id };
  });
  return result;
}
