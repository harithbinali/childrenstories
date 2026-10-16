const NS_S = window.StorylingDesignSystem_b1a458;
function HowItWorks({ c }) {
  const { Card, Icon } = NS_S; const tints = ['sun', 'sky', 'bubble']; const ink = ['var(--sun-500)', 'var(--blue-500)', 'var(--bubble-500)'];
  return (
    <section id="s0" style={{ padding: 'var(--section-y) 0' }}><div className="wrap">
      <h2 style={{ font: 'var(--type-h1)', textAlign: 'center', marginBottom: 56 }}>{c.how}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 36 }}>
        {c.steps.map(([t, d, ic], i) => <Card key={i} tone={tints[i]} wobble interactive padding={30} tilt={[-2, 1.5, -1][i]} style={{ marginTop: [0, 40, 10][i] }}>
          <span style={{ position: 'absolute', top: -22, insetInlineEnd: 22, width: 52, height: 52, borderRadius: '50%', background: ink[i], color: i === 0 ? 'var(--ink-900)' : '#fff', display: 'grid', placeItems: 'center', font: '700 24px/1 var(--font-display)', boxShadow: 'var(--shadow-sticker)' }}>{i + 1}</span>
          <Icon name={ic} weight="duotone" size={54} color="var(--ink-900)" />
          <h3 style={{ font: 'var(--type-h3)', margin: '14px 0 8px' }}>{t}</h3><p style={{ color: 'var(--ink-700)' }}>{d}</p>
        </Card>)}
      </div></div></section>
  );
}
function Library({ c }) {
  const { StoryCard, Tabs, WaveDivider } = NS_S; const [tab, setTab] = React.useState(c.tabs[0]);
  React.useEffect(() => setTab(c.tabs[0]), [c]);
  const books = [['Luna and the Lost Star', 'night', 'moon-stars', '4–6'], ['Omar Builds a Rocket', 'sky', 'rocket-launch', '5–8'], ['The Brave Little Cloud', 'mint', 'cloud-sun', '2–4'], ['Zara’s Underwater Picnic', 'bubble', 'fish', '3–6']];
  return (<section id="s1"><WaveDivider color="var(--blue-500)" variant="playful" height={70} />
    <div style={{ background: 'var(--blue-500)', padding: '40px 0 70px', position: 'relative' }}><div className="wrap">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36 }}>
        <div><h2 style={{ font: 'var(--type-h1)', color: '#fff' }}>{c.lib}</h2><p style={{ color: 'var(--blue-100)', fontSize: 19, marginTop: 8 }}>{c.libSub}</p></div>
        <Tabs value={tab} onChange={setTab} items={c.tabs} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 26 }}>{books.map(([t, tone, ic, age], i) => <StoryCard key={t} title={t} coverTone={tone} coverIcon={ic} ageRange={age} pages="12 pages" tilt={[-1.5, 1, -0.5, 1.5][i]} badge={i === 0 ? 'New' : undefined} />)}</div>
    </div></div><WaveDivider color="var(--blue-500)" variant="gentle" flip height={70} /></section>);
}
function Features({ c }) {
  const { Icon } = NS_S;
  return (<section style={{ padding: 'var(--section-y) 0' }}><div className="wrap">
    <h2 style={{ font: 'var(--type-h2)', maxWidth: 560, marginBottom: 44 }}>{c.why}</h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 32 }}>{c.feats.map(([t, d, ic, tone], i) => <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ width: 72, height: 72, borderRadius: 24, background: 'var(--tint-' + tone + ')', display: 'grid', placeItems: 'center', transform: 'rotate(' + (i % 2 ? 5 : -5) + 'deg)', boxShadow: 'var(--shadow-sticker)' }}><Icon name={ic} weight="duotone" size={38} color="var(--ink-900)" /></span>
      <h3 style={{ font: 'var(--type-h4)', marginTop: 8 }}>{t}</h3><p style={{ color: 'var(--ink-700)' }}>{d}</p></div>)}</div>
  </div></section>);
}
function Pricing({ c }) {
  const { Card, Button, Badge, Icon, Scallop } = NS_S;
  return (<section id="s2" style={{ padding: '0 0 var(--section-y)' }}><div className="wrap">
    <h2 style={{ font: 'var(--type-h1)', textAlign: 'center', marginBottom: 56 }}>{c.price}</h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 28, alignItems: 'start' }}>{c.plans.map(([n, p, per, items, cta], i) => {
      const hot = i === 1;
      return <Card key={n} variant={hot ? 'outlined' : 'elevated'} padding={0} style={{ overflow: 'visible', transform: hot ? 'translateY(-14px)' : undefined }}>
        <div style={{ background: ['var(--tint-mint)', 'var(--sun-400)', 'var(--tint-grape)'][i], borderRadius: '28px 28px 0 0', padding: '26px 28px 14px', position: 'relative' }}>
          {hot && <Badge tone="cherry" icon="heart" style={{ position: 'absolute', top: -14, insetInlineEnd: 20 }}>{c.popular}</Badge>}
          <div style={{ font: 'var(--type-h4)', color: 'var(--ink-900)' }}>{n}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}><span style={{ font: '700 48px/1 var(--font-display)', color: 'var(--ink-900)' }}>{p}</span><span style={{ font: 'var(--type-small)', color: 'var(--ink-700)' }}>{per}</span></div>
        </div>
        <Scallop color={['var(--tint-mint)', 'var(--sun-400)', 'var(--tint-grape)'][i]} size={24} />
        <div style={{ padding: '18px 28px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(it => <div key={it} style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 600, color: 'var(--ink-800)' }}><Icon name="check-circle" color="var(--mint-500)" size={22} />{it}</div>)}
          <Button block variant={hot ? 'primary' : 'outline'} href="../app/index.html#checkout" style={{ marginTop: 12 }}>{cta}</Button>
        </div>
      </Card>;
    })}</div></div></section>);
}
function Testimonial({ c }) {
  const { SpeechBubble, Avatar } = NS_S;
  return (<section style={{ padding: '0 0 var(--section-y)' }}><div className="wrap" style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
    <SpeechBubble quote tone="night" tail="bottom-start" style={{ fontSize: 22 }}><span style={{ font: '600 clamp(20px,2.4vw,26px)/1.45 var(--font-display)' }}>{c.quote}</span></SpeechBubble>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, alignSelf: 'flex-start', marginInlineStart: 20 }}><Avatar name="Hana" tone="bubble" size={48} /><b style={{ color: 'var(--ink-900)' }}>{c.quoteBy}</b></div>
  </div></section>);
}
Object.assign(window, { HowItWorks, Library, Features, Pricing, Testimonial });
