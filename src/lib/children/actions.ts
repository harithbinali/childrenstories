"use server";
import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { audit } from "@/lib/auth/audit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { moderate } from "@/lib/ai/moderation";
import { hasEnv } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { paths, putObject, removeObjects } from "@/lib/storage";
import { stripMetadata } from "@/lib/uploads/strip-metadata";
import { validateImage } from "@/lib/uploads/validate-image";
import { fail, ok, run, type ActionResult } from "@/lib/actions/result";

const MAX_PHOTOS_PER_CHILD = 3;

const ChildInput = z.object({
  display_name: z.string().trim().min(1).max(40),
  age_years: z.coerce.number().int().min(0).max(14).optional().or(z.literal("").transform(() => undefined)),
  interests: z.array(z.string().trim().min(1).max(30)).max(12),
  preferred_language: z.enum(["en", "ar"]),
  appearance_notes: z.string().trim().max(500).optional().transform((v) => v || null),
});

function parseChild(form: FormData) {
  return ChildInput.safeParse({
    display_name: form.get("display_name"),
    age_years: form.get("age_years") ?? undefined,
    interests: String(form.get("interests") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    preferred_language: form.get("preferred_language") ?? "en",
    appearance_notes: form.get("appearance_notes") ?? undefined,
  });
}

/** Free text that later reaches AI prompts is moderated when it's saved. */
async function textIsSafe(text: string | null, userId: string): Promise<ActionResult<true>> {
  if (!text) return ok(true);
  if (!hasEnv("OPENAI_API_KEY")) return fail("moderation_unavailable");
  const v = await moderate({ text }, { userId });
  return v.flagged ? fail("flagged") : ok(true);
}

export async function createChild(_: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const user = await requireUser();
    const input = parseChild(form);
    if (!input.success) return fail("invalid_input");
    const safe = await textIsSafe([input.data.appearance_notes, ...input.data.interests].filter(Boolean).join("\n") || null, user.id);
    if (!safe.ok) return safe;
    const db = await createClient();
    const { data, error } = await db.from("child_profiles").insert({ ...input.data, owner_id: user.id }).select("id").single();
    if (error || !data) throw new Error(error?.message);
    revalidatePath("/dashboard", "layout");
    return ok({ id: data.id });
  });
}

export async function updateChild(childId: string, _: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const user = await requireUser();
    const input = parseChild(form);
    if (!input.success) return fail("invalid_input");
    const safe = await textIsSafe([input.data.appearance_notes, ...input.data.interests].filter(Boolean).join("\n") || null, user.id);
    if (!safe.ok) return safe;
    const db = await createClient();
    const { data, error } = await db.from("child_profiles").update(input.data).eq("id", childId).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return fail("not_found"); // RLS hides other parents' children
    revalidatePath("/dashboard", "layout");
    return ok({ id: data.id });
  });
}

/** Deletes the child, their photos (rows + files) and characters. Books are kept (child unlinked). */
export async function deleteChild(childId: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const user = await requireUser();
    const db = await createClient();
    const { data: child } = await db.from("child_profiles").select("id").eq("id", childId).maybeSingle();
    if (!child) return fail("not_found");
    const admin = createAdminClient();
    const [{ data: photos }, { data: refs }] = await Promise.all([
      admin.from("child_photos").select("storage_path").eq("child_id", childId).eq("owner_id", user.id),
      admin.from("character_references").select("storage_path, characters!inner(child_id)").eq("characters.child_id", childId).eq("owner_id", user.id),
    ]);
    await removeObjects("child-photos", (photos ?? []).map((p) => p.storage_path));
    await removeObjects("character-refs", (refs ?? []).map((r) => r.storage_path));
    const { error } = await db.from("child_profiles").delete().eq("id", childId);
    if (error) throw new Error(error.message);
    revalidatePath("/dashboard", "layout");
    return ok(undefined);
  });
}

/**
 * Private photo upload. The browser downscales and re-encodes first; the
 * server still validates the real format, strips metadata (GPS etc.),
 * de-duplicates, runs a safety check, and schedules retention deletion.
 */
export async function uploadChildPhoto(childId: string, _: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const user = await requireUser();
    if (form.get("guardian") !== "on") return fail("guardian_required");
    await enforceRateLimit(`photo-upload:${user.id}`, 20, 3600);

    const db = await createClient();
    const { data: child } = await db.from("child_profiles").select("id").eq("id", childId).maybeSingle();
    if (!child) return fail("not_found");

    const file = form.get("photo");
    if (!(file instanceof File)) return fail("invalid_input");
    const raw = new Uint8Array(await file.arrayBuffer());
    const v = validateImage(raw);
    if (!v.ok) return fail(v.reason === "too_large" ? "image_too_large" : v.reason === "dimensions_too_small" || v.reason === "too_small" ? "image_too_small" : "unsupported_image");
    const clean = stripMetadata(raw, v.mimeType);
    const sha256 = createHash("sha256").update(clean).digest("hex");

    const admin = createAdminClient();
    const { count } = await admin.from("child_photos").select("id", { count: "exact", head: true }).eq("child_id", childId);
    if ((count ?? 0) >= MAX_PHOTOS_PER_CHILD) return fail("too_many_photos");
    const { data: dup } = await admin.from("child_photos").select("id").eq("child_id", childId).eq("sha256", sha256).maybeSingle();
    if (dup) return fail("duplicate_photo");

    // Fail closed: a photo is never stored without passing the safety check.
    if (!hasEnv("OPENAI_API_KEY")) return fail("moderation_unavailable");
    const verdict = await moderate({ imageDataUrls: [`data:${v.mimeType};base64,${Buffer.from(clean).toString("base64")}`] }, { userId: user.id });
    if (verdict.flagged) {
      await audit(user.id, "child_photo.rejected_by_moderation", { table: "child_profiles", id: childId }, { categories: verdict.categories });
      return fail("flagged");
    }

    const settings = await getSettings({ "retention.child_photo_days": 30 });
    const days = Number(settings["retention.child_photo_days"]);
    const id = randomUUID();
    const storagePath = paths.childPhoto(user.id, childId, id, v.extension);
    await putObject("child-photos", storagePath, clean, v.mimeType);
    const now = new Date();
    const { error } = await admin.from("child_photos").insert({
      id, child_id: childId, owner_id: user.id, storage_path: storagePath, mime_type: v.mimeType, size_bytes: clean.length,
      width: v.width, height: v.height, sha256, guardian_attested_at: now.toISOString(),
      delete_after: days > 0 ? new Date(now.getTime() + days * 86400_000).toISOString() : null,
    });
    if (error) {
      await removeObjects("child-photos", [storagePath]);
      throw new Error(error.message);
    }
    await admin.from("profiles").update({ guardian_attested_at: now.toISOString() }).eq("id", user.id);
    revalidatePath(`/dashboard/children/${childId}`);
    return ok({ id });
  });
}

export async function deleteChildPhoto(photoId: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    await requireUser();
    const db = await createClient();
    const { data: photo } = await db.from("child_photos").select("id, child_id, storage_path").eq("id", photoId).maybeSingle();
    if (!photo) return fail("not_found");
    await removeObjects("child-photos", [photo.storage_path]);
    const { error } = await db.from("child_photos").delete().eq("id", photoId);
    if (error) throw new Error(error.message);
    revalidatePath(`/dashboard/children/${photo.child_id}`);
    return ok(undefined);
  });
}
