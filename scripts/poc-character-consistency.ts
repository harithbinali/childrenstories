/**
 * Character-consistency proof of concept (Part 11 / Phase 2 checkpoint).
 *
 *   OPENAI_API_KEY=sk-... pnpm poc:characters --photo ./kid1.jpg [--photo ./kid2.jpg] [--style 3d-cartoon]
 *   # review poc-output/<run>/character.png, then optionally re-use it:
 *   OPENAI_API_KEY=sk-... pnpm poc:characters --photo ./kid1.jpg --reference poc-output/<run>/character.png
 *
 * Uses the SAME prompt builders as production (src/lib/ai/images.ts).
 * Output stays local in poc-output/ (git-ignored). Only use photos you are
 * authorised to process (your own child, or with the guardian's consent).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";
import OpenAI, { toFile } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { buildCharacterPrompt, buildScenePrompt } from "../src/lib/ai/images";
import { IMAGE_SIZE, type Orientation, type TextPosition } from "../src/lib/book/layout-spec";
import { validateImage } from "../src/lib/uploads/validate-image";

const { values } = parseArgs({
  options: {
    photo: { type: "string", multiple: true },
    style: { type: "string", default: "3d-cartoon" },
    reference: { type: "string" },
    "image-model": { type: "string", default: process.env.POC_IMAGE_MODEL ?? "gpt-image-2" },
    "text-model": { type: "string", default: process.env.POC_TEXT_MODEL ?? "gpt-5.4-mini" },
    quality: { type: "string", default: "medium" },
    "i-am-authorised": { type: "boolean", default: false },
  },
});

function fail(msg: string): never {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) fail("OPENAI_API_KEY is not set");
const photos = values.photo ?? [];
if (photos.length < 1 || photos.length > 3) fail("pass 1–3 --photo files");
if (!values["i-am-authorised"]) fail("confirm you are the parent/guardian or have their consent by adding --i-am-authorised");

// Style prompts come from the seeded catalog so the POC matches production.
const seed = readFileSync(join(__dirname, "../supabase/migrations/20261016000600_reference_data.sql"), "utf8");
const styleMatch = new RegExp(`\\('${values.style}',[\\s\\S]*?\\n\\s+'([^']+)', \\d\\)`).exec(seed);
if (!styleMatch) fail(`unknown style ${values.style} (see illustration_styles seed)`);
const stylePrompt = styleMatch[1];

const client = new OpenAI({ maxRetries: 2 });
const imageModel = values["image-model"]!;
const textModel = values["text-model"]!;
const quality = values.quality as "low" | "medium" | "high";
const supportsFidelity = /^gpt-image-1(\.5)?(-|$)/.test(imageModel);

const SCENES: Array<{ label: string; orientation: Orientation; textPosition: TextPosition; prompt: string; wardrobe?: string }> = [
  { label: "Close-up, joyful", orientation: "portrait", textPosition: "bottom", prompt: "Close-up portrait of the hero laughing with delight while blowing dandelion seeds in a sunny meadow." },
  { label: "Action, side view", orientation: "landscape", textPosition: "end", prompt: "The hero running along a beach at sunset, seen from the side, kicking up little splashes, a friendly crab watching." },
  { label: "Night, quiet emotion", orientation: "portrait", textPosition: "top", prompt: "The hero sitting on a windowsill at night holding a small lantern, looking up thoughtfully at a big moon, cozy bedroom lit warmly." },
  { label: "Outfit change: space", orientation: "landscape", textPosition: "start", prompt: "The hero floating inside a friendly rocket cockpit, waving at the viewer, planets visible through the round window.", wardrobe: "a white and orange child-sized space suit with the helmet off so the face and hair are fully visible" },
  { label: "Wide shot, small figure", orientation: "landscape", textPosition: "bottom", prompt: "Wide shot of an enchanted forest with glowing mushrooms; the hero is small in the scene, walking across a mossy log bridge with a fox." },
  { label: "Back/three-quarter view", orientation: "portrait", textPosition: "bottom", prompt: "The hero seen from a three-quarter back view, kneeling to look into a tide pool with a starfish, then glancing back over the shoulder at the viewer with a smile." },
];

const Score = z.object({
  face: z.number().int().describe("1-5: face shape/features match"),
  skin_tone: z.number().int().describe("1-5"),
  hair: z.number().int().describe("1-5: colour, length, style, texture"),
  eyes: z.number().int().describe("1-5: colour and shape"),
  proportions: z.number().int().describe("1-5: age-appropriate, same apparent age"),
  outfit: z.number().int().describe("1-5: matches the expected outfit"),
  style: z.number().int().describe("1-5: same art style"),
  overall: z.number().int().describe("1-5: would a parent recognise the same character?"),
  has_text_artifacts: z.boolean(),
  notes: z.string(),
});

const dataUrl = (bytes: Uint8Array, mime = "image/png") => `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
const b64 = (res: { data?: Array<{ b64_json?: string | null }> | null }) => {
  const s = res.data?.[0]?.b64_json;
  if (!s) throw new Error("no image returned");
  return new Uint8Array(Buffer.from(s, "base64"));
};

async function main() {
  const run = new Date().toISOString().replace(/[:.]/g, "-");
  const out = join(process.cwd(), "poc-output", run);
  mkdirSync(out, { recursive: true });
  const log: Record<string, unknown> = { run, imageModel, textModel, quality, style: values.style, steps: [] };
  const step = (o: Record<string, unknown>) => {
    (log.steps as unknown[]).push(o);
    console.log(`• ${o.step}${o.ms ? ` (${o.ms} ms)` : ""}`);
  };

  // 1. Validate + moderate photos
  const inputs = photos.map((p) => {
    const bytes = new Uint8Array(readFileSync(p));
    const v = validateImage(bytes);
    if (!v.ok) fail(`${p}: ${v.reason}`);
    return { path: p, bytes, mime: v.mimeType };
  });
  let t = Date.now();
  const mod = await client.moderations.create({
    model: "omni-moderation-latest",
    input: inputs.map((i) => ({ type: "image_url" as const, image_url: { url: dataUrl(i.bytes, i.mime) } })),
  });
  if (mod.results.some((r) => r.flagged)) fail("a photo was flagged by moderation; it cannot be processed");
  step({ step: "photos validated + moderated", ms: Date.now() - t });

  // 2. Character reference
  let reference: Uint8Array;
  if (values.reference) {
    reference = new Uint8Array(readFileSync(values.reference));
    step({ step: `using approved reference ${values.reference}` });
  } else {
    t = Date.now();
    const res = await client.images.edit({
      model: imageModel,
      image: await Promise.all(inputs.map((i) => toFile(Buffer.from(i.bytes), basename(i.path), { type: i.mime }))),
      prompt: buildCharacterPrompt({ stylePrompt }),
      size: "1024x1536",
      quality,
      output_format: "png",
      ...(supportsFidelity ? { input_fidelity: "high" as const } : {}),
    });
    reference = b64(res);
    step({ step: "character generated", ms: Date.now() - t, usage: res.usage ?? null });
  }
  writeFileSync(join(out, "character.png"), reference);

  // 3. Character description (as production does)
  t = Date.now();
  const desc = await client.responses.parse({
    model: textModel,
    input: [{ role: "user", content: [
      { type: "input_text", text: "Describe this illustrated child character for an illustrator who must redraw them consistently: face shape, skin tone, hair colour/length/style, eye colour, eyebrows, distinctive features, body proportions, and the art style. 60-100 words, factual, no names, no clothing." },
      { type: "input_image", image_url: dataUrl(reference), detail: "high" },
    ] }],
    text: { format: zodTextFormat(z.object({ description: z.string() }), "d") },
    store: false,
  });
  const characterDescription = desc.output_parsed?.description ?? "";
  step({ step: "character described", ms: Date.now() - t });
  const defaultWardrobe = "a yellow t-shirt with a small star, blue denim overalls and red sneakers";

  // 4. Six scenes + automated consistency judgement
  const results = [];
  for (const [i, s] of SCENES.entries()) {
    t = Date.now();
    const wardrobe = s.wardrobe ?? defaultWardrobe;
    const prompt = buildScenePrompt({ characterDescription, wardrobe, stylePrompt, scenePrompt: s.prompt, orientation: s.orientation, textPosition: s.textPosition, language: "en", kind: "page" });
    const res = await client.images.edit({
      model: imageModel,
      image: [await toFile(Buffer.from(reference), "character.png", { type: "image/png" })],
      prompt,
      size: IMAGE_SIZE[s.orientation],
      quality,
      output_format: "png",
      ...(supportsFidelity ? { input_fidelity: "high" as const } : {}),
    });
    const img = b64(res);
    const file = `scene-${i + 1}.png`;
    writeFileSync(join(out, file), img);
    const genMs = Date.now() - t;

    const judge = await client.responses.parse({
      model: textModel,
      input: [{ role: "user", content: [
        { type: "input_text", text: `Image 1 is the approved character reference. Image 2 is a story illustration that should show the SAME character wearing: ${wardrobe}. Score consistency strictly (5 = indistinguishable, 3 = noticeably different but plausible, 1 = different child). Also report any visible text/letters in image 2.` },
        { type: "input_image", image_url: dataUrl(reference), detail: "high" },
        { type: "input_image", image_url: dataUrl(img), detail: "high" },
      ] }],
      text: { format: zodTextFormat(Score, "consistency") },
      store: false,
    });
    const score = judge.output_parsed;
    results.push({ ...s, file, prompt, genMs, usage: res.usage ?? null, score });
    step({ step: `scene ${i + 1}/6 "${s.label}" overall=${score?.overall ?? "?"}`, ms: Date.now() - t });
  }

  const overall = results.map((r) => r.score?.overall ?? 0);
  const summary = {
    mean_overall: +(overall.reduce((a, b) => a + b, 0) / overall.length).toFixed(2),
    min_overall: Math.min(...overall),
    scenes_with_text_artifacts: results.filter((r) => r.score?.has_text_artifacts).length,
  };
  writeFileSync(join(out, "results.json"), JSON.stringify({ ...log, characterDescription, summary, results }, null, 2));
  writeFileSync(join(out, "report.html"), report(results, summary, characterDescription, inputs.map((i) => ({ src: dataUrl(i.bytes, i.mime) }))));
  console.log(`\n✔ Done. Mean consistency ${summary.mean_overall}/5 (min ${summary.min_overall}).\n  Review: ${join(out, "report.html")}\n`);
}

function report(results: Array<{ label: string; file: string; orientation: string; score: z.infer<typeof Score> | null }>, summary: Record<string, number>, description: string, photos: Array<{ src: string }>) {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return `<!doctype html><meta charset="utf-8"><title>Character consistency POC</title>
<style>body{font-family:system-ui;margin:24px;background:#faf7f2}h1{margin:0 0 8px}.row{display:flex;gap:16px;flex-wrap:wrap}.card{background:#fff;border-radius:12px;padding:12px;box-shadow:0 2px 8px #0001;max-width:360px}img{max-width:100%;border-radius:8px;display:block}.s{font-size:13px;color:#444}</style>
<h1>Character consistency POC</h1>
<p>LOCAL REVIEW ONLY — contains the original photo(s). Do not share or commit.</p>
<p><b>Summary:</b> mean ${summary.mean_overall}/5 · min ${summary.min_overall}/5 · text artifacts in ${summary.scenes_with_text_artifacts} scene(s)</p>
<p class="s"><b>Character description:</b> ${esc(description)}</p>
<div class="row">${photos.map((p) => `<div class="card"><img src="${p.src}"><div class="s">Original photo</div></div>`).join("")}
<div class="card"><img src="character.png"><div class="s">Approved character reference</div></div></div>
<h2>Scenes</h2><div class="row">${results
    .map((r) => `<div class="card"><img src="${r.file}"><b>${esc(r.label)}</b> <span class="s">(${r.orientation})</span>
<div class="s">overall ${r.score?.overall} · face ${r.score?.face} · hair ${r.score?.hair} · skin ${r.score?.skin_tone} · eyes ${r.score?.eyes} · outfit ${r.score?.outfit} · style ${r.score?.style}${r.score?.has_text_artifacts ? " · ⚠ text in image" : ""}</div>
<div class="s">${esc(r.score?.notes ?? "")}</div></div>`)
    .join("")}</div>`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
