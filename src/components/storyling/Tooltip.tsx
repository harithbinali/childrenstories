import type { CSSProperties, ReactNode } from "react";

export function Tooltip({ label, children, style }: { label: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <span className="sl-tip" style={style}>
      {children}
      <span role="tooltip" className="sl-tip__bubble">{label}</span>
    </span>
  );
}
