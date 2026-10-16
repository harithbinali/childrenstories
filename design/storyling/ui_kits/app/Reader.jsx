const READER_PAGES = [
  ['Layla tiptoed up the creaky attic stairs. Behind grandma’s old trunk, something was glowing.', 'sky', 'flashlight'],
  ['It was a map! But instead of roads and rivers, it showed stars, planets, and a little silver moon.', 'grape', 'map-trifold'],
  ['“X marks the spot,” Layla whispered. And the X was right in the middle of the moon.', 'sun', 'moon'],
  ['Pip the cat yawned. “If we’re going to the moon,” he said, “I’m bringing a snack.”', 'tangerine', 'cat'],
];
function Reader({ go }) {
  const { IconButton, Button, Switch, FloatingDecor, BlobFrame, Icon } = window.StorylingDesignSystem_b1a458;
  const [p, setP] = React.useState(0);
  const [aloud, setAloud] = React.useState(true);
  const [w, setW] = React.useState(0);
  const words = READER_PAGES[p][0].split(' ');
  React.useEffect(() => setW(0), [p]);
  React.useEffect(() => { if (!aloud || w >= words.length) return; const t = setTimeout(() => setW(x => x + 1), 380); return () => clearTimeout(t); }, [aloud, w, p]);
  return (
    <div style={{ minHeight: '100vh', background: 'var(--night-900)', position: 'relative', overflow: 'hidden', padding: 'clamp(16px,3vw,36px)', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <FloatingDecor preset="night" />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <IconButton icon="arrow-left" label="Back to bookshelf" variant="night" onClick={() => go('shelf')} />
        <div style={{ flex: 1, minWidth: 160 }}><div style={{ font: 'var(--type-h4)', color: '#fff' }}>Layla and the Moon Map</div><div style={{ font: 'var(--type-caption)', color: 'var(--ink-300)' }}>Page {p + 1} of {READER_PAGES.length}</div></div>
        <Switch label={<span style={{ color: '#fff' }}>Read aloud</span>} icon="speaker-high" checked={aloud} onChange={e => { setAloud(e.target.checked); setW(0); }} />
      </div>
      <div key={p} className="sl-pop-in" style={{ position: 'relative', flex: 1, maxWidth: 1100, width: '100%', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', background: 'var(--paper)', borderRadius: 36, boxShadow: '0 40px 80px -30px rgba(0,0,0,.6)', overflow: 'hidden' }}>
        <div style={{ padding: 22, background: 'var(--paper-2)' }}><BlobFrame tone={READER_PAGES[p][1]} icon={READER_PAGES[p][2]} label={'Page ' + (p + 1) + ' illustration'} aspect="1/1" sticker={false} style={{ borderRadius: 28, height: '100%' }} /></div>
        <div style={{ padding: 'clamp(28px,5vw,64px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 30 }}>
          <p style={{ font: 'var(--type-story)', fontSize: 'clamp(22px,2.6vw,30px)', color: 'var(--ink-900)' }}>{words.map((x, i) => <span key={i} style={{ background: aloud && i === w - 1 ? 'var(--sun-200)' : 'transparent', borderRadius: 8, padding: '0 3px', transition: 'background var(--dur-fast)' }}>{x} </span>)}</p>
          <div style={{ display: 'flex', gap: 8 }}>{READER_PAGES.map((_, i) => <span key={i} style={{ width: i === p ? 28 : 10, height: 10, borderRadius: 99, background: i === p ? 'var(--sun-400)' : 'var(--ink-200)', transition: 'all var(--dur-base) var(--ease-bounce)' }} />)}</div>
        </div>
      </div>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 16 }}>
        <IconButton icon="arrow-left" label="Previous page" variant="outline" size="lg" disabled={p === 0} onClick={() => setP(p - 1)} />
        {p < READER_PAGES.length - 1 ? <IconButton icon="arrow-right" label="Next page" variant="primary" size="lg" onClick={() => setP(p + 1)} /> : <Button size="lg" iconStart="heart" variant="cherry" onClick={() => go('shelf')}>The end</Button>}
      </div>
    </div>
  );
}
window.Reader = Reader;
