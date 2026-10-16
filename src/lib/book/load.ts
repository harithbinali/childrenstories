import "@/lib/server-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgeRange, Language, Orientation, TextPosition } from "./layout-spec";

export type BookBundle = {
  book: {
    id: string;
    owner_id: string;
    title: string | null;
    language: Language;
    age_range: AgeRange;
    page_count: 8 | 12 | 16;
    orientation: Orientation;
    status: string;
    dedication: string | null;
    lesson: string | null;
    custom_idea: string | null;
    current_version_id: string | null;
    child_id: string | null;
    character_id: string | null;
  };
  child: { display_name: string; interests: string[]; appearance_notes: string | null } | null;
  character: { id: string; status: string; visual_description: string | null; approved_reference_id: string | null; style_id: string } | null;
  reference: { storage_path: string } | null;
  style: { name_en: string; prompt_template: string } | null;
  theme: { name_en: string; prompt_guidance: string; is_custom: boolean } | null;
  version: { id: string; version_number: number; title: string; outline: { beats?: string[]; wardrobe?: string }; cover_concept: string | null } | null;
  pages: Array<{ id: string; page_number: number; text: string; scene_description: string; illustration_prompt: string; text_position: TextPosition }>;
};

/** Loads everything needed to write, illustrate or render a book (service role). */
export async function loadBookBundle(bookId: string): Promise<BookBundle> {
  const db = createAdminClient();
  const { data: book, error } = await db
    .from("books")
    .select("id, owner_id, title, language, age_range, page_count, orientation, status, dedication, lesson, custom_idea, current_version_id, child_id, character_id, theme_id, style_id")
    .eq("id", bookId)
    .single();
  if (error || !book) throw new Error(`book ${bookId} not found`);

  const [child, character, theme, version, pages] = await Promise.all([
    book.child_id ? db.from("child_profiles").select("display_name, interests, appearance_notes").eq("id", book.child_id).single() : null,
    book.character_id ? db.from("characters").select("id, status, visual_description, approved_reference_id, style_id").eq("id", book.character_id).single() : null,
    book.theme_id ? db.from("story_themes").select("name_en, prompt_guidance, is_custom").eq("id", book.theme_id).single() : null,
    book.current_version_id ? db.from("book_versions").select("id, version_number, title, outline, cover_concept").eq("id", book.current_version_id).single() : null,
    book.current_version_id
      ? db.from("book_pages").select("id, page_number, text, scene_description, illustration_prompt, text_position").eq("version_id", book.current_version_id).order("page_number")
      : null,
  ]);

  const styleId = book.style_id ?? character?.data?.style_id;
  const [style, reference] = await Promise.all([
    styleId ? db.from("illustration_styles").select("name_en, prompt_template").eq("id", styleId).single() : null,
    character?.data?.approved_reference_id
      ? db.from("character_references").select("storage_path").eq("id", character.data.approved_reference_id).single()
      : null,
  ]);

  return {
    book: book as BookBundle["book"],
    child: child?.data ?? null,
    character: character?.data ?? null,
    reference: reference?.data ?? null,
    style: style?.data ?? null,
    theme: theme?.data ?? null,
    version: (version?.data as BookBundle["version"]) ?? null,
    pages: (pages?.data as BookBundle["pages"]) ?? [],
  };
}
