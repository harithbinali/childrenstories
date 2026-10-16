import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function Stepper({ steps = [], current = 0, style }) {
  return (
    <ol style={{ display: 'flex', listStyle: 'none', margin: 0, padding: 0, gap: 0, width: '100%', ...style }}>
      {steps.map((s, i) => {
        const label = typeof s === 'string' ? s : s.label; const icon = typeof s === 'string' ? null : s.icon;
        const done = i < current, now = i === current;
        return (
          <li key={i} aria-current={now ? 'step' : undefined} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative' }}>
            {i > 0 && <span aria-hidden="true" style={{ position: 'absolute', top: 21, insetInlineEnd: 'calc(50% + 26px)', width: 'calc(100% - 52px)', borderTop: `3px ${done || now ? 'solid' : 'dashed'} ${done || now ? 'var(--mint-400)' : 'var(--ink-200)'}` }} />}
            <span style={{ width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 20, font: '600 18px/1 var(--font-display)', background: done ? 'var(--mint-500)' : now ? 'var(--sun-400)' : 'var(--white)', color: done ? '#fff' : now ? 'var(--ink-900)' : 'var(--ink-400)', boxShadow: done ? '0 3px 0 var(--mint-600)' : now ? '0 3px 0 var(--sun-600), 0 0 0 6px var(--sun-100)' : 'inset 0 0 0 3px var(--ink-100)', transition: 'all var(--dur-base) var(--ease-bounce)', animation: now ? 'sl-bounce-in var(--dur-slow) var(--ease-bounce)' : undefined }}>{done ? <Icon name="check" weight="bold" /> : icon ? <Icon name={icon} /> : i + 1}</span>
            <span style={{ font: `${now ? 800 : 700} 13px/1.2 var(--font-body)`, color: now ? 'var(--ink-900)' : 'var(--ink-500)', textAlign: 'center' }}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
