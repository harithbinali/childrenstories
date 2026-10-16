"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, IconButton } from "@/components/storyling";
import { redrawIllustration, regenerateStory, toggleFavorite } from "@/lib/books/actions";

export function RedrawButton({ bookId, kind, pageNumber, label, busyLabel, errors, busy }: {
  bookId: string; kind: "page" | "front_cover" | "back_cover"; pageNumber?: number; label: string; busyLabel: string; errors: Record<string, string>; busy?: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <span style={{ display: "inline-grid", gap: 4, justifyItems: "center" }}>
      <Button variant="outline" size="sm" iconStart={busy || pending ? "spinner-gap" : "arrow-clockwise"} disabled={busy || pending}
        onClick={() => start(async () => {
          const r = await redrawIllustration(bookId, { kind, pageNumber });
          if (!r.ok) setError(errors[r.error] ?? errors.unknown); else router.refresh();
        })}>{busy || pending ? busyLabel : label}</Button>
      {error && <span role="alert" style={{ font: "700 12px var(--font-body)", color: "var(--cherry-600)", textAlign: "center" }}>{error}</span>}
    </span>
  );
}

export function FavoriteButton({ bookId, favorite, labels }: { bookId: string; favorite: boolean; labels: { on: string; off: string } }) {
  const [fav, setFav] = useState(favorite);
  const [pending, start] = useTransition();
  return (
    <IconButton icon="heart" label={fav ? labels.off : labels.on} variant={fav ? "cherry" : "outline"} disabled={pending} aria-pressed={fav}
      onClick={() => start(async () => { const next = !fav; setFav(next); const r = await toggleFavorite(bookId, next); if (!r.ok) setFav(!next); })} />
  );
}

export function RetryStoryButton({ bookId, label, errors }: { bookId: string; label: string; errors: Record<string, string> }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <span style={{ display: "grid", gap: 8 }}>
      <Button iconStart="arrow-clockwise" disabled={pending} onClick={() => start(async () => {
        const r = await regenerateStory(bookId);
        if (!r.ok) setError(errors[r.error] ?? errors.unknown); else router.refresh();
      })}>{label}</Button>
      {error && <span role="alert" style={{ color: "var(--cherry-600)", fontWeight: 700 }}>{error}</span>}
    </span>
  );
}
