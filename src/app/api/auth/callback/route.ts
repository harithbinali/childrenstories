import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/actions";

/**
 * Landing point for Supabase email links (verification, password recovery,
 * magic links) and OAuth. Supports both the PKCE `code` flow and
 * `token_hash` links from custom email templates.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const origin = url.origin;
  const next = await safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing code") };

  if (error) {
    const dest = next === "/reset-password" ? "/forgot-password" : "/login";
    return NextResponse.redirect(`${origin}${dest}?error=link_expired`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
