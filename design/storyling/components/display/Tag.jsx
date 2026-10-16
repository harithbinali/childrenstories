import React from 'react';
import { Icon } from '../core/Icon.jsx';
const C = { sky: ['var(--blue-500)', 'var(--blue-700)'], sun: ['var(--sun-500)', 'var(--sun-600)'], bubble: ['var(--bubble-500)', 'var(--bubble-600)'], mint: ['var(--mint-500)', 'var(--mint-600)'], grape: ['var(--grape-500)', 'var(--grape-600)'], tangerine: ['var(--tangerine-500)', 'var(--tangerine-600)'], cherry: ['var(--cherry-500)', 'var(--cherry-600)'] };
export function Tag({ icon, selected = false, tone = 'sky', onRemove, children, style, ...rest }) {
  const c = C[tone] || C.sky;
  return <button type="button" className="sl-tag" aria-pressed={selected} style={{ '--_c': c[0], '--_e': c[1], ...style }} {...rest}>{icon && <Icon name={icon} />}{children}{onRemove && <span className="sl-tag__x" role="button" aria-label="Remove" onClick={e => { e.stopPropagation(); onRemove(e); }}><Icon name="x" weight="bold" size={12} /></span>}</button>;
}
