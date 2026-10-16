import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { LOCALE_COOKIE, isLocale, negotiateLocale } from "@/i18n/config";

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];

/**
 * 1. Locale: public URLs carry no locale prefix (/dashboard). Requests are
 *    rewritten to /{locale}/... using the language cookie, then the
 *    browser's Accept-Language. Explicit /ar/... URLs also work.
 * 2. Refreshes the Supabase session cookie on the same response.
 * 3. Optimistic redirect to /login for signed-out visitors. Real
 *    authorization happens in lib/auth/guards.ts and in RLS — never only here.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1];
  const prefixed = isLocale(first);
  const locale = prefixed ? first : (() => {
    const c = request.cookies.get(LOCALE_COOKIE)?.value;
    return isLocale(c) ? c : negotiateLocale(request.headers.get("accept-language"));
  })();
  const barePath = prefixed ? pathname.slice(first.length + 1) || "/" : pathname;

  const makeResponse = () => {
    if (prefixed) return NextResponse.next({ request });
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url, { request });
  };
  let response = makeResponse();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let signedIn = false;
  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet, headers) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = makeResponse();
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    });
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims?.sub);
  }

  if (!signedIn && PROTECTED_PREFIXES.some((p) => barePath === p || barePath.startsWith(`${p}/`))) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(barePath + search)}`;
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf|ico|txt|xml)$).*)"],
};
