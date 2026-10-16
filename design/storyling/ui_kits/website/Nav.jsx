function SiteNav({ c, lang, setLang }) {
  const { Button, IconButton } = window.StorylingDesignSystem_b1a458;
  const [open, setOpen] = React.useState(false);
  const wide = window.useWide();
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, padding: '14px 0', background: 'rgba(238,245,255,.82)', backdropFilter: 'blur(14px)' }}>
      <div className="wrap" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <a href="#" style={{ font: '700 30px/1 var(--font-display)', color: 'var(--blue-600)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}><i className="ph-fill ph-star sl-twinkle" style={{ color: 'var(--sun-400)', fontSize: 26 }}></i>{lang === 'ar' ? 'ستوريلنج' : 'Storyling'}</a>
        {wide && <nav style={{ display: 'flex', gap: 4, marginInlineStart: 24 }}>{c.nav.map((n, i) => <a key={n} href={'#s' + i} style={{ padding: '10px 14px', borderRadius: 999, font: '600 16px/1 var(--font-display)', color: 'var(--ink-800)', textDecoration: 'none' }}>{n}</a>)}</nav>}
        <div style={{ flex: 1 }}></div>
        <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} style={{ border: 0, background: 'var(--white)', borderRadius: 999, height: 40, padding: '0 14px', font: '700 14px/1 var(--font-body)', color: 'var(--ink-800)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: 'var(--shadow-xs)' }}><i className="ph-bold ph-globe-simple"></i>{lang === 'en' ? 'العربية' : 'English'}</button>
        {wide ? <><Button variant="ghost" size="sm">{c.login}</Button><Button size="sm" href="../app/index.html">{c.start}</Button></> : <IconButton icon={open ? 'x' : 'list'} label="Menu" size="sm" onClick={() => setOpen(!open)} />}
      </div>
      {open && !wide && <div className="wrap sl-pop-in" style={{ display: 'grid', gap: 6, paddingTop: 14 }}>{c.nav.map(n => <a key={n} href="#" style={{ padding: 14, borderRadius: 18, background: '#fff', font: '600 18px var(--font-display)', color: 'var(--ink-900)', textDecoration: 'none' }}>{n}</a>)}<Button block href="../app/index.html">{c.start}</Button></div>}
    </header>
  );
}
window.useWide = function (bp = 900) { const [w, setW] = React.useState(window.innerWidth >= bp); React.useEffect(() => { const f = () => setW(window.innerWidth >= bp); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []); return w; };
window.SiteNav = SiteNav;
