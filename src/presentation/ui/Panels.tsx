import { useEffect, useMemo, useState } from 'react';
import { CITIZEN_BY_ID, CITIZENS, OFFICE_NAMES } from '../../narrative/content/citizens';
import { DECREES } from '../../narrative/content/decrees';
import { JESTER_ON } from '../../narrative/content/jester';
import { LANDMARK_BY_ID, LAWS } from '../../narrative/content/landmarks';
import { ARCS } from '../../narrative/registry';
import { displayName } from '../../sim/text';
import type { ChronicleEntry, Era, Pacing, Weather, World } from '../../sim/types';
import { useUi } from './store';

function PanelFrame({ title, children }: { title: string; children: React.ReactNode }) {
  const openPanel = useUi((s) => s.openPanel);
  return (
    <section className="panel parchment" aria-label={title}>
      <button className="card-close" onClick={() => openPanel(null)} aria-label="Close">×</button>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/** History, ordered newest-first and grouped by the era it belongs to. */
function groupByEra(entries: ChronicleEntry[], eras: Era[]) {
  const groups: { era: Era; entries: ChronicleEntry[] }[] = [...eras].reverse().map((era) => ({ era, entries: [] }));
  for (const e of entries) (groups.find((g) => e.day >= g.era.fromDay) ?? groups[groups.length - 1]).entries.push(e);
  return groups.filter((g) => g.entries.length);
}

function Gazette({ world }: { world: World }) {
  const groups = groupByEra(world.chronicle, world.eras);
  if (!groups.length) return <p className="empty">Nothing of note has yet occurred. The presses are idle, and so are the staff.</p>;
  return (
    <div className="gazette">
      {groups.map((g) => (
        <div key={g.era.name + g.era.fromDay}>
          <h3 className="era">{g.era.name}</h3>
          <ul>
            {g.entries.map((e, i) => (
              <li key={i} className={`entry s${e.salience}`}>
                <span className="entry-day">Day {e.day}</span> {e.text}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Affairs({ world }: { world: World }) {
  const active = ARCS.filter((a) => world.arcs[a.id]?.status === 'active');
  const done = ARCS.filter((a) => world.arcs[a.id]?.status === 'done');
  return (
    <div className="affairs">
      <h3>Matters Before the Throne</h3>
      {active.length ? active.map((a) => (
        <p key={a.id}><strong>{a.name}.</strong> {a.stages[world.arcs[a.id].stage]}</p>
      )) : <p className="empty">Nothing is currently on fire.</p>}
      {done.length > 0 && <h3>Concluded</h3>}
      {done.map((a) => (
        <p key={a.id}><strong>{a.name}.</strong> {a.outcomes[world.arcs[a.id].outcome!]}</p>
      ))}
      <h3>Officers of State</h3>
      <ul className="plain">
        {Object.entries(world.offices).map(([office, id]) => (
          <li key={office}>{OFFICE_NAMES[office]}: {displayName(world, id)}</li>
        ))}
      </ul>
      {world.laws.length > 0 && <h3>Laws in Force</h3>}
      <ul className="plain">
        {world.laws.map((l) => <li key={l}><strong>{LAWS[l].name}.</strong> {LAWS[l].text}</li>)}
      </ul>
      {world.landmarks.length > 0 && <h3>Monuments</h3>}
      <ul className="plain">
        {world.landmarks.map((l) => <li key={l.id}>{LANDMARK_BY_ID[l.id].name}, Day {l.day}</li>)}
      </ul>
    </div>
  );
}

function Persons({ world }: { world: World }) {
  const select = useUi((s) => s.select);
  const grudges = Object.entries(world.relations).filter(([, r]) => r.reason);
  return (
    <div className="persons">
      <ul className="plain">
        {CITIZENS.filter((c) => !world.citizens[c.id].absent).map((c) => (
          <li key={c.id}>
            <button className="linkish" onClick={() => select({ kind: 'citizen', id: c.id })}>{displayName(world, c.id)}</button>, {c.role}
          </li>
        ))}
      </ul>
      {grudges.length > 0 && <h3>Known Feuds and Friendships</h3>}
      <ul className="plain">
        {grudges.map(([key, r]) => {
          const [a, b] = key.split('|');
          return <li key={key}>{CITIZEN_BY_ID[a].name} and {CITIZEN_BY_ID[b].name}: {r.reason}</li>;
        })}
      </ul>
    </div>
  );
}

export function Chronicle() {
  const game = useUi((s) => s.game);
  const [tab, setTab] = useState<'gazette' | 'affairs' | 'persons'>('gazette');
  useUi((s) => s.status);
  if (!game) return null;
  const world = game.engine.world;
  return (
    <PanelFrame title="The Elsewhere Gazette">
      <div className="tabs" role="tablist">
        {(['gazette', 'affairs', 'persons'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'tab on' : 'tab'} onClick={() => setTab(t)}>
            {t === 'gazette' ? 'Gazette' : t === 'affairs' ? 'Affairs of State' : 'Persons of Note'}
          </button>
        ))}
      </div>
      <div className="panel-body">
        {tab === 'gazette' && <Gazette world={world} />}
        {tab === 'affairs' && <Affairs world={world} />}
        {tab === 'persons' && <Persons world={world} />}
      </div>
    </PanelFrame>
  );
}

const WEATHERS: Weather[] = ['clear', 'cloudy', 'rain', 'fog'];

export function DecreePanel() {
  const game = useUi((s) => s.game);
  const busy = useUi((s) => s.sceneBusy);
  const openPanel = useUi((s) => s.openPanel);
  const [option, setOption] = useState<string | null>(null);
  const [office, setOffice] = useState('philosopher');
  const [citizen, setCitizen] = useState('pip');
  const [weather, setWeather] = useState<Weather>('rain');
  if (!game) return null;
  const { engine } = game;
  const people = CITIZENS.filter((c) => !engine.world.citizens[c.id].absent && !c.animal || c.id === 'gerald' || c.id === 'chicken').filter((c) => !engine.world.citizens[c.id].absent);

  const sign = (id: string) => {
    const d = DECREES.find((x) => x.id === id)!;
    engine.send({
      type: 'decree',
      id,
      office: d.option === 'appointment' ? office : undefined,
      citizen: d.option === 'appointment' ? citizen : undefined,
      weather: d.option === 'weather' ? weather : undefined,
    });
    game.save();
    openPanel(null);
  };

  return (
    <PanelFrame title="Issue a Royal Decree">
      <div className="panel-body">
        {busy && <p className="empty">Mabel is out with the last one. The Ministry blames the post.</p>}
        <ul className="decrees">
          {DECREES.map((d) => (
            <li key={d.id}>
              <button className="choice" disabled={busy} onClick={() => (d.option ? setOption(option === d.id ? null : d.id) : sign(d.id))}>
                {d.label}
              </button>
              <p>{d.blurb}</p>
              {option === d.id && d.option === 'weather' && (
                <div className="decree-form">
                  <label>Weather{' '}
                    <select value={weather} onChange={(e) => setWeather(e.target.value as Weather)}>
                      {WEATHERS.map((w) => <option key={w}>{w}</option>)}
                    </select>
                  </label>
                  <button className="seal-button" disabled={busy} onClick={() => sign(d.id)}>Seal it</button>
                </div>
              )}
              {option === d.id && d.option === 'appointment' && (
                <div className="decree-form">
                  <label>Who{' '}
                    <select value={citizen} onChange={(e) => setCitizen(e.target.value)}>
                      {people.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                  <label>Office{' '}
                    <select value={office} onChange={(e) => setOffice(e.target.value)}>
                      {Object.entries(OFFICE_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                  </label>
                  <button className="seal-button" disabled={busy} onClick={() => sign(d.id)}>Seal it</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </PanelFrame>
  );
}

export function JesterPanel() {
  const game = useUi((s) => s.game);
  const say = useUi((s) => s.say);
  const openPanel = useUi((s) => s.openPanel);
  const [asking, setAsking] = useState(false);
  if (!game) return null;
  const world = game.engine.world;
  const reply = (text: string, mood: Parameters<typeof say>[1]) => {
    say(text, mood);
    openPanel(null);
  };

  const whatsGoingOn = () => {
    const active = ARCS.filter((a) => world.arcs[a.id]?.status === 'active');
    if (!active.length) return reply('Nothing is on fire, Your Majesty. I find it unsettling.', 'bored');
    const a = active[Math.floor(world.tick / 7) % active.length];
    reply(`${a.name}: ${a.stages[world.arcs[a.id].stage]}`, 'scheme');
  };

  const whatDidIMiss = () => {
    const recent = world.chronicle.find((c) => c.salience >= 2);
    reply(recent ? `Day ${recent.day}: ${recent.text}` : 'You have missed nothing. Nobody here has done anything yet. Give it time.', 'smug');
  };

  const trouble = () => {
    if (world.director.troubleDay === world.clock.day) return reply('I have caused enough trouble for one day. Ask me again tomorrow, when the evidence has gone.', 'bored');
    game.engine.send({ type: 'trouble' });
    reply('Leave it with me. You saw nothing.', 'scheme');
  };

  return (
    <PanelFrame title="A Word with the Jester">
      <div className="panel-body jester-menu">
        {!asking ? (
          <>
            <button className="choice" onClick={whatsGoingOn}>What is going on?</button>
            <button className="choice" onClick={whatDidIMiss}>What did I miss?</button>
            <button className="choice" onClick={() => setAsking(true)}>Tell me about…</button>
            <button className="choice" onClick={trouble}>Cause some trouble</button>
          </>
        ) : (
          <div className="who-grid">
            {CITIZENS.filter((c) => !world.citizens[c.id].absent).map((c) => (
              <button key={c.id} className="tab" onClick={() => reply(JESTER_ON[c.id], 'smug')}>{c.name}</button>
            ))}
          </div>
        )}
      </div>
    </PanelFrame>
  );
}

const PACES: { id: Pacing; label: string; blurb: string }[] = [
  { id: 'quiet', label: 'Quiet', blurb: 'Mostly watching the world go by.' },
  { id: 'balanced', label: 'Balanced', blurb: 'The occasional crisis.' },
  { id: 'chaotic', label: 'Chaotic', blurb: 'Nobody here has had a good night’s sleep.' },
];

export function SettingsPanel() {
  const game = useUi((s) => s.game);
  const [, refresh] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const canPip = useMemo(() => 'documentPictureInPicture' in window, []);
  useEffect(() => setConfirming(false), []);
  if (!game) return null;
  const { settings } = game.engine.world;
  const update = (f: () => void) => {
    f();
    game.save();
    refresh((n) => n + 1);
  };
  return (
    <PanelFrame title="Stage Management">
      <div className="panel-body settings">
        <h3>Pace of Events</h3>
        <div className="radio-row" role="radiogroup" aria-label="Pace of events">
          {PACES.map((p) => (
            <button key={p.id} role="radio" aria-checked={settings.pacing === p.id} className={settings.pacing === p.id ? 'tab on' : 'tab'} onClick={() => update(() => (settings.pacing = p.id))}>
              {p.label}
            </button>
          ))}
        </div>
        <p className="empty">{PACES.find((p) => p.id === settings.pacing)!.blurb}</p>
        <h3>Sound</h3>
        <div className="radio-row">
          <button className={settings.sound ? 'tab on' : 'tab'} aria-pressed={settings.sound} onClick={() => update(() => game.setSound(!settings.sound))}>
            {settings.sound ? 'On' : 'Off'}
          </button>
        </div>
        <h3>Animation</h3>
        <div className="radio-row" role="radiogroup" aria-label="Animation">
          {(['full', 'calm'] as const).map((m) => (
            <button key={m} role="radio" aria-checked={settings.motion === m} className={settings.motion === m ? 'tab on' : 'tab'} onClick={() => update(() => game.setMotion(m))}>
              {m === 'full' ? 'Lively' : 'Calm'}
            </button>
          ))}
        </div>
        {canPip && (
          <>
            <h3>Always on Top</h3>
            <div className="radio-row">
              <button className="tab" onClick={() => void game.popOut()}>Float in a small window</button>
            </div>
            <p className="empty">Keeps the kingdom above your other windows. Keep this tab open.</p>
          </>
        )}
        <h3>The Kingdom</h3>
        {confirming ? (
          <div className="radio-row">
            <button className="tab danger" onClick={() => void game.restart()}>Yes, end this kingdom</button>
            <button className="tab" onClick={() => setConfirming(false)}>Keep it</button>
          </div>
        ) : (
          <div className="radio-row">
            <button className="tab" onClick={() => setConfirming(true)}>Begin a new kingdom</button>
          </div>
        )}
      </div>
    </PanelFrame>
  );
}

export function Recap() {
  const recap = useUi((s) => s.recap);
  const setRecap = useUi((s) => s.setRecap);
  const game = useUi((s) => s.game);
  if (!recap || !game) return null;
  const raise = () => {
    game.engine.world.recap = null;
    setRecap(null);
    game.renderer.setCurtain(true);
  };
  return (
    <div className="recap-wrap">
      <article className="recap parchment" aria-label="Previously, in Elsewhere">
        <p className="recap-kicker">Previously, in</p>
        <h2>Elsewhere</h2>
        <p className="recap-sub">
          {recap.days === 1 ? 'A day has passed.' : `${recap.days} days have passed.`} I kept notes.
        </p>
        <ul>
          {recap.lines.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
        <button className="choice" onClick={raise} autoFocus>Raise the curtain</button>
      </article>
    </div>
  );
}
