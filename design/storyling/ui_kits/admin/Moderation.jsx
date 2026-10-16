const MOD_QUEUE = [
  { id: 1, title: 'The Dragon Who Ate the Thunder', family: 'Al-Rashid family', reason: 'Scary imagery', page: 'Page 7', tone: 'tangerine', icon: 'lightning' },
  { id: 2, title: 'Max and the Midnight Woods', family: 'Okafor family', reason: 'Possible personal info', page: 'Page 2', tone: 'mint', icon: 'tree-evergreen' },
  { id: 3, title: 'Princess Noor’s Big Fight', family: 'Haddad family', reason: 'Conflict wording', page: 'Page 5', tone: 'bubble', icon: 'crown' },
];
function Moderation({ queue, setQueue }) {
  const { Card, Button, Badge, BlobFrame, Toast, Tabs, Icon } = window.StorylingDesignSystem_b1a458;
  const [toast, setToast] = React.useState(null);
  const [tab, setTab] = React.useState('pending');
  const act = (s, ok) => { setQueue(q => q.filter(x => x.id !== s.id)); setToast({ ok, t: s.title }); setTimeout(() => setToast(null), 2400); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}><h1 style={{ font: 'var(--type-h2)' }}>Moderation</h1><Tabs value={tab} onChange={setTab} items={[{ id: 'pending', label: 'Pending', icon: 'hourglass-medium' }, { id: 'done', label: 'Resolved', icon: 'check-circle' }]} /></div>
      {queue.length === 0 ? <Card tone="mint" padding={40} wobble style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}><Icon name="shooting-star" weight="duotone" size={64} color="var(--ink-900)" /><h2 style={{ font: 'var(--type-h3)' }}>All clear!</h2><p>Nothing waiting for review. Nice work.</p></Card> :
        queue.map(s => <Card key={s.id} padding={18} className="sl-pop-in" style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: 20, alignItems: 'center' }}>
          <BlobFrame shape={s.id} tone={s.tone} icon={s.icon} label={s.page} sticker={false} style={{ width: 120 }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Badge tone="cherry" variant="soft" icon="flag">{s.reason}</Badge><Badge tone="ink" variant="soft">{s.page}</Badge></div><h3 style={{ font: 'var(--type-h4)' }}>{s.title}</h3><span style={{ font: 'var(--type-small)', color: 'var(--ink-500)' }}>{s.family} · auto-flagged 12 min ago</span></div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><Button size="sm" variant="ghost" iconStart="eye">Preview</Button><Button size="sm" variant="cherry" iconStart="x-circle" onClick={() => act(s, false)}>Block</Button><Button size="sm" variant="secondary" iconStart="check-circle" onClick={() => act(s, true)}>Approve</Button></div>
          </div>
        </Card>)}
      {toast && <div style={{ position: 'fixed', bottom: 24, insetInlineEnd: 24, zIndex: 120 }}><Toast tone={toast.ok ? 'mint' : 'cherry'} title={toast.ok ? 'Story approved' : 'Story blocked'} message={toast.t} /></div>}
    </div>
  );
}
window.Moderation = Moderation; window.MOD_QUEUE = MOD_QUEUE;
