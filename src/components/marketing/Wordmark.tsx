import Link from "next/link";
import { Icon } from "@/components/storyling";

/** Working-name wordmark (Fredoka 700) — no logo mark until the brand supplies one. */
export function Wordmark({ name, size = 30, color = "var(--blue-600)", href = "/" }: { name: string; size?: number; color?: string; href?: string }) {
  return (
    <Link href={href} style={{ font: `700 ${size}px/1 var(--font-display)`, color, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Icon name="star" className="sl-twinkle" color="var(--sun-400)" size={size * 0.86} />
      {name}
    </Link>
  );
}
