"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertWithinLimits } from "@/lib/limits/check";
import { enqueueJob } from "@/lib/jobs/enqueue";
import { moderate } from "@/lib/ai/moderation";
import { describeCharacter } from "@/lib/ai/images";
import { getObject, removeObjects } from "@/lib/storage";
import { hasEnv } from "@/lib/env";
import { fail, ok, run, type ActionResult } from "@/lib/actions/result";

const Corrections = z.string().trim().max(500).optional().transform((v) => v || null);

async function correctionsSafe(text: string | null, userId: string) {
  if (!text) return ok(true as const);
  if (!hasEnv("OPENAI_API_KEY")) return fail("moderation_unavailable");
  return (await moderate({ text }, { userId })).flagged ? fail("flagged") : ok(true as const);
}

async function queueGeneration(characterId: string, ownerId: string, attempt: number, corrections: string | null) {
  return enqueueJob({
    type: "character_generate",
    ownerId,
    characterId,
    payload: { corrections },
    idempotencyKey: `character:${characterId}:${attempt}`,
    priority: 3,
  });
}

/** Creates a character for a child (needs at least one photo) and starts drawing it. */
export async function createCharacter(_: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const user = await requireUser();
    const input = z.object({ child_id: z.uuid(), style_id: z.uuid(), name: z.string().trim().min(1).max(60), corrections: Corrections })
      .safeParse({ child_id: form.get("child_id"), style_id: form.get("style_id"), name: form.get("name"), corrections: form.get("corrections") ?? undefined });
    if (!input.success) return fail("invalid_input");

    const db = await createClient();
    const [{ data: child }, { count: photos }, { data: style }] = await Promise.all([
      db.from("child_profiles").select("id").eq("id", input.data.child_id).maybeSingle(),
      db.from("child_photos").select("id", { count: "exact", head: true }).eq("child_id", input.data.child_id),
      db.from("illustration_styles").select("id").eq("id", input.data.style_id).eq("is_active", true).maybeSingle(),
    ]);
    if (!child || !style) return fail("not_found");
    if (!photos) return fail("wrong_state");
    const safe = await correctionsSafe(input.data.corrections, user.id);
    if (!safe.ok) return safe;
    await assertWithinLimits(user.id, { kind: "character" });

    const admin = createAdminClient();
    const { data: character, error } = await admin.from("characters").insert({
      owner_id: user.id, child_id: input.data.child_id, style_id: input.data.style_id, name: input.data.name,
      correction_notes: input.data.corrections, status: "generating",
    }).select("id").single();
    if (error || !character) throw new Error(error?.message);
    await queueGeneration(character.id, user.id, 1, input.data.corrections);
    revalidatePath("/dashboard", "layout");
    return ok({ id: character.id });
  });
}

/** Draws a new version, optionally in another style or with the parent's corrections. */
export async function regenerateCharacter(characterId: string, _: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const user = await requireUser();
    const input = z.object({ style_id: z.uuid().optional(), corrections: Corrections })
      .safeParse({ style_id: form.get("style_id") || undefined, corrections: form.get("corrections") ?? undefined });
    if (!input.success) return fail("invalid_input");
    const db = await createClient();
    const { data: character } = await db.from("characters").select("id, status, generation_count").eq("id", characterId).maybeSingle();
    if (!character) return fail("not_found");
    if (character.status === "generating") return fail("wrong_state");
    const safe = await correctionsSafe(input.data.corrections, user.id);
    if (!safe.ok) return safe;
    await assertWithinLimits(user.id, { kind: "character" });

    await createAdminClient().from("characters").update({
      status: "generating", correction_notes: input.data.corrections,
      ...(input.data.style_id ? { style_id: input.data.style_id } : {}),
    }).eq("id", characterId);
    await queueGeneration(characterId, user.id, character.generation_count + 1, input.data.corrections);
    revalidatePath(`/dashboard/characters/${characterId}`);
    return ok({ id: characterId });
  });
}

/** Approves one of the character's generated references for use in books. */
export async function approveCharacter(characterId: string, referenceId: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const user = await requireUser();
    const db = await createClient();
    const [{ data: character }, { data: ref }] = await Promise.all([
      db.from("characters").select("id, status, visual_description").eq("id", characterId).maybeSingle(),
      db.from("character_references").select("id, storage_path, kind").eq("id", referenceId).eq("character_id", characterId).maybeSingle(),
    ]);
    if (!character || !ref || ref.kind === "scene_test") return fail("not_found");
    if (character.status === "generating") return fail("wrong_state");

    let description = character.visual_description;
    if (!description && hasEnv("OPENAI_API_KEY")) {
      description = await describeCharacter({ bytes: await getObject("character-refs", ref.storage_path), mimeType: "image/png", name: "ref.png" }, { userId: user.id, characterId })
        .catch(() => null);
    }
    await createAdminClient().from("characters").update({
      status: "approved", approved_reference_id: ref.id, approved_at: new Date().toISOString(),
      ...(description ? { visual_description: description } : {}),
    }).eq("id", characterId);
    revalidatePath("/dashboard", "layout");
    return ok(undefined);
  });
}

export async function deleteCharacter(characterId: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    await requireUser();
    const db = await createClient();
    const { data: character } = await db.from("characters").select("id").eq("id", characterId).maybeSingle();
    if (!character) return fail("not_found");
    const admin = createAdminClient();
    const { data: refs } = await admin.from("character_references").select("storage_path").eq("character_id", characterId);
    await admin.from("characters").delete().eq("id", characterId);
    await removeObjects("character-refs", (refs ?? []).map((r) => r.storage_path));
    revalidatePath("/dashboard", "layout");
    return ok(undefined);
  });
}
