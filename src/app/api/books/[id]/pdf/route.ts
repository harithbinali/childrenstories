import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/storage";

/** Entitled owners only: redirects to a 5-minute signed download URL. */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/books/[id]/pdf">) {
  const { id } = await params;
  const db = await createClient();
  const { data: claims } = await db.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.redirect(new URL(`/login?next=/dashboard/books/${id}`, request.url));

  const [{ data: book }, { data: entitled }] = await Promise.all([
    db.from("books").select("id, title, pdf_path").eq("id", id).maybeSingle(), // RLS: owner only
    db.rpc("has_book_entitlement", { p_book_id: id }),
  ]);
  if (!book) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!entitled || !book.pdf_path) return NextResponse.json({ error: "not available" }, { status: 403 });

  const safeName = (book.title ?? "storybook").replace(/[^\p{L}\p{N} _-]+/gu, "").trim().slice(0, 80) || "storybook";
  const url = await signedUrl("book-pdfs", book.pdf_path, 300, `${safeName}.pdf`);
  return NextResponse.redirect(url);
}
