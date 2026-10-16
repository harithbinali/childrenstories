import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getSessionUser, isStaff } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";

/** Internal route: open in development; in production staff only (or when features.design_system_public is on). */
export async function Gate({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production" && process.env.DESIGN_SYSTEM_PUBLIC !== "true" && !(await designSystemPublic())) {
    const user = await getSessionUser().catch(() => null);
    if (!isStaff(user)) notFound();
  }
  return <>{children}</>;
}


async function designSystemPublic(): Promise<boolean> {
  try {
    return (await getSettings({ "features.design_system_public": false }))["features.design_system_public"] === true;
  } catch {
    return false; // not configured: stay private
  }
}
