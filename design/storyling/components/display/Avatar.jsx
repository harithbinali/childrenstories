import React from 'react';
import { Icon } from '../core/Icon.jsx';
const T = { sun: ['var(--sun-200)', 'var(--sun-700)'], sky: ['var(--blue-200)', 'var(--blue-700)'], bubble: ['var(--bubble-100)', 'var(--bubble-600)'], mint: ['var(--mint-100)', 'var(--mint-600)'], grape: ['var(--grape-100)', 'var(--grape-600)'], tangerine: ['var(--tangerine-100)', 'var(--tangerine-600)'] };
export function Avatar({ name = '', src, icon, tone = 'sun', size = 56, ring = true, active, style, ...rest }) {
  const t = T[tone] || T.sun;
  return <span title={name} style={{ position: 'relative', flex: 'none', display: 'inline-grid', placeItems: 'center', width: size, height: size, borderRadius: '50%', background: t[0], color: t[1], font: `600 ${Math.round(size * .42)}px/1 var(--font-display)`, boxShadow: ring ? `0 0 0 ${Math.max(3, size / 16)}px #fff, 0 0 0 ${Math.max(5, size / 10)}px ${active ? 'var(--sun-400)' : 'var(--ink-100)'}` : 'none', overflow: 'hidden', ...style }} {...rest}>{src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : icon ? <Icon name={icon} size={size * .5} /> : (name[0] || '?').toUpperCase()}</span>;
}
