import React from 'react';
const FLIP = new Set(['arrow-right','arrow-left','caret-right','caret-left','arrow-up-right','arrow-circle-right','arrow-circle-left','caret-double-right','caret-double-left','sign-out','paper-plane-right','paper-plane-tilt']);
export function Icon({ name, weight = 'fill', size, color, flipRtl, label, className = '', style, ...rest }) {
  const flip = flipRtl ?? FLIP.has(name);
  return <i className={`ph-${weight} ph-${name} ${flip ? 'sl-flip-rtl' : ''} ${className}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ fontSize: size, color, lineHeight: 1, display: 'inline-block', flex: 'none', ...style }} {...rest} />;
}
