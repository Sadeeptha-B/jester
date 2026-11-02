import { useEffect } from 'react';
import { useUi } from './store';
import { WorldView } from './WorldView';
import { Inspect } from './Inspect';
import { Chronicle, DecreePanel, JesterPanel, Recap, SettingsPanel } from './Panels';
import { Tray } from './Tray';

function TopBar() {
  const status = useUi((s) => s.status);
  const panel = useUi((s) => s.panel);
  const openPanel = useUi((s) => s.openPanel);
  const toggle = (p: NonNullable<typeof panel>) => openPanel(panel === p ? null : p);
  return (
    <header className="topbar">
      <div className="date">
        <span>Day {status.day} · {status.weekday}</span>
        <span className="phase">{status.holiday ?? status.phase}</span>
      </div>
      <nav className="tools">
        <button onClick={() => toggle('decree')} aria-pressed={panel === 'decree'}>Decree</button>
        <button onClick={() => toggle('chronicle')} aria-pressed={panel === 'chronicle'}>Gazette</button>
        <button onClick={() => toggle('settings')} aria-pressed={panel === 'settings'} aria-label="Settings">Stage</button>
      </nav>
    </header>
  );
}

function HoverName() {
  const hover = useUi((s) => s.hover);
  if (!hover) return null;
  return (
    <div className="hover-name" style={{ transform: `translate(${Math.round(hover.x)}px, ${Math.round(hover.y)}px) translate(-50%, -100%)` }}>
      {hover.label}
    </div>
  );
}

function Notice() {
  const notice = useUi((s) => s.notice);
  const setNotice = useUi((s) => s.setNotice);
  if (!notice) return null;
  return (
    <div className="notice parchment" role="alert">
      <p>{notice}</p>
      <button className="linkish" onClick={() => setNotice(null)}>Very well</button>
    </div>
  );
}

function Elsewhere() {
  const elsewhere = useUi((s) => s.elsewhere);
  if (!elsewhere) return null;
  return (
    <div className="recap-wrap">
      <article className="recap parchment" role="status">
        <p className="recap-kicker">The kingdom is currently</p>
        <h2>Elsewhere</h2>
        <p className="recap-sub">It is open in another window, and there is only the one kingdom. Close that window and the show will move here.</p>
      </article>
    </div>
  );
}

export function App() {
  const panel = useUi((s) => s.panel);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const ui = useUi.getState();
      ui.openPanel(null);
      ui.select(null);
      ui.setExpanded(false);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <main className="stage">
        <WorldView />
        <HoverName />
        <Inspect />
        {panel === 'decree' && <DecreePanel />}
        {panel === 'settings' && <SettingsPanel />}
        {panel === 'jester' && <JesterPanel />}
        {panel === 'chronicle' && <Chronicle />}
        <TopBar />
        <Recap />
        <Elsewhere />
        <Notice />
      </main>
      <Tray />
    </div>
  );
}
