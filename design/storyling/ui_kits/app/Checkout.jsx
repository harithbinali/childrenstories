function Checkout({ go }) {
  const { Tabs, Card, Input, Radio, Checkbox, Button, Badge, Icon, Dialog, Toast, Scallop, Stepper } = window.StorylingDesignSystem_b1a458;
  const [cycle, setCycle] = React.useState('year');
  const [done, setDone] = React.useState(false);
  const [toast, setToast] = React.useState(false);
  const price = cycle === 'year' ? 79 : 9;
  return (
    <div style={{ padding: 'clamp(20px,4vw,44px)', maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 30 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}><h1 style={{ font: 'var(--type-h2)' }}>Upgrade to Storyteller</h1><Tabs value={cycle} onChange={setCycle} items={[{ id: 'month', label: 'Monthly' }, { id: 'year', label: 'Yearly · save 27%' }]} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 28, alignItems: 'start' }}>
        <Card padding="clamp(22px,3vw,34px)" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h2 style={{ font: 'var(--type-h4)' }}>Payment details</h2>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}><Radio name="pm" value="card" label="Card" defaultChecked /><Radio name="pm" value="apple" label="Apple Pay" /><Radio name="pm" value="mada" label="mada" /></div>
          <Input label="Name on card" placeholder="Hana Al-Sayed" iconStart="user" />
          <Input label="Card number" placeholder="1234 5678 9012 3456" iconStart="credit-card" inputMode="numeric" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}><Input label="Expiry" placeholder="MM / YY" /><Input label="CVC" placeholder="123" iconEnd="lock-simple" /></div>
          <Input label="Promo code" placeholder="SPARKLE" iconStart="ticket" />
          <Checkbox label={<span>I agree to the <a href="#">terms</a> and <a href="#">kids’ privacy policy</a></span>} defaultChecked />
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ background: 'var(--sun-400)', borderRadius: '28px 28px 0 0', padding: '26px 28px 14px', position: 'relative' }}>
            <Badge tone="cherry" icon="heart" style={{ position: 'absolute', top: -14, insetInlineEnd: 20 }}>Most loved</Badge>
            <div style={{ font: 'var(--type-h4)', color: 'var(--ink-900)' }}>Storyteller · {cycle === 'year' ? 'Yearly' : 'Monthly'}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ font: '700 52px/1.1 var(--font-display)', color: 'var(--ink-900)' }}>${price}</span><span style={{ fontWeight: 700, color: 'var(--ink-800)' }}>/{cycle === 'year' ? 'year' : 'month'}</span></div>
          </div>
          <Scallop color="var(--sun-400)" />
          <Card padding={28} style={{ borderRadius: '0 0 28px 28px', marginTop: -14, paddingTop: 34, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Unlimited stories', 'All art styles', '4 child profiles', 'English & العربية'].map(x => <div key={x} style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 600, color: 'var(--ink-800)' }}><Icon name="check-circle" color="var(--mint-500)" size={22} />{x}</div>)}
            <div style={{ borderTop: '2px dashed var(--ink-100)', margin: '10px 0', paddingTop: 14, display: 'flex', justifyContent: 'space-between', font: '700 18px var(--font-body)', color: 'var(--ink-900)' }}><span>Due today</span><span>$0.00</span></div>
            <p style={{ font: 'var(--type-small)', color: 'var(--ink-500)' }}>7 days free, then ${price}/{cycle === 'year' ? 'year' : 'month'}. Cancel any time from Settings.</p>
            <Button block size="lg" iconStart="lock-simple" onClick={() => setDone(true)}>Start free trial</Button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', font: 'var(--type-caption)', color: 'var(--ink-500)' }}><Icon name="shield-check" color="var(--mint-500)" />Secure payment · no ads, ever</div>
          </Card>
        </div>
      </div>
      <Dialog open={done} onClose={() => setDone(false)} icon="crown" title="Welcome to Storyteller!" actions={<Button iconStart="magic-wand" onClick={() => { setDone(false); setToast(true); setTimeout(() => setToast(false), 2600); go('create'); }}>Make a story</Button>}>Unlimited stories are unlocked for the whole family.</Dialog>
      {toast && <div style={{ position: 'fixed', bottom: 24, insetInlineEnd: 24, zIndex: 120 }}><Toast title="Plan upgraded" message="Receipt sent to hana@mail.com" onClose={() => setToast(false)} /></div>}
    </div>
  );
}
window.Checkout = Checkout;
