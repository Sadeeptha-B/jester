// Dev helper: run vitest and print a compact summary, with long lines clipped.
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const r = spawnSync('npx', ['vitest', 'run', '--disable-console-intercept', ...args], { encoding: 'utf8', shell: true, maxBuffer: 1 << 28 });
const out = (r.stdout + r.stderr).split('\n').map((l) => (l.length > 240 ? l.slice(0, 240) + '…' : l));
const start = out.findIndex((l) => /Failed Tests|Test Files/.test(l));
const before = out.slice(0, start < 0 ? out.length : start).filter((l) => /^(---|Day |D\d+:|\s*❯|\s*×)/.test(l));
console.log(before.slice(-70).join('\n'));
console.log(out.slice(start < 0 ? -30 : start).slice(0, 90).join('\n'));
