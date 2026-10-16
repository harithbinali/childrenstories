"use client";
/** Time-of-day greeting in the parent's own timezone (server time would be wrong). */
export function Greeting({ labels, name }: { labels: { morning: string; afternoon: string; evening: string }; name: string | null }) {
  const h = new Date().getHours();
  const g = h < 12 ? labels.morning : h < 18 ? labels.afternoon : labels.evening;
  return <span suppressHydrationWarning>{name ? `${g}, ${name}` : g}</span>;
}
