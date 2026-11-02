import { useUi } from './store';
import { WorldView } from './WorldView';
import { Inspect } from './Inspect';

function TopBar() {
  const status = useUi((s) => s.status);
  return (
    <header className="topbar">
      <span className="date">Day {status.day} · {status.weekday}</span>
      <span className="phase">{status.phase}</span>
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

export function App() {
  return (
    <div className="app">
      <div className="stage">
        <WorldView />
        <HoverName />
        <TopBar />
        <Inspect />
      </div>
    </div>
  );
}
