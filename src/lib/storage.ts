import "@/lib/server-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export type PrivateBucket = "child-photos" | "character-refs" | "illustrations" | "book-pdfs";

/** Object paths always start with the owner's user id (enforced by storage RLS). */
export const paths = {
  childPhoto: (owner: string, child: string, id: string, ext: string) => `${owner}/${child}/${id}.${ext}`,
  characterRef: (owner: string, character: string, id: string) => `${owner}/${character}/${id}.png`,
  illustration: (owner: string, book: string, id: string) => `${owner}/${book}/${id}.png`,
  bookPdf: (owner: string, book: string, version: number) => `${owner}/${book}/storybook-v${version}.pdf`,
};

export async function putObject(bucket: PrivateBucket, path: string, bytes: Uint8Array, contentType: string) {
  const { error } = await createAdminClient().storage.from(bucket).upload(path, bytes, { contentType, upsert: false, cacheControl: "31536000" });
  if (error) throw new Error(`storage upload failed (${bucket}): ${error.message}`);
}

export async function getObject(bucket: PrivateBucket, path: string): Promise<Uint8Array> {
  const { data, error } = await createAdminClient().storage.from(bucket).download(path);
  if (error || !data) throw new Error(`storage download failed (${bucket}): ${error?.message ?? "no data"}`);
  return new Uint8Array(await data.arrayBuffer());
}

/**
 * Short-lived signed URL. Callers MUST have verified ownership/entitlement
 * first; this uses the service role.
 */
export async function signedUrl(bucket: PrivateBucket, path: string, expiresInSeconds = 600, download?: string): Promise<string> {
  const { data, error } = await createAdminClient().storage.from(bucket).createSignedUrl(path, expiresInSeconds, download ? { download } : undefined);
  if (error || !data) throw new Error(`could not sign URL: ${error?.message}`);
  return data.signedUrl;
}

export async function signedUrls(bucket: PrivateBucket, list: string[], expiresInSeconds = 600): Promise<Map<string, string>> {
  if (!list.length) return new Map();
  const { data, error } = await createAdminClient().storage.from(bucket).createSignedUrls(list, expiresInSeconds);
  if (error || !data) throw new Error(`could not sign URLs: ${error?.message}`);
  const out = new Map<string, string>();
  for (const d of data) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  return out;
}

export async function removeObjects(bucket: PrivateBucket, list: string[]) {
  if (!list.length) return;
  const { error } = await createAdminClient().storage.from(bucket).remove(list);
  if (error) throw new Error(`storage delete failed (${bucket}): ${error.message}`);
}
