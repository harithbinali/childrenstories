import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { IconButton } from '../core/IconButton.jsx';
const T = { sun: 'var(--sun-400)', sky: 'var(--blue-500)', bubble: 'var(--bubble-500)', mint: 'var(--mint-500)', cherry: 'var(--cherry-500)', grape: 'var(--grape-500)' };
export function Dialog({ open, onClose, title, icon, tone = 'sun', actions, children, width = 480, inline }) {
  React.useEffect(() => { if (!open || !onClose) return; const k = e => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open, onClose]);
  if (!open) return null;
  const panel = (
    <div role="dialog" aria-modal={!inline} aria-label={typeof title === 'string' ? title : undefined} className="sl-pop-in" onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: width, background: 'var(--white)', borderRadius: 'var(--radius-xl)', padding: icon ? '52px 32px 28px' : '32px', boxShadow: 'var(--shadow-float)', textAlign: icon ? 'center' : 'start', marginTop: icon ? 36 : 0 }}>
      {icon && <span style={{ position: 'absolute', top: -40, left: '50%', marginLeft: -40, width: 80, height: 80, borderRadius: '50%', background: T[tone] || tone, display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow-sticker)', color: tone === 'sun' ? 'var(--ink-900)' : '#fff' }}><Icon name={icon} size={40} /></span>}
      {onClose && <IconButton icon="x" label="Close" variant="ghost" size="sm" onClick={onClose} style={{ position: 'absolute', top: 14, insetInlineEnd: 14 }} />}
      {title && <h2 style={{ font: 'var(--type-h3)', color: 'var(--text-strong)', marginBottom: 10 }}>{title}</h2>}
      <div style={{ font: 'var(--type-body)', color: 'var(--text-body)' }}>{children}</div>
      {actions && <div style={{ display: 'flex', gap: 12, marginTop: 26, justifyContent: icon ? 'center' : 'flex-end', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
  if (inline) return panel;
  return <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-overlay)', background: 'var(--surface-overlay)', backdropFilter: 'blur(var(--blur-overlay))', display: 'grid', placeItems: 'center', padding: 20, animation: 'sl-fade-in var(--dur-base) var(--ease-soft)' }}>{panel}</div>;
}
