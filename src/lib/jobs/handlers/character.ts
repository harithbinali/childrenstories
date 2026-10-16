import "@/lib/server-guard";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { describeCharacter, generateCharacterReference, generateSceneIllustration, type InputImage } from "@/lib/ai/images";
import { getObject, paths, putObject } from "@/lib/storage";
import type { Orientation } from "@/lib/book/layout-spec";
import { PermanentJobError, type JobHandler } from "../types";

/** Child photo(s) -> illustrated reference for a character. */
export const characterGenerate: JobHandler = async ({ job, progress }) => {
  const db = createAdminClient();
  const characterId = job.character_id;
  if (!characterId || !job.owner_id) throw new PermanentJobError("character job without character/owner");

  const { data: character } = await db
    .from("characters")
    .select("id, owner_id, child_id, correction_notes, illustration_styles(prompt_template), child_profiles(appearance_notes)")
    .eq("id", characterId)
    .single();
  if (!character || character.owner_id !== job.owner_id) throw new PermanentJobError("character not found");
  const style = character.illustration_styles as unknown as { prompt_template: string };
  const child = character.child_profiles as unknown as { appearance_notes: string | null };

  const photoIds = (job.payload.photo_ids as string[] | undefined) ?? null;
  let q = db.from("child_photos").select("id, storage_path, mime_type").eq("child_id", character.child_id).eq("owner_id", job.owner_id);
  if (photoIds?.length) q = q.in("id", photoIds);
  const { data: photos } = await q.order("created_at", { ascending: false }).limit(3);
  if (!photos?.length) throw new PermanentJobError("no photos available for this child (they may have been deleted)");

  await progress("reading_photos", 10);
  const inputs: InputImage[] = await Promise.all(
    photos.map(async (p) => ({ bytes: await getObject("child-photos", p.storage_path), mimeType: p.mime_type, name: `photo-${p.id}.${p.mime_type.split("/")[1]}` })),
  );

  await progress("drawing_character", 25);
  const ctx = { userId: job.owner_id, characterId, jobId: job.id };
  const gen = await generateCharacterReference(
    {
      photos: inputs,
      stylePrompt: style.prompt_template,
      corrections: (job.payload.corrections as string | undefined) ?? character.correction_notes,
      appearanceNotes: child?.appearance_notes,
      quality: "preview",
    },
    ctx,
  );

  await progress("saving", 80);
  const refId = randomUUID();
  const storagePath = paths.characterRef(job.owner_id, characterId, refId);
  await putObject("character-refs", storagePath, gen.image, "image/png");
  const [w, h] = gen.size.split("x").map(Number);
  const { error: refErr } = await db.from("character_references").insert({
    id: refId, character_id: characterId, owner_id: job.owner_id, kind: "full_body",
    storage_path: storagePath, prompt: gen.prompt, model: gen.model, width: w, height: h, generation_job_id: job.id,
  });
  if (refErr) throw new Error(refErr.message);

  // The description strengthens scene consistency; failure here is non-fatal
  // (it is retried when the parent approves the character).
  let description: string | null = null;
  try {
    description = await describeCharacter({ bytes: gen.image, mimeType: "image/png", name: "ref.png" }, ctx);
  } catch (e) {
    console.warn("[character] description failed", e instanceof Error ? e.message : e);
  }

  const { data: current } = await db.from("characters").select("generation_count").eq("id", characterId).single();
  await db
    .from("characters")
    .update({
      status: "ready",
      generation_count: (current?.generation_count ?? 0) + 1,
      ...(description ? { visual_description: description } : {}),
      latest_reference_id: refId,
    })
    .eq("id", characterId);

  return { reference_id: refId, cost_usd: gen.costUsd };
};

/**
 * Renders a test scene with a character reference — used for the
 * character-consistency proof of concept and for "preview in a scene".
 */
export const sceneTest: JobHandler = async ({ job, progress }) => {
  const db = createAdminClient();
  const refId = job.payload.reference_id as string;
  const scene = String(job.payload.scene_prompt ?? "");
  const orientation = (job.payload.orientation as Orientation) ?? "portrait";
  if (!job.owner_id || !job.character_id || !refId || !scene) throw new PermanentJobError("invalid scene_test payload");

  const { data: ref } = await db.from("character_references").select("storage_path, owner_id").eq("id", refId).single();
  const { data: character } = await db
    .from("characters")
    .select("visual_description, illustration_styles(prompt_template)")
    .eq("id", job.character_id)
    .single();
  if (!ref || ref.owner_id !== job.owner_id || !character) throw new PermanentJobError("reference not found");

  await progress("drawing_scene", 20);
  const gen = await generateSceneIllustration(
    {
      reference: { bytes: await getObject("character-refs", ref.storage_path), mimeType: "image/png", name: "reference.png" },
      characterDescription: character.visual_description ?? "",
      wardrobe: String(job.payload.wardrobe ?? "a comfortable everyday outfit"),
      stylePrompt: (character.illustration_styles as unknown as { prompt_template: string }).prompt_template,
      scenePrompt: scene,
      orientation,
      textPosition: orientation === "portrait" ? "bottom" : "end",
      language: "en",
      quality: "preview",
      kind: "page",
    },
    { userId: job.owner_id, characterId: job.character_id, jobId: job.id },
  );

  const id = randomUUID();
  const storagePath = paths.characterRef(job.owner_id, job.character_id, id);
  await putObject("character-refs", storagePath, gen.image, "image/png");
  const [w, h] = gen.size.split("x").map(Number);
  await db.from("character_references").insert({
    id, character_id: job.character_id, owner_id: job.owner_id, kind: "scene_test",
    storage_path: storagePath, prompt: gen.prompt, model: gen.model, width: w, height: h, generation_job_id: job.id,
  });
  return { scene_reference_id: id, cost_usd: gen.costUsd };
};
