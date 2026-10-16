function Families() {
  const { Card, Avatar, Badge, Select, IconButton, Tooltip } = window.StorylingDesignSystem_b1a458;
  const rows = [['Hana Al-Sayed', 'grape', 'Storyteller', 3, 46, 'العربية + EN'], ['Daniel Okafor', 'sky', 'Sprout', 1, 3, 'EN'], ['Mariam Haddad', 'bubble', 'Library', 4, 112, 'العربية'], ['Lucy Chen', 'mint', 'Storyteller', 2, 28, 'EN'], ['Youssef Amari', 'tangerine', 'Sprout', 1, 2, 'العربية']];
  const plan = { Storyteller: 'sun', Library: 'grape', Sprout: 'mint' };
  const th = { textAlign: 'start', padding: '12px 16px', font: 'var(--type-caption)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink-500)' };
  const td = { padding: '14px 16px', borderTop: '2px dashed var(--ink-100)', font: '600 15px var(--font-body)', color: 'var(--ink-800)', whiteSpace: 'nowrap' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-end' }}><h1 style={{ font: 'var(--type-h2)' }}>Families</h1><Select options={['All plans', 'Sprout', 'Storyteller', 'Library']} iconStart="funnel" style={{ width: 220 }} /></div>
      <Card padding={8} style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Parent</th><th style={th}>Plan</th><th style={th}>Children</th><th style={th}>Stories</th><th style={th}>Language</th><th style={th}></th></tr></thead>
          <tbody>{rows.map(([n, t, p, k, s, l]) => <tr key={n}><td style={td}><span style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Avatar name={n} tone={t} size={36} ring={false} /><b style={{ color: 'var(--ink-900)' }}>{n}</b></span></td><td style={td}><Badge tone={plan[p]} variant="soft">{p}</Badge></td><td style={td}>{k}</td><td style={td}>{s}</td><td style={td}>{l}</td><td style={{ ...td, textAlign: 'end' }}><Tooltip label="Open family"><IconButton icon="arrow-right" label="Open family" variant="ghost" size="sm" /></Tooltip></td></tr>)}</tbody>
        </table>
      </Card>
    </div>
  );
}
window.Families = Families;
