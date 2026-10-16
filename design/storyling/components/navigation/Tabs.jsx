import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function Tabs({ items = [], value, onChange, style, ...rest }) {
  return <div role="tablist" className="sl-tabs" style={style} {...rest}>{items.map(it => { const id = typeof it === 'string' ? it : it.id; const label = typeof it === 'string' ? it : it.label; return <button key={id} role="tab" type="button" className="sl-tab" aria-selected={value === id} onClick={() => onChange && onChange(id)}>{it.icon && <Icon name={it.icon} />}{label}</button>; })}</div>;
}
