"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Checkbox, Icon } from "@/components/storyling";
import { FormError } from "@/components/dashboard/ui/FormError";
import { uploadChildPhoto } from "@/lib/children/actions";

const MAX_EDGE = 2048;
const MAX_BYTES = 3.8 * 1024 * 1024; // stays under Vercel's 4.5 MB request limit

/**
 * Downscales and re-encodes in the browser before upload: keeps requests
 * small and drops embedded metadata (GPS etc.). The server re-validates and
 * strips metadata again — the browser is never trusted.
 */
async function prepare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const q of [0.9, 0.82, 0.72]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new Error("image_too_large");
}

export function PhotoUploader({ childId, labels, errors, disabled }: {
  childId: string; disabled?: boolean; errors: Record<string, string>;
  labels: { add: string; choose: string; uploading: string; guardian: string; tips: readonly string[] };
}) {
  const input = useRef<HTMLInputElement>(null);
  const [guardian, setGuardian] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    start(async () => {
      try {
        const blob = await prepare(file);
        const form = new FormData();
        form.set("photo", new File([blob], "photo.jpg", { type: "image/jpeg" }));
        form.set("guardian", guardian ? "on" : "");
        const r = await uploadChildPhoto(childId, undefined, form);
        if (!r.ok) setError(errors[r.error] ?? errors.unknown);
        else router.refresh();
      } catch (e) {
        setError(errors[e instanceof Error && e.message === "image_too_large" ? "image_too_large" : "unsupported_image"]);
      } finally {
        if (input.current) input.current.value = "";
      }
    });
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <ul style={{ margin: 0, paddingInlineStart: 0, listStyle: "none", display: "grid", gap: 6 }}>
        {labels.tips.map((t) => (
          <li key={t} style={{ display: "flex", gap: 8, alignItems: "center", font: "600 14px var(--font-body)", color: "var(--ink-700)" }}><Icon name="check-circle" color="var(--mint-500)" />{t}</li>
        ))}
      </ul>
      <Checkbox checked={guardian} onChange={(e) => setGuardian(e.target.checked)} label={labels.guardian} />
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <div>
        <Button iconStart={pending ? "spinner-gap" : "camera"} disabled={!guardian || pending || disabled} onClick={() => input.current?.click()}>
          {pending ? labels.uploading : labels.add}
        </Button>
      </div>
      <FormError message={error} />
    </div>
  );
}
