function SiteApp() {
  const [lang, setLang] = React.useState(localStorage.getItem('sl-lang') || 'en');
  React.useEffect(() => { document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; document.documentElement.lang = lang; localStorage.setItem('sl-lang', lang); }, [lang]);
  const c = window.SITE_COPY[lang];
  return <div dir={lang === 'ar' ? 'rtl' : 'ltr'}><SiteNav c={c} lang={lang} setLang={setLang} /><Hero c={c} /><HowItWorks c={c} /><Library c={c} /><Features c={c} /><Pricing c={c} /><Testimonial c={c} /><SiteFooter c={c} lang={lang} /></div>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<SiteApp />);
