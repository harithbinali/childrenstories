import Link from "next/link";
import { Icon } from "@/components/storyling";

/** Admin-managed promotional strip above the site header (Admin → Marketing content). */
export function PromoBanner({ text, href }: { text: string; href?: string }) {
  const inner = <><Icon name="sparkle" color="var(--ink-900)" />{text}{href && <Icon name="arrow-right" weight="bold" />}</>;
  const style = { display: "flex", gap: 8, alignItems: "center", justifyContent: "center", padding: "10px 16px", background: "var(--sun-400)", color: "var(--ink-900)", font: "700 15px/1.3 var(--font-body)", textAlign: "center" as const, textDecoration: "none" };
  return href ? <Link href={href} style={style}>{inner}</Link> : <div style={style}>{inner}</div>;
}
