"use server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";

/** Saves the reader's position (RLS: own row, own book). Finishing marks the book as read. */
export async function saveReadingProgress(bookId: string, index: number, total: number): Promise<void> {
  const user = await requireUser();
  if (!Number.isInteger(index) || index < 0 || index >= total) return;
  const db = await createClient();
  const finished = index >= total - 1;
  await db.from("reading_progress").upsert(
    { user_id: user.id, book_id: bookId, last_page: index, completed_at: finished ? new Date().toISOString() : null },
    { onConflict: "user_id,book_id" },
  );
}
