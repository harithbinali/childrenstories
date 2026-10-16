function Creator({ go }) {
  const { Stepper, Input, Select, Tag, Switch, Checkbox, Button, Card, BlobFrame, Avatar, Progress, FloatingDecor, Dialog, SpeechBubble, Icon } = window.StorylingDesignSystem_b1a458;
  const [step, setStep] = React.useState(0);
  const [hero, setHero] = React.useState(0);
  const [traits, setTraits] = React.useState(['Brave']);
  const [world, setWorld] = React.useState('space');
  const [style, setStyle] = React.useState(0);
  const [gen, setGen] = React.useState(-1);
  React.useEffect(() => { if (gen < 0 || gen >= 100) return; const t = setTimeout(() => setGen(g => Math.min(100, g + 7)), 160); return () => clearTimeout(t); }, [gen]);
  const toggle = t => setTraits(x => x.includes(t) ? x.filter(y => y !== t) : [...x, t]);
  const worlds = [['space', 'rocket-launch', 'Outer space', 'grape'], ['ocean', 'fish', 'Under the sea', 'sky'], ['forest', 'tree', 'Enchanted forest', 'mint'], ['castle', 'castle-turret', 'Castle', 'bubble'], ['dino', 'bone', 'Dino land', 'tangerine'], ['bed', 'moon-stars', 'Dreamland', 'sun']];
  const styles = [['Crayon', 'sun', 'paint-brush'], ['Watercolour', 'sky', 'drop'], ['Cartoon', 'bubble', 'smiley'], ['Paper cut', 'mint', 'scissors']];
  const steps = [{ label: 'Hero', icon: 'user' }, { label: 'World', icon: 'globe-hemisphere-west' }, { label: 'Plot', icon: 'magic-wand' }, { label: 'Art style', icon: 'palette' }];
  if (gen >= 0) return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--blue-50)', padding: 24, overflow: 'hidden' }}>
      <FloatingDecor preset="magic" />
      <div style={{ position: 'relative', width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, textAlign: 'center' }}>
        <BlobFrame shape={2} tone="grape" icon="magic-wand" label="Mascot · painting" style={{ width: 200 }} className="sl-float" />
        <h1 style={{ font: 'var(--type-h2)' }}>Writing Layla’s adventure…</h1>
        <Progress value={gen} tone="grape" label={gen < 40 ? 'Dreaming up the plot' : gen < 80 ? 'Painting page ' + Math.ceil(gen / 10) + ' of 12' : 'Binding the book'} showValue style={{ width: '100%' }} />
      </div>
      <Dialog open={gen >= 100} onClose={() => setGen(-1)} icon="confetti" title="Your story is ready!" actions={<><Button variant="outline" onClick={() => { setGen(-1); setStep(0); }}>Make another</Button><Button iconEnd="book-open" onClick={() => go('read')}>Start reading</Button></>}>“Layla and the Moon Map” has 12 brand-new pages.</Dialog>
    </div>
  );
  return (
    <div style={{ padding: 'clamp(20px,4vw,44px)', maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 34 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><h1 style={{ font: 'var(--type-h2)', flex: 1 }}>New story</h1><Button variant="ghost" size="sm" iconStart="x" onClick={() => go('home')}>Cancel</Button></div>
      <Stepper current={step} steps={steps} />
      <Card padding="clamp(22px,4vw,40px)" wobble key={step} className="sl-pop-in" style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        {step === 0 && <>
          <h2 style={{ font: 'var(--type-h3)' }}>Who’s the hero today?</h2>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>{[['Layla', 'bubble'], ['Omar', 'sky'], ['Pip', 'tangerine']].map(([n, t], i) => <button key={n} onClick={() => setHero(i)} style={{ border: 0, background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, font: '700 15px var(--font-body)', color: 'var(--ink-900)' }}><Avatar name={n} tone={t} icon={i === 2 ? 'cat' : undefined} size={76} active={hero === i} />{n}</button>)}</div>
          <div><div className="sl-label" style={{ marginBottom: 12 }}>What are they like?</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>{[['Brave', 'shield-star'], ['Curious', 'magnifying-glass'], ['Funny', 'smiley-wink'], ['Kind', 'heart'], ['Sleepy', 'moon']].map(([t, ic]) => <Tag key={t} icon={ic} tone="bubble" selected={traits.includes(t)} onClick={() => toggle(t)}>{t}</Tag>)}</div></div>
        </>}
        {step === 1 && <>
          <h2 style={{ font: 'var(--type-h3)' }}>Where does the adventure happen?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 16 }}>{worlds.map(([id, ic, l, t], i) => <Card key={id} tone={world === id ? t : 'paper'} variant={world === id ? 'outlined' : 'flat'} interactive padding={20} onClick={() => setWorld(id)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}><Icon name={ic} weight="duotone" size={44} color="var(--ink-900)" /><b style={{ font: '600 17px var(--font-display)', color: 'var(--ink-900)' }}>{l}</b></Card>)}</div>
        </>}
        {step === 2 && <>
          <h2 style={{ font: 'var(--type-h3)' }}>What happens in the story?</h2>
          <Input multiline label="Your idea (optional)" placeholder="Layla finds a map to the moon in her grandma’s attic…" hint="A sentence or two is plenty. Leave blank and we’ll surprise you." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 18 }}><Select label="Length" iconStart="book-open" options={['Short · 6 pages', 'Classic · 12 pages', 'Long · 20 pages']} defaultValue="Classic · 12 pages" /><Select label="Language" iconStart="translate" options={['English', 'العربية', 'Both (side by side)']} /></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 26 }}><Checkbox label="End with a gentle lesson" defaultChecked /><Checkbox label="Make it rhyme" /><Switch label="Read-aloud voice" icon="speaker-high" defaultChecked /></div>
        </>}
        {step === 3 && <>
          <h2 style={{ font: 'var(--type-h3)' }}>Pick an art style</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 22 }}>{styles.map(([n, t, ic], i) => <button key={n} onClick={() => setStyle(i)} style={{ border: 0, background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', font: '600 17px var(--font-display)', color: 'var(--ink-900)', transform: style === i ? 'scale(1.04) rotate(-1.5deg)' : 'none', transition: 'transform var(--dur-base) var(--ease-bounce)' }}><BlobFrame shape={i + 1} tone={t} icon={ic} label={n + ' sample'} sticker={style === i} style={{ width: '100%', outline: style === i ? '4px solid var(--sun-400)' : 'none', outlineOffset: 4 }} />{n}</button>)}</div>
        </>}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', borderTop: '2px dashed var(--ink-100)', paddingTop: 22 }}>
          <Button variant="outline" iconStart="arrow-left" disabled={step === 0} onClick={() => setStep(s => s - 1)}>Back</Button>
          {step < 3 ? <Button variant="secondary" iconEnd="arrow-right" onClick={() => setStep(s => s + 1)}>Next</Button> : <Button size="lg" iconStart="magic-wand" onClick={() => setGen(0)}>Make my story</Button>}
        </div>
      </Card>
    </div>
  );
}
window.Creator = Creator;
