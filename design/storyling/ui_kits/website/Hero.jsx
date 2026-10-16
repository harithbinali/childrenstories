function Hero({ c }) {
  const { Button, BlobFrame, SpeechBubble, FloatingDecor, WaveDivider, Icon } = window.StorylingDesignSystem_b1a458;
  const wide = window.useWide();
  return (
    <section style={{ position: 'relative', background: 'var(--blue-50)', paddingTop: wide ? 40 : 16 }}>
      <FloatingDecor preset="sky" />
      <div className="wrap" style={{ position: 'relative', display: 'grid', gridTemplateColumns: wide ? '1.05fr 1fr' : '1fr', gap: wide ? 40 : 48, alignItems: 'center', paddingBottom: 40 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'flex-start' }}>
          <span className="sl-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', padding: '9px 14px', borderRadius: 999, boxShadow: 'var(--shadow-xs)' }}><Icon name="sparkle" color="var(--sun-500)" />{c.eyebrow}</span>
          <h1 className="sl-sticker-text" style={{ font: '700 var(--text-hero)/1 var(--font-display)', color: 'var(--ink-900)' }}>{c.h1a}<br />{c.h1b} <span style={{ color: 'var(--cherry-500)', display: 'inline-block', transform: 'rotate(-2deg)' }}>{c.h1c}</span></h1>
          <p style={{ font: 'var(--type-body-lg)', fontSize: 20, color: 'var(--ink-700)', maxWidth: 520 }}>{c.sub}</p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 6 }}><Button size="lg" iconStart="magic-wand" href="../app/index.html#create">{c.cta}</Button><Button size="lg" variant="outline" iconStart="book-open">{c.cta2}</Button></div>
        </div>
        <div style={{ position: 'relative', minHeight: wide ? 520 : 380 }}>
          <BlobFrame shape={1} tone="sun" icon="image" label="Hero illustration · child + dragon" aspect="1/1" style={{ position: 'absolute', width: '78%', insetInlineEnd: 0, top: 0, transform: 'rotate(3deg)' }} />
          <BlobFrame shape={3} tone="bubble" icon="book-open-text" label="Book cover" aspect="3/4" style={{ position: 'absolute', width: '36%', insetInlineStart: 0, bottom: 10, transform: 'rotate(-7deg)' }} />
          <SpeechBubble tone="night" tail="bottom-end" style={{ position: 'absolute', insetInlineStart: '4%', top: '6%', maxWidth: 260 }} className="sl-float">{c.bubble}</SpeechBubble>
          <span className="sl-float" style={{ position: 'absolute', insetInlineEnd: '-2%', bottom: '8%', width: 84, height: 84, borderRadius: 26, background: 'var(--mint-400)', display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow-sticker)', '--sl-rot': '8deg', transform: 'rotate(8deg)' }}><Icon name="speaker-high" size={40} color="#fff" /></span>
        </div>
      </div>
      <WaveDivider color="var(--paper)" variant="cloud" height={wide ? 90 : 50} />
    </section>
  );
}
window.Hero = Hero;
