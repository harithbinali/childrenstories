function StatTile({ icon, label, value, delta, tone, tilt }) {
  const { Card, Icon, Badge } = window.StorylingDesignSystem_b1a458;
  return <Card tone={tone} padding={22} wobble style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ width: 44, height: 44, borderRadius: 16, background: '#fff', display: 'grid', placeItems: 'center', transform: 'rotate(' + tilt + 'deg)' }}><Icon name={icon} weight="duotone" size={26} color="var(--ink-900)" /></span><Badge tone={delta.startsWith('-') ? 'cherry' : 'mint'} variant="soft" size="sm">{delta}</Badge></div>
    <div style={{ font: '700 34px/1 var(--font-display)', color: 'var(--ink-900)' }}>{value}</div><div style={{ font: 'var(--type-small)', color: 'var(--ink-700)' }}>{label}</div>
  </Card>;
}
function Overview({ go }) {
  const { Card, Tabs, Button, Progress, Icon } = window.StorylingDesignSystem_b1a458;
  const [range, setRange] = React.useState('7d');
  const bars = range === '7d' ? [42, 58, 51, 74, 66, 88, 95] : [30, 44, 52, 48, 61, 70, 66, 72, 80, 77, 86, 92];
  const labels = range === '7d' ? ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'] : ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const tones = ['var(--blue-400)', 'var(--bubble-400)', 'var(--sun-400)', 'var(--mint-400)', 'var(--grape-400)', 'var(--tangerine-400)'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}><h1 style={{ font: 'var(--type-h2)' }}>Overview</h1><Tabs value={range} onChange={setRange} items={[{ id: '7d', label: '7 days' }, { id: '12m', label: '12 months' }]} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 18 }}>
        <StatTile icon="book-open-text" label="Stories created" value="18,402" delta="+12%" tone="sky" tilt={-5} />
        <StatTile icon="users-three" label="Active families" value="6,130" delta="+4%" tone="mint" tilt={5} />
        <StatTile icon="crown" label="Paid subscribers" value="2,214" delta="+9%" tone="sun" tilt={-4} />
        <StatTile icon="flag" label="Flagged by filters" value="37" delta="-18%" tone="bubble" tilt={6} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 22 }}>
        <Card padding={26} style={{ gridColumn: 'span 2' }}>
          <h2 style={{ font: 'var(--type-h4)', marginBottom: 20 }}>Stories per day</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(6px,1.5vw,16px)', height: 200 }}>{bars.map((b, i) => <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}><div style={{ width: '100%', height: b + '%', background: tones[i % 6], borderRadius: '14px 14px 6px 6px', boxShadow: 'inset 0 -5px 0 rgba(0,0,0,.08)', transition: 'height var(--dur-slow) var(--ease-bounce)' }}></div><span style={{ font: 'var(--type-caption)', color: 'var(--ink-500)' }}>{labels[i]}</span></div>)}</div>
        </Card>
        <Card padding={26} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h2 style={{ font: 'var(--type-h4)' }}>Most loved themes</h2>
          {[['Bedtime', 82, 'grape'], ['Space', 64, 'sky'], ['Animals', 57, 'mint'], ['Feelings', 41, 'bubble']].map(([t, v, tone]) => <Progress key={t} value={v} tone={tone} label={t} showValue striped={false} size="sm" />)}
          <Button variant="outline" size="sm" iconEnd="arrow-right" onClick={() => go('moderation')}>Review flagged stories</Button>
        </Card>
      </div>
    </div>
  );
}
window.Overview = Overview;
