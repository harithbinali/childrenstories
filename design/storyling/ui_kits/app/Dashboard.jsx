function Dashboard({ go }) {
  const { Avatar, StoryCard, Card, Button, FloatingDecor, Progress, Icon, Tabs } = window.StorylingDesignSystem_b1a458;
  const kids = [['Layla', 'bubble', 6], ['Omar', 'sky', 4], ['Pip the cat', 'tangerine', 0]];
  const [kid, setKid] = React.useState(0);
  const [tab, setTab] = React.useState('recent');
  const shelf = [['Luna and the Lost Star', 'night', 'moon-stars', 70], ['The Brave Little Cloud', 'mint', 'cloud-sun', 100], ['Layla and the Giggling Volcano', 'tangerine', 'mountains', 20], ['Zara’s Underwater Picnic', 'bubble', 'fish', 0]];
  return (
    <div style={{ padding: 'clamp(20px,4vw,44px)', display: 'flex', flexDirection: 'column', gap: 36, maxWidth: 1180 }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
        <div><div className="sl-eyebrow">Thursday evening</div><h1 style={{ font: 'var(--type-h2)', marginTop: 6 }}>Good evening, Hana <Icon name="moon-stars" color="var(--sun-400)" /></h1></div>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>{kids.map(([n, t], i) => <button key={n} onClick={() => setKid(i)} style={{ border: 0, background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, font: '700 13px var(--font-body)', color: kid === i ? 'var(--ink-900)' : 'var(--ink-500)' }}><Avatar name={n} tone={t} icon={i === 2 ? 'cat' : undefined} active={kid === i} size={52} />{n.split(' ')[0]}</button>)}
          <button aria-label="Add child" style={{ width: 52, height: 52, borderRadius: '50%', border: '3px dashed var(--ink-200)', background: 'transparent', color: 'var(--ink-400)', fontSize: 22, cursor: 'pointer', marginBottom: 22 }}><Icon name="plus" weight="bold" /></button></div>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24 }}>
        <Card tone="sun" wobble padding={32} style={{ gridColumn: 'span 2', overflow: 'hidden', minHeight: 230, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
          <FloatingDecor preset="magic" />
          <h2 style={{ font: 'var(--type-h2)', position: 'relative', maxWidth: 460 }}>Make tonight’s story for {kids[kid][0].split(' ')[0]}</h2>
          <p style={{ position: 'relative', color: 'var(--ink-800)', maxWidth: 420 }}>Pick an adventure and we’ll have 12 illustrated pages ready before pyjamas are on.</p>
          <div style={{ position: 'relative', marginTop: 6 }}><Button variant="secondary" size="lg" iconStart="magic-wand" onClick={() => go('create')}>Create a story</Button></div>
        </Card>
        <Card padding={26} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ font: 'var(--type-h4)' }}>This month</h3><Icon name="sparkle" size={24} color="var(--grape-500)" /></div>
          <Progress value={14} max={20} tone="grape" label="14 of 20 stories" showValue />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{[['books', '32', 'on the shelf', 'sky'], ['clock', '5h', 'read together', 'mint']].map(([ic, n, l, t]) => <div key={l} style={{ flex: 1, minWidth: 110, background: 'var(--tint-' + t + ')', borderRadius: 20, padding: 14 }}><Icon name={ic} size={22} color="var(--ink-800)" /><div style={{ font: '700 26px/1.1 var(--font-display)', color: 'var(--ink-900)', marginTop: 6 }}>{n}</div><div style={{ font: 'var(--type-caption)', color: 'var(--ink-700)' }}>{l}</div></div>)}</div>
        </Card>
      </div>
      <section>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}><h2 style={{ font: 'var(--type-h3)' }}>{kids[kid][0].split(' ')[0]}’s bookshelf</h2><Tabs value={tab} onChange={setTab} items={[{ id: 'recent', label: 'Recent', icon: 'clock' }, { id: 'fav', label: 'Favourites', icon: 'heart' }]} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 24 }}>{shelf.map(([t, tone, ic, p], i) => <StoryCard key={t} title={t} coverTone={tone} coverIcon={ic} pages="12 pages" ageRange="4–6" progress={p} badge={p === 100 ? 'Finished' : p === 0 ? 'New' : undefined} badgeTone={p === 100 ? 'mint' : 'sun'} tilt={[-1, 1, -0.5, 0.8][i]} onClick={() => go('read')} />)}</div>
      </section>
    </div>
  );
}
window.Dashboard = Dashboard;
