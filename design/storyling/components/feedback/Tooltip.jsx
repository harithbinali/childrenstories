import React from 'react';
export function Tooltip({ label, children, style }) {
  return <span className="sl-tip" style={style}>{children}<span role="tooltip" className="sl-tip__bubble">{label}</span></span>;
}
