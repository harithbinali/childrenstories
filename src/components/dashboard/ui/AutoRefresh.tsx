"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-renders the server page every few seconds while background work is running. */
export function AutoRefresh({ active, intervalMs = 4000 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, router]);
  return null;
}
