import "@/lib/server-guard";
import { toFile } from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { IMAGE_SIZE, compositionInstruction, type Language, type Orientation, type TextPosition } from "@/lib/book/layout-spec";
import { runAI, type AiContext } from "./run";

export type InputImage = { bytes: Uint8Array; mimeType: string; name: string };
export type QualityTier = "preview" | "final";

const supportsInputFidelity = (model: string) => /^gpt-image-1(\.5)?(-|$)/.test(model);

async function asUploads(images: InputImage[]) {
  return Promise.all(images.map((i) => toFile(Buffer.from(i.bytes), i.name, { type: i.mimeType })));
}

function decodeImage(res: { data?: Array<{ b64_json?: string | null }> | null }): Uint8Array {
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("image model returned no image");
  return new Uint8Array(Buffer.from(b64, "base64"));
}

export const CHARACTER_IDENTITY_RULES = `Preserve the child's recognisable identity exactly: facial structure and face shape, skin tone, hair colour, hairstyle and hair texture, eye colour and eye shape, eyebrows, and any distinctive features such as freckles, dimples or glasses. Keep realistic, age-appropriate child proportions — do not age the child up, slim, lighten or darken their skin, or change their ethnicity. Wholesome, fully clothed, friendly expression.`;

export function buildCharacterPrompt(args: { stylePrompt: string; corrections?: string | null; appearanceNotes?: string | null }): string {
  return [
    `Transform the child in the reference photo(s) into an illustrated storybook character.`,
    args.stylePrompt,
    CHARACTER_IDENTITY_RULES,
    args.appearanceNotes ? `Parent's notes about appearance: ${args.appearanceNotes.slice(0, 400)}` : null,
    args.corrections ? `Corrections requested by the parent: ${args.corrections.slice(0, 500)}` : null,
    `Composition: a single full-body character reference, standing in a relaxed neutral pose facing three-quarters toward the viewer, centred, head to toe visible, on a plain soft light background with no scenery, no other people, no text.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Admin-configured size (Admin → AI configuration), falling back to the layout spec. */
function sizeFor(params: Record<string, unknown>, orientation: Orientation): string {
  const v = params[orientation === "portrait" ? "portrait_size" : "landscape_size"];
  return typeof v === "string" && /^\d{3,4}x\d{3,4}$/.test(v) ? v : IMAGE_SIZE[orientation];
}

/** Photo(s) of the child -> illustrated character reference sheet. */
export async function generateCharacterReference(
  args: { photos: InputImage[]; stylePrompt: string; corrections?: string | null; quality: QualityTier; appearanceNotes?: string | null },
  ctx: AiContext,
): Promise<{ image: Uint8Array; prompt: string; model: string; size: string; costUsd: number | null }> {
  let size: string = IMAGE_SIZE.portrait;
  const prompt = buildCharacterPrompt(args);

  const { result, costUsd } = await runAI("image", "images.edit:character", ctx, async (client, setting, { signal, safetyId }) => {
    size = sizeFor(setting.params, "portrait");
    const quality = (setting.params[args.quality === "final" ? "final_quality" : "preview_quality"] as string) ?? "medium";
    const res = await client.images.edit(
      {
        model: setting.model,
        image: await asUploads(args.photos),
        prompt,
        size,
        quality: quality as "low" | "medium" | "high",
        output_format: "png",
        ...(supportsInputFidelity(setting.model) ? { input_fidelity: "high" as const } : {}),
        user: safetyId,
      },
      { signal },
    );
    return {
      result: { image: decodeImage(res), model: setting.model },
      usage: {
        imageCount: 1, imageQuality: quality, imageSize: size,
        inputTokens: res.usage?.input_tokens_details?.text_tokens,
        imageInputTokens: res.usage?.input_tokens_details?.image_tokens,
        imageOutputTokens: res.usage?.output_tokens,
      },
      requestId: res._request_id,
    };
  });
  return { image: result.image, model: result.model, prompt, size, costUsd };
}

const VisualDescription = z.object({ description: z.string() });

/**
 * Writes a precise visual description of the approved character. It is added
 * to every scene prompt alongside the reference image to reinforce
 * consistency (it never replaces the image reference).
 */
export async function describeCharacter(reference: InputImage, ctx: AiContext): Promise<string> {
  const dataUrl = `data:${reference.mimeType};base64,${Buffer.from(reference.bytes).toString("base64")}`;
  const { result } = await runAI("story_fast", "responses.parse:describe_character", ctx, async (client, setting, { signal, safetyId }) => {
    const res = await client.responses.parse(
      {
        model: setting.model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Describe this illustrated child character for an illustrator who must redraw them consistently: face shape, skin tone, hair colour/length/style, eye colour, eyebrows, distinctive features, body proportions, and the art style. 60-100 words, factual, no names, no clothing.",
              },
              { type: "input_image", image_url: dataUrl, detail: "high" },
            ],
          },
        ],
        text: { format: zodTextFormat(VisualDescription, "character_description") },
        safety_identifier: safetyId,
        store: false,
      },
      { signal },
    );
    if (!res.output_parsed) throw new Error("no description returned");
    return { result: res.output_parsed.description, usage: { inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens }, requestId: res._request_id };
  });
  return result;
}

export type SceneArgs = {
  characterDescription: string;
  wardrobe: string;
  stylePrompt: string;
  scenePrompt: string;
  orientation: Orientation;
  textPosition: TextPosition | null; // null for covers (title is typeset separately)
  language: Language;
  kind: "page" | "front_cover" | "back_cover";
  hasCompositionReference?: boolean;
};

export function buildScenePrompt(args: SceneArgs & { compositionReference?: InputImage | null }): string {
  const composition =
    args.kind === "front_cover"
      ? "Cover composition: the hero is the clear focal point in the lower two-thirds; keep the top third calm and simple because the book title will be typeset there."
      : args.kind === "back_cover"
        ? "Back cover composition: a quiet, simple closing vignette with plenty of calm space."
        : compositionInstruction(args.orientation, args.textPosition ?? "bottom", args.language);

  return [
    `Children's picture-book illustration (${args.orientation}).`,
    `The hero is EXACTLY the same child character shown in the reference image — identical face, skin tone, hair, eyes and proportions. Character notes: ${args.characterDescription}`,
    `Outfit (keep identical unless the scene says otherwise): ${args.wardrobe}`,
    `Scene: ${args.scenePrompt}`,
    args.stylePrompt,
    composition,
    (args.hasCompositionReference || args.compositionReference)
      ? `The second reference image is the approved draft of this exact page: keep its composition, camera angle, poses and layout, re-rendered with more detail and polish.`
      : null,
    `Absolutely no text, letters, numbers, captions, signs, logos or speech bubbles anywhere in the image. Wholesome, gentle, child-friendly.`,
  ]
    .filter(Boolean)
    .join("\n");
}


/** A story page / cover illustration of the approved character. */
export async function generateSceneIllustration(
  args: {
    reference: InputImage;
    characterDescription: string;
    wardrobe: string;
    stylePrompt: string;
    scenePrompt: string;
    orientation: Orientation;
    textPosition: TextPosition | null; // null for covers (title is typeset separately)
    language: Language;
    quality: QualityTier;
    kind: "page" | "front_cover" | "back_cover";
    /** Approved preview of this page: the final render keeps its composition. */
    compositionReference?: InputImage | null;
  },
  ctx: AiContext,
): Promise<{ image: Uint8Array; prompt: string; model: string; size: string; costUsd: number | null }> {
  let size: string = IMAGE_SIZE[args.orientation];
  const prompt = buildScenePrompt(args);

  const { result, costUsd } = await runAI("image", `images.edit:${args.kind}`, ctx, async (client, setting, { signal, safetyId }) => {
    size = sizeFor(setting.params, args.orientation);
    const quality = (setting.params[args.quality === "final" ? "final_quality" : "preview_quality"] as string) ?? "medium";
    const res = await client.images.edit(
      {
        model: setting.model,
        image: await asUploads(args.compositionReference ? [args.reference, args.compositionReference] : [args.reference]),
        prompt,
        size,
        quality: quality as "low" | "medium" | "high",
        output_format: "png",
        ...(supportsInputFidelity(setting.model) ? { input_fidelity: "high" as const } : {}),
        user: safetyId,
      },
      { signal },
    );
    return {
      result: { image: decodeImage(res), model: setting.model },
      usage: {
        imageCount: 1, imageQuality: quality, imageSize: size,
        inputTokens: res.usage?.input_tokens_details?.text_tokens,
        imageInputTokens: res.usage?.input_tokens_details?.image_tokens,
        imageOutputTokens: res.usage?.output_tokens,
      },
      requestId: res._request_id,
    };
  });
  return { image: result.image, model: result.model, prompt, size, costUsd };
}
