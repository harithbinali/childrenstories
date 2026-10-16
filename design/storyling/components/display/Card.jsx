import React from 'react';
const TINT = { white: 'var(--white)', paper: 'var(--paper-2)', sun: 'var(--tint-sun)', sky: 'var(--tint-sky)', bubble: 'var(--tint-bubble)', mint: 'var(--tint-mint)', grape: 'var(--tint-grape)', tangerine: 'var(--tint-tangerine)', night: 'var(--night-800)', blue: 'var(--blue-500)' };
export function Card({ tone = 'white', variant = 'elevated', wobble, interactive, padding, tilt, as: Tag = 'div', className = '', style, children, ...rest }) {
  const cls = ['sl-card', variant !== 'elevated' && `sl-card--${variant}`, wobble && 'sl-card--wobble', interactive && 'sl-card--interactive', className].filter(Boolean).join(' ');
  const dark = tone === 'night' || tone === 'blue';
  return <Tag className={cls} style={{ '--_tint': TINT[tone] || tone, '--_pad': typeof padding === 'number' ? padding + 'px' : padding, ...(dark ? { color: 'var(--white)' } : null), ...(tilt ? { transform: `rotate(${tilt}deg)` } : null), ...style }} {...rest}>{children}</Tag>;
}
