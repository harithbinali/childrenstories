"use client";
import { useState } from "react";
import { Button, Dialog, Input, Select, Tabs, Tag, Toast } from "@/components/storyling";

export function InteractiveDemos({ rtl }: { rtl: boolean }) {
  const [tab, setTab] = useState("recent");
  const [tags, setTags] = useState<string[]>(["space"]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(true);
  const toggle = (t: string) => setTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  return (
    <div style={{ display: "grid", gap: 28 }}>
      <Tabs label="Demo tabs" style={{ justifySelf: "start" }} value={tab} onChange={setTab} items={[{ id: "recent", label: rtl ? "الأحدث" : "Recent", icon: "clock" }, { id: "fav", label: rtl ? "المفضلة" : "Favourites", icon: "heart" }, { id: "all", label: rtl ? "الكل" : "All" }]} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[["space", "rocket-launch", "sky"], ["ocean", "fish", "mint"], ["dinosaurs", "paw-print", "tangerine"], ["bedtime", "moon-stars", "grape"]].map(([t, ic, tone]) => (
          <Tag key={t} icon={ic} tone={tone as "sky"} selected={tags.includes(t)} onClick={() => toggle(t)}>{t}</Tag>
        ))}
        <Tag icon="star" tone="cherry" selected onRemove={() => undefined}>removable</Tag>
      </div>
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
        <Input label="Child's first name" placeholder="Layla" iconStart="baby" hint="Only a first name or nickname." />
        <Input label="Email" placeholder="you@example.com" iconStart="envelope-simple" error="That email looks a little wobbly" defaultValue="hana@" />
        <Select label="Age range" options={["0–2", "3–5", "6–8", "9–12"]} iconStart="cake" />
        <Input label="Story idea" multiline placeholder="A sentence or two is plenty. Leave blank and we'll surprise you." />
        <Input label="Disabled" disabled placeholder="Not editable" />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Button onClick={() => setOpen(true)} iconStart="sparkle">Open dialog</Button>
        <Button variant="outline" onClick={() => setToast(true)}>Show toast</Button>
      </div>
      {toast && <Toast tone="mint" title="Story saved" message="Find it on Layla's bookshelf." onClose={() => setToast(false)} />}
      <Dialog open={open} onClose={() => setOpen(false)} icon="book-open-text" title="Your book is ready!" actions={<><Button variant="outline" onClick={() => setOpen(false)}>Later</Button><Button onClick={() => setOpen(false)} iconStart="book-open">Start reading</Button></>}>
        “Luna and the Lost Star” has 12 illustrated pages waiting.
      </Dialog>
    </div>
  );
}
