import type { CSSProperties, ReactNode } from "react";

const T = {
  sun: ["var(--sun-400)", "var(--sun-500)"], mint: ["var(--mint-400)", "var(--mint-500)"], sky: ["var(--blue-400)", "var(--blue-500)"],
  bubble: ["var(--bubble-400)", "var(--bubble-500)"], grape: ["var(--grape-400)", "var(--grape-500)"],
} as const;

export function Progress({ value = 0, max = 100, tone = "sun", label, showValue, size = "md", striped = true, style }: {
  value?: number; max?: number; tone?: keyof typeof T; label?: ReactNode; showValue?: boolean; size?: "sm" | "md"; striped?: boolean; style?: CSSProperties;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const t = T[tone] ?? T.sun;
  const h = size === "sm" ? 10 : 18;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {(label || showValue) && (
        <div style={{ display: "flex", justifyContent: "space-between", font: "700 14px/1 var(--font-body)", color: "var(--ink-700)" }}>
          <span>{label}</span>
          {showValue && <span>{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={typeof label === "string" ? label : undefined}
        style={{ height: h, borderRadius: 999, background: "var(--paper-3)", boxShadow: "inset 0 2px 0 rgba(27,36,87,.08)", overflow: "hidden" }}
      >
        <div
          style={{
            height: "100%", width: `${pct}%`, borderRadius: 999,
            background: striped ? `repeating-linear-gradient(-45deg, ${t[0]} 0 7px, ${t[1]} 7px 14px)` : t[1],
            backgroundSize: "28px 100%", animation: striped ? "sl-stripes 1.2s linear infinite" : undefined,
            transition: "width var(--dur-slow) var(--ease-soft)", boxShadow: "inset 0 -3px 0 rgba(0,0,0,.08)",
          }}
        />
      </div>
    </div>
  );
}
