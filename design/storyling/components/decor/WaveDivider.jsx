import React from 'react';
function cloudPath(n = 9) { const w = 1440 / n; let d = 'M0,100 L0,58'; for (let i = 0; i < n; i++) { const x = i * w, r = i % 2 ? 0.82 : 1; d += ` C${x + w * .1},${58 - 52 * r} ${x + w * .9},${58 - 52 * r} ${x + w},58`; } return d + ' L1440,100 Z'; }
const P = { gentle: 'M0,48 C240,96 480,4 720,44 C960,84 1200,14 1440,44 L1440,100 L0,100 Z', playful: 'M0,58 C120,18 240,18 360,54 C480,90 600,90 720,54 C840,18 960,18 1080,54 C1200,90 1320,90 1440,54 L1440,100 L0,100 Z', drip: 'M0,40 C80,40 90,80 160,80 C230,80 230,30 320,30 C420,30 410,90 520,90 C620,90 610,22 720,22 C840,22 820,76 940,76 C1050,76 1040,36 1140,36 C1240,36 1250,70 1330,70 C1400,70 1410,46 1440,46 L1440,100 L0,100 Z' };
export function WaveDivider({ color = 'var(--blue-500)', background = 'transparent', variant = 'gentle', height = 80, flip, style }) {
  const d = variant === 'cloud' ? cloudPath() : P[variant] || P.gentle;
  return <div aria-hidden="true" style={{ lineHeight: 0, background, transform: flip ? 'scaleY(-1)' : undefined, ...style }}><svg viewBox="0 0 1440 100" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height }}><path d={d} fill={color} /></svg></div>;
}
