"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button, IconButton } from "@/components/storyling";

export function MobileMenu({ links, cta, ctaHref, login, menuLabel, closeLabel }: {
  links: Array<{ href: string; label: string }>; cta: string; ctaHref: string; login: string; menuLabel: string; closeLabel: string;
}) {
  // The menu belongs to the page it was opened on, so navigating closes it.
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (v: boolean) => setOpenOn(v ? pathname : null);
  return (
    <>
      <IconButton icon={open ? "x" : "list"} label={open ? closeLabel : menuLabel} size="sm" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)} />
      {open && (
        <div id="mobile-menu" className="sl-wrap sl-pop-in" style={{ position: "absolute", insetInline: 0, top: "100%", display: "grid", gap: 6, paddingBlock: 14, background: "rgba(238,245,255,.96)", backdropFilter: "blur(var(--blur-glass))" }}>
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} style={{ padding: 14, borderRadius: 18, background: "#fff", font: "600 18px var(--font-display)", color: "var(--ink-900)", textDecoration: "none" }}>{l.label}</a>
          ))}
          <Button variant="outline" block href="/login">{login}</Button>
          <Button block href={ctaHref} iconStart="magic-wand">{cta}</Button>
        </div>
      )}
    </>
  );
}
