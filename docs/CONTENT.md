# Writing for Elsewhere

All content lives in `src/narrative/content`. `npm test` checks everything here: it validates each file against the schema, confirms that every reference resolves, and fails if a flag is read that nothing sets, or if an arc has a stage or ending that can't be reached.

## An ambient scene

These happen without comment. Add one to `ambient.ts`:

```ts
scene(
  'pond_reasonable',                 // id; the first word is also its tag, for variety
  'pond',                            // where it happens
  { a: any(), b: any() },            // the cast: `any()` picks someone awake
  [
    gather(['a', 'b'], 'pond'),
    say('a', 'Is it deep?'),
    say('b', 'It is reasonable.'),
    emote('a', 'question'),
  ],
  { offstage: 'A dispute broke out over the depth of the pond.' }, // told in the recap
),
```

`any('jester')` excludes someone, and a fixed cast member is just an id: `{ pip: 'pip' }`. Fixed casts wait until those citizens are awake and free.

**Beats:** `go`, `gather`, `say`, `emote`, `wait`, `flash`, `chase`, `prop`, `clearProps`, `faint`. They stage things and change nothing lasting.

**Text:** `{a}` is a name, `{a.full}` adds an epithet, `{day}` is the date, `{office:weather}` is the current holder, `{fact:key}` is a remembered sentence, and `[[one|other]]` picks an option.

## An interactive incident

Add one to `incidents.ts`. It needs a question in `dispatch`, at least two choices, and an `ignored` outcome. The ignored outcome is written with as much care as the rest: it is what the citizens do on their own, and never a punishment.

```ts
decision: {
  patienceDays: 2,
  choices: [
    choice('liquid', 'Soup is a liquid', 'What Mabel reads out', [/* effects */], 'What the Jester says afterwards'),
    choice('spoon', 'If a spoon stands, it is stew', '...', [/* effects */], '...'),
  ],
  ignored: lapse([/* effects */], 'What happened instead'),
},
```

**Effects** come from `fx`: `flag`, `rel`, `appoint`, `hat`, `epithet`, `deed`, `mood`, `landmark`, `unlandmark`, `law`, `repeal`, `startArc`, `arc`, `endArc`, `chronicle`, `fact`, `era`, `weather`, `arrive`, `depart`, `holiday`.

Prefer consequences people can see. A hat, a landmark, a law that changes behaviour or an epithet beats a number going up.

## An arc

An arc is an entry in `ARC_DEFS` plus events that move it along. Gate each event on the stage before it, and move on with `fx.arc`. End with `fx.endArc`.

```ts
when: { arc: 'cabbage', stage: 'grown', status: 'active' },
effects: [fx.arc('cabbage', 'cult'), fx.landmark('cabbage', 2)],
```

Tag the events with the arc's id, so that `gapDays` spaces them out.

## Callbacks

Continuity is what makes this a place rather than a joke generator. Set a `fact` when something memorable happens, then refer to it from a Jester line or a later event, with `callback: true` so that the Director favours it:

```ts
fx.fact('umbrellas', 'the Umbrella Act, which you signed with your own, dry hand'),
smug('I remember {fact:umbrellas}. Bold in the sense of "wet".', { fact: 'umbrellas' }),
```

## The voice

Dry, theatrical, faintly bureaucratic. The Jester is mischievous and casually insubordinate, and convinced of the importance of insignificant things. He is never relentlessly cheerful, and never obsequious. Bubbles should stay under about ninety characters.

## New art

Citizens are in `looks.ts`, with hats in `art/figures.ts`. Landmarks are data in `landmarks.ts`, and their art is a function in `art/props.ts`. Check them all at `/props.html`.
