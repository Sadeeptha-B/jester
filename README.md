# Jester

A living little world of autonomous absurdity: a tiny theatre containing the
kingdom of Elsewhere, which carries on whether or not you are watching.
See [docs/brief.md](docs/brief.md).

## Running it

```sh
npm install
npm run dev        # the kingdom, on http://localhost:5173
npm run build      # typecheck and production build, into dist/
```

There is no backend, account, API key or network dependency. Open
**Stage → Install as an app** for its own window and offline use, or
**Stage → Float in a small window** to keep it above your other windows
(both in Chrome or Edge).

Every push to `main` is tested and deployed to GitHub Pages by
[.github/workflows/deploy.yml](.github/workflows/deploy.yml). The repository's
Pages source must be set to **GitHub Actions**.

## Testing

```sh
npm test           # simulation, content and persistence, including a 1,000-day soak
npm run e2e        # the brief's user journeys and the PWA, in Chromium; run `npx playwright install chromium` first
```

## Development

- `/props.html` (dev only) shows every baked asset on one page.
- The main page takes dev parameters: `?seed=7&hour=19&weather=rain&speed=20&pacing=chaotic&nocurtain`.
  Also `&fresh` to discard the save, and `&away=30` to pretend you were gone for 30 hours.
- `window.jester` (dev only) exposes the running engine, renderer and world.
- `scripts/shot.mjs` and `scripts/montage.mjs` capture screenshots from a dev server on port 5199.

## Where to go next

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how it fits together, the decisions behind it, known limitations and next milestones.
- [docs/CONTENT.md](docs/CONTENT.md): adding citizens, incidents, arcs and jokes.
