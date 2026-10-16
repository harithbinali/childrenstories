function ParentApp() {
  const [route, setRoute] = React.useState((location.hash || '#home').slice(1));
  const [lang, setLang] = React.useState(localStorage.getItem('sl-lang') || 'en');
  React.useEffect(() => { document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; localStorage.setItem('sl-lang', lang); }, [lang]);
  const go = r => { setRoute(r); history.replaceState(null, '', '#' + r); window.scrollTo(0, 0); };
  const screens = { home: Dashboard, shelf: Dashboard, create: Creator, read: Reader, checkout: Checkout };
  const S = screens[route] || Dashboard;
  if (route === 'read') return <div dir={lang === 'ar' ? 'rtl' : 'ltr'}><Reader go={go} /></div>;
  return <AppShell route={route} go={go} lang={lang} setLang={setLang}><S go={go} /></AppShell>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<ParentApp />);
