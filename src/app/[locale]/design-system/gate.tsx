import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getSessionUser, isStaff } from "@/lib/auth/guards";

/** Internal route: open in development; in production staff only (or when features.design_system_public is on). */
export async function Gate({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production" && process.env.DESIGN_SYSTEM_PUBLIC !== "true") {
    const user = await getSessionUser().catch(() => null);
    if (!isStaff(user)) notFound();
  }
  return <>{children}</>;
}

