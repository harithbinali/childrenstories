function SiteFooter({ c, lang }) {
  const { WaveDivider, FloatingDecor, Button } = window.StorylingDesignSystem_b1a458;
  return (<footer><WaveDivider color="var(--night-900)" variant="drip" height={70} />
    <div style={{ background: 'var(--night-900)', color: 'var(--ink-200)', position: 'relative', padding: '40px 0 36px' }}><FloatingDecor preset="night" />
      <div className="wrap" style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 30, justifyContent: 'space-between', alignItems: 'center' }}>
        <div><div style={{ font: '700 36px/1 var(--font-display)', color: '#fff' }}>{lang === 'ar' ? 'ستوريلنج' : 'Storyling'}</div><p style={{ marginTop: 10, color: 'var(--ink-300)' }}>{c.footer}</p></div>
        <Button variant="primary" iconStart="magic-wand" href="../app/index.html">{c.start}</Button>
      </div>
      <div className="wrap" style={{ position: 'relative', marginTop: 36, paddingTop: 20, borderTop: '2px dashed var(--night-700)', display: 'flex', gap: 22, flexWrap: 'wrap', font: '600 14px var(--font-body)', color: 'var(--ink-300)' }}><span>© 2026 Storyling</span><span>Privacy</span><span>Terms</span><span>Safety</span></div>
    </div></footer>);
}
window.SiteFooter = SiteFooter;
