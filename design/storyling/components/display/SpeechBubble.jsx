import React from 'react';
const T = { night: ['var(--ink-900)', '#fff', 'rgba(255,255,255,.55)'], white: ['#fff', 'var(--ink-900)', 'var(--ink-200)'], sun: ['var(--sun-400)', 'var(--ink-900)', 'rgba(27,36,87,.3)'], sky: ['var(--blue-500)', '#fff', 'rgba(255,255,255,.55)'] };
export function SpeechBubble({ tone = 'night', tail = 'bottom-start', quote, children, style, ...rest }) {
  const t = T[tone] || T.night;
  const tailPos = { 'bottom-start': { bottom: -10, insetInlineStart: 36 }, 'bottom-end': { bottom: -10, insetInlineEnd: 36 }, start: { top: '50%', marginTop: -11, insetInlineStart: -10 }, end: { top: '50%', marginTop: -11, insetInlineEnd: -10 } }[tail];
  return (
    <div style={{ position: 'relative', background: t[0], color: t[1], borderRadius: 32, padding: 6, boxShadow: 'var(--shadow-soft)', ...style }} {...rest}>
      <div style={{ border: `2px dashed ${t[2]}`, borderRadius: 26, padding: quote ? '18px 30px' : '14px 22px', font: '600 19px/1.4 var(--font-display)', position: 'relative' }}>
        {quote && <span aria-hidden="true" style={{ position: 'absolute', top: -20, insetInlineStart: -6, font: '700 60px/1 var(--font-display)', color: 'var(--sun-400)' }}>“</span>}
        {children}
        {quote && <span aria-hidden="true" style={{ position: 'absolute', bottom: -44, insetInlineEnd: -4, font: '700 60px/1 var(--font-display)', color: 'var(--sun-400)' }}>”</span>}
      </div>
      {tailPos && <span aria-hidden="true" style={{ position: 'absolute', width: 22, height: 22, background: t[0], transform: 'rotate(45deg)', borderRadius: 4, ...tailPos }} />}
    </div>
  );
}
