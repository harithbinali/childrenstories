window.useWide = window.useWide || function (bp = 900) { const [w, setW] = React.useState(window.innerWidth >= bp); React.useEffect(() => { const f = () => setW(window.innerWidth >= bp); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []); return w; };
function AdminShell({ route, go, children, queue }) {
  const { Avatar, Icon, Badge, Input } = window.StorylingDesignSystem_b1a458;
  const wide = window.useWide();
  const nav = [['overview', 'chart-pie-slice', 'Overview'], ['moderation', 'shield-check', 'Moderation'], ['families', 'users-three', 'Families']];
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: wide ? 'row' : 'column' }}>
      <aside style={{ width: wide ? 240 : 'auto', flex: 'none', background: 'var(--night-900)', color: '#fff', padding: wide ? 20 : 12, display: 'flex', flexDirection: wide ? 'column' : 'row', gap: 6, position: wide ? 'sticky' : 'static', top: 0, height: wide ? '100vh' : 'auto', borderStartEndRadius: wide ? 32 : 0, borderEndEndRadius: wide ? 32 : 0, overflowX: 'auto' }}>
        {wide && <div style={{ font: '700 26px/1 var(--font-display)', padding: '6px 10px 24px', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="star" color="var(--sun-400)" />Storyling<Badge tone="grape" size="sm">Admin</Badge></div>}
        {nav.map(([id, ic, l]) => { const on = route === id; return <button key={id} onClick={() => go(id)} style={{ border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 18, background: on ? 'var(--night-700)' : 'transparent', color: on ? '#fff' : 'var(--ink-300)', font: '600 16px/1 var(--font-display)', whiteSpace: 'nowrap' }}><Icon name={ic} size={22} color={on ? 'var(--sun-400)' : undefined} />{l}{id === 'moderation' && queue > 0 && <Badge tone="cherry" size="sm" style={{ marginInlineStart: 'auto' }}>{queue}</Badge>}</button>; })}
      </aside>
      <main style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px clamp(16px,3vw,36px)' }}>
          <Input placeholder="Search families, stories, orders…" iconStart="magnifying-glass" style={{ flex: 1, maxWidth: 440 }} />
          <div style={{ flex: 1 }}></div>
          <Avatar name="Sami" tone="mint" size={42} />
        </div>
        <div style={{ padding: '6px clamp(16px,3vw,36px) 40px' }}>{children}</div>
      </main>
    </div>
  );
}
window.AdminShell = AdminShell;
