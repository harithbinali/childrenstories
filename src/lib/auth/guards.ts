import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "parent" | "staff" | "admin";

export type SessionUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  locale: "en" | "ar";
  status: "active" | "suspended" | "deletion_requested" | "deleted";
  roles: AppRole[];
  guardianAttestedAt: string | null;
};

/**
 * Data Access Layer entry point. Verifies the JWT (getClaims validates the
 * signature) and loads profile + roles once per request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) return null;

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("display_name, locale, status, guardian_attested_at").eq("id", sub).single(),
    supabase.from("user_roles").select("role").eq("user_id", sub),
  ]);
  if (!profile) return null;

  return {
    id: sub,
    email: (data.claims.email as string | undefined) ?? null,
    displayName: profile.display_name,
    locale: profile.locale,
    status: profile.status,
    roles: (roles ?? []).map((r) => r.role as AppRole),
    guardianAttestedAt: profile.guardian_attested_at,
  };
});

/** Signed-in, active parent (or staff). Redirects to login otherwise. */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  if (user.status === "suspended") redirect("/account-suspended");
  if (user.status !== "active") redirect("/login?reason=inactive");
  return user;
}

export function isStaff(user: SessionUser | null): boolean {
  return Boolean(user?.roles.some((r) => r === "staff" || r === "admin"));
}

export function isAdmin(user: SessionUser | null): boolean {
  return Boolean(user?.roles.includes("admin"));
}

/** Admin area: hide its existence from non-staff with a 404. */
export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (!isStaff(user)) notFound();
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (!isAdmin(user)) notFound();
  return user;
}
