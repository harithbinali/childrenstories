window.useWide = window.useWide || function (bp = 900) { const [w, setW] = React.useState(window.innerWidth >= bp); React.useEffect(() => { const f = () => setW(window.innerWidth >= bp); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []); return w; };
const APP_NAV = [['home', 'house', 'Home', 'الرئيسية'], ['create', 'magic-wand', 'Create', 'أنشئ'], ['shelf', 'books', 'Bookshelf', 'رفّ الكتب'], ['checkout', 'crown', 'Plans', 'الخطط']];
function AppShell({ route, go, lang, setLang, children }) {
  const { Avatar, Icon } = window.StorylingDesignSystem_b1a458;
  const wide = window.useWide();
  const ar = lang === 'ar';
  const item = ([id, ic, en, a]) => { const on = route === id || (id === 'shelf' && route === 'read'); return <button key={id} onClick={() => go(id)} aria-current={on ? 'page' : undefined} style={{ border: 0, cursor: 'pointer', display: 'flex', flexDirection: wide ? 'row' : 'column', alignItems: 'center', gap: wide ? 14 : 4, padding: wide ? '14px 18px' : '8px 6px', borderRadius: 22, background: on ? (wide ? 'var(--white)' : 'transparent') : 'transparent', boxShadow: on && wide ? 'var(--shadow-soft)' : 'none', color: on ? 'var(--blue-700)' : 'var(--ink-500)', font: wide ? '600 17px/1 var(--font-display)' : '700 12px/1 var(--font-body)', flex: wide ? 'none' : 1, transition: 'all var(--dur-fast) var(--ease-bounce)' }}><span style={{ width: wide ? 40 : 44, height: wide ? 40 : 32, borderRadius: 14, display: 'grid', placeItems: 'center', background: on ? 'var(--sun-400)' : 'transparent', color: on ? 'var(--ink-900)' : 'inherit', fontSize: 22, transform: on ? 'rotate(-6deg)' : 'none', transition: 'all var(--dur-base) var(--ease-bounce)' }}><Icon name={ic} /></span>{ar ? a : en}</button>; };
  return (
    <div dir={ar ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', display: 'flex', background: 'var(--paper)' }}>
      {wide && <aside style={{ width: 260, flex: 'none', padding: 22, display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--paper-2)', borderStartEndRadius: 40, borderEndEndRadius: 40, position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ font: '700 30px/1 var(--font-display)', color: 'var(--blue-600)', padding: '8px 10px 26px', display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="star" color="var(--sun-400)" className="sl-twinkle" />{ar ? 'ستوريلنج' : 'Storyling'}</div>
        {APP_NAV.map(item)}
        <div style={{ flex: 1 }}></div>
        <button onClick={() => setLang(ar ? 'en' : 'ar')} style={{ border: 0, background: 'transparent', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', padding: 12, font: '700 14px var(--font-body)', color: 'var(--ink-700)' }}><Icon name="globe-simple" weight="bold" />{ar ? 'English' : 'العربية'}</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#fff', borderRadius: 22 }}><Avatar name="Hana" tone="grape" size={40} /><div><b style={{ color: 'var(--ink-900)', display: 'block' }}>Hana</b><span style={{ font: 'var(--type-caption)', color: 'var(--ink-500)' }}>Storyteller plan</span></div></div>
      </aside>}
      <main style={{ flex: 1, minWidth: 0, paddingBottom: wide ? 0 : 90 }}>{children}</main>
      {!wide && <nav style={{ position: 'fixed', insetInline: 12, bottom: 12, zIndex: 50, display: 'flex', background: '#fff', borderRadius: 28, padding: 6, boxShadow: 'var(--shadow-float)' }}>{APP_NAV.map(item)}</nav>}
    </div>
  );
}
window.AppShell = AppShell;
