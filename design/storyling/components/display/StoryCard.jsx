import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Badge } from './Badge.jsx';
import { Progress } from '../feedback/Progress.jsx';
const T = { sun: ['var(--sun-200)', 'var(--sun-400)', 'var(--sun-700)'], sky: ['var(--blue-100)', 'var(--blue-400)', 'var(--blue-700)'], bubble: ['var(--bubble-100)', 'var(--bubble-400)', 'var(--bubble-600)'], mint: ['var(--mint-100)', 'var(--mint-400)', 'var(--mint-600)'], grape: ['var(--grape-100)', 'var(--grape-400)', 'var(--grape-600)'], tangerine: ['var(--tangerine-100)', 'var(--tangerine-400)', 'var(--tangerine-600)'], night: ['var(--night-800)', 'var(--night-700)', 'var(--sun-400)'] };
export function StoryCard({ title, subtitle, coverSrc, coverTone = 'sky', coverIcon = 'book-open-text', badge, badgeTone = 'sun', ageRange, pages, progress, tilt = 0, onClick, style }) {
  const t = T[coverTone] || T.sky;
  return (
    <article className="sl-card sl-card--interactive" onClick={onClick} tabIndex={onClick ? 0 : undefined} style={{ '--_pad': '12px', '--_hover-rot': (tilt >= 0 ? -1.5 : 1.5) + 'deg', borderRadius: 30, transform: tilt ? `rotate(${tilt}deg)` : undefined, display: 'flex', flexDirection: 'column', gap: 14, ...style }}>
      <div style={{ position: 'relative', aspectRatio: '4/3.2', borderRadius: '24px 24px 24px 24px / 24px 24px 40px 40px', overflow: 'hidden', background: `radial-gradient(120% 90% at 30% 20%, ${t[0]}, ${t[1]})`, display: 'grid', placeItems: 'center' }}>
        {coverSrc ? <img src={coverSrc} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name={coverIcon} weight="duotone" size={72} color={t[2]} />}
        {badge && <Badge tone={badgeTone} style={{ position: 'absolute', top: 12, insetInlineStart: 12 }}>{badge}</Badge>}
      </div>
      <div style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h3 style={{ font: 'var(--type-h4)', color: 'var(--text-strong)' }}>{title}</h3>
        {subtitle && <p style={{ font: 'var(--type-small)', color: 'var(--text-muted)' }}>{subtitle}</p>}
        {(ageRange || pages) && <div style={{ display: 'flex', gap: 14, font: '700 13px/1 var(--font-body)', color: 'var(--ink-500)', marginTop: 4 }}>
          {ageRange && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="baby" color="var(--bubble-500)" />{ageRange}</span>}
          {pages && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="book-open" color="var(--blue-500)" />{pages}</span>}
        </div>}
        {typeof progress === 'number' && <Progress value={progress} size="sm" style={{ marginTop: 8 }} />}
      </div>
    </article>
  );
}
