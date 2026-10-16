function AdminApp() {
  const [route, setRoute] = React.useState((location.hash || '#overview').slice(1));
  const [queue, setQueue] = React.useState(window.MOD_QUEUE);
  const go = r => { setRoute(r); history.replaceState(null, '', '#' + r); };
  return <AdminShell route={route} go={go} queue={queue.length}>{route === 'moderation' ? <Moderation queue={queue} setQueue={setQueue} /> : route === 'families' ? <Families /> : <Overview go={go} />}</AdminShell>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<AdminApp />);
