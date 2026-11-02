import type { Cue, Weather } from '../sim/types';

/**
 * A very small synthesised soundscape. No samples, no network, and silent until
 * the user switches it on, since browsers require a gesture to start audio anyway.
 */
export function soundscape() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let rain: { gain: GainNode } | null = null;
  let enabled = false;

  const ready = () => {
    if (!enabled) return null;
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  };

  const tone = (freq: number, ms: number, type: OscillatorType, gain: number, delay = 0, slide = 0) => {
    const c = ready();
    if (!c || !master) return;
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const env = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t + ms / 1000);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    osc.connect(env).connect(master);
    osc.start(t);
    osc.stop(t + ms / 1000 + 0.02);
  };

  const rainNoise = () => {
    const c = ready();
    if (!c || !master || rain) return;
    const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = c.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    const gain = c.createGain();
    gain.gain.value = 0.0001;
    source.connect(filter).connect(gain).connect(master);
    source.start();
    rain = { gain };
  };

  return {
    setEnabled(on: boolean) {
      enabled = on;
      if (on) ready();
      else if (ctx) void ctx.suspend();
    },
    /** The town clock. */
    hour(h: number) {
      if (!enabled || h % 3) return;
      tone(392, 1400, 'sine', 0.5);
      tone(784, 900, 'sine', 0.14);
    },
    ambience(weather: Weather | null) {
      if (!enabled) return;
      rainNoise();
      if (rain && ctx) rain.gain.gain.setTargetAtTime(weather === 'rain' ? 0.5 : 0.0001, ctx.currentTime, 0.8);
    },
    cue(cue: Cue) {
      if (!enabled) return;
      switch (cue.type) {
        case 'puff':
          tone(150, 110, 'triangle', 0.5, 0, 0.5);
          break;
        case 'flash':
          tone(520, 240, 'square', 0.12, 0, 2.4);
          tone(780, 200, 'sine', 0.2, 0.06, 1.6);
          break;
        case 'emote':
          if (cue.kind === 'exclaim') tone(880, 70, 'square', 0.05);
          if (cue.kind === 'love') tone(660, 120, 'sine', 0.14);
          break;
        case 'lamp':
          tone(1320, 60, 'triangle', 0.1);
          break;
        case 'tomato':
          tone(240, 90, 'sawtooth', 0.14, 0, 0.4);
          break;
        case 'quip':
          [523, 659].forEach((f, i) => tone(f, 130, 'triangle', 0.14, i * 0.09));
          break;
        default:
      }
    },
  };
}
