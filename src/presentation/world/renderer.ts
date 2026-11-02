import { Application, Container, Graphics, RenderTexture, Sprite, Texture } from 'pixi.js';
import { CITIZEN_BY_ID, CITIZENS } from '../../narrative/content/citizens';
import { BENCHES, LAMPS, LOCATIONS, POND, SLAB_H, SLAB_W, STRUCTURES, TREES, type LocationId, type Pt } from '../../narrative/content/map';
import { hourOf } from '../../sim/clock';
import type { Cue, EmoteKind, World } from '../../sim/types';
import { Flock, FIREFLY_SPOTS, Motes } from './ambience';
import { bakeBuilding, bench, bush, lamp, oak, pine } from './art/buildings';
import { PIGEON, type Pose } from './art/figures';
import { EMOTE_KINDS, emoteIcon, footShadow, pennant } from './art/icons';
import { PALETTE, type Colour } from './art/palette';
import { Px } from './art/px';
import { bakeTerrain, SOIL_DEPTH, TERRAIN_MARGIN } from './art/terrain';
import { cloud, curtainPanel, daySky, duskSky, footlight, hillFlat, moonDisc, nightSky, sideDrape, stageBoards, sunDisc, valance } from './art/theatre';
import { gradeAt, nightness, skyBlend, sunAt } from './grade';
import { Presenter } from './present';
import { sheetFor, textureOf } from './sheets';

const BASE_W = 288;
const BASE_H = 336;
const FRONT_BOARDS = 22;

const tint = (c: Colour) => parseInt(PALETTE[c].slice(1), 16);

function glowTexture(): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return Texture.from(c);
}

interface CitizenView {
  id: string;
  root: Container;
  shadow: Sprite;
  body: Sprite;
  emote: Sprite;
  emoteUntil: number;
  x: number;
  y: number;
  walked: number;
  height: number;
  landed: number;
}

interface WindowGlow {
  sprite: Sprite;
  glow: Sprite;
  threshold: number;
  latest: number;
}

export interface Hit {
  citizen?: string;
  location?: LocationId;
}

export class WorldRenderer {
  private set = new Container();
  private slab = new Container();
  private entities = new Container();
  private lightScene = new Container();
  private lightSlab = new Container();
  private front = new Container();
  private scene = new Container();
  private shadows = new Container();

  private worldRT: RenderTexture;
  private lightRT: RenderTexture;
  private presenter: Presenter;
  private present = new Container();
  private glow = glowTexture();

  private citizens = new Map<string, CitizenView>();
  private emoteTextures = new Map<EmoteKind, Texture>();
  private motes = new Motes();
  private flock: Flock;
  private lamps: { sprite: Sprite; glow: Sprite; on: Texture; off: Texture; lit: boolean }[] = [];
  private windows: WindowGlow[] = [];
  private chimneys: Pt[] = [];
  private trees: { sprite: Sprite; a: Texture; b: Texture; phase: number }[] = [];
  private castShadows: { sprite: Sprite; x: number }[] = [];
  private pennants: { sprite: Sprite; a: Texture; b: Texture; phase: number }[] = [];
  private clockHands = new Graphics();
  private lastClockMinute = -1;

  private skyDusk!: Sprite;
  private skyNight!: Sprite;
  private sun!: Sprite;
  private moon!: Sprite;
  private rodSun!: Sprite;
  private rodMoon!: Sprite;
  private cloudViews: { root: Container; speed: number; x: number; baseY: number }[] = [];
  private curtainL!: Sprite;
  private curtainR!: Sprite;
  private footGlows: Sprite[] = [];
  private spell = new Sprite(this.glow);

  private logW = BASE_W;
  private logH = BASE_H;
  private pixelScale = 1;
  private slabX = 8;
  private slabY = 52;

  private time = 0;
  private curtain = 0;
  private curtainTarget = 0;
  private hand: Pt | null = null;
  private rainCarry = 0;

  /** Called after every drawn frame; DOM overlays hook in here. */
  onFrame: (() => void) | null = null;

  private constructor(
    private app: Application,
    private host: HTMLElement,
  ) {
    this.worldRT = RenderTexture.create({ width: BASE_W, height: BASE_H, scaleMode: 'linear', resolution: 1 });
    this.lightRT = RenderTexture.create({ width: BASE_W, height: BASE_H, scaleMode: 'linear', resolution: 1 });
    this.presenter = new Presenter(this.worldRT, this.lightRT);
    this.present.addChild(this.presenter.mesh);

    this.buildSlab();
    this.flock = new Flock(this.entities, {
      stand: textureOf(Px.fromGrid(PIGEON.stand).outline('k')),
      peck: textureOf(Px.fromGrid(PIGEON.peck).outline('k')),
      fly: textureOf(Px.fromGrid(PIGEON.fly).outline('k')),
    });
    for (const kind of EMOTE_KINDS) this.emoteTextures.set(kind, textureOf(emoteIcon(kind)));
    this.buildCitizens();

    this.scene.addChild(this.set, this.slab, this.front);
    this.spell.anchor.set(0.5);
    this.spell.width = this.spell.height = 90;
    this.spell.tint = tint('v');
    this.spell.blendMode = 'add';
    this.spell.alpha = 0;
    this.lightSlab.addChild(this.spell);
    this.lightScene.addChild(this.lightSlab);
    this.layout();
    new ResizeObserver(() => this.layout()).observe(host);
  }

  static async create(host: HTMLElement): Promise<WorldRenderer> {
    const app = new Application();
    await app.init({
      preference: 'webgl',
      antialias: false,
      autoStart: false,
      sharedTicker: false,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      width: host.clientWidth || BASE_W,
      height: host.clientHeight || BASE_H,
      background: '#2a1f3d',
    });
    app.ticker.stop();
    host.appendChild(app.canvas);
    return new WorldRenderer(app, host);
  }

  // ---- permanent town ----------------------------------------------------

  private buildSlab() {
    const terrain = new Sprite(textureOf(bakeTerrain()));
    terrain.position.set(-TERRAIN_MARGIN, -TERRAIN_MARGIN);
    this.entities.sortableChildren = true;
    this.slab.addChild(terrain, this.shadows, this.entities, this.motes.above);

    for (const s of STRUCTURES) {
      const b = bakeBuilding(s.art);
      const tex = textureOf(b.px);
      const root = new Container();
      root.position.set(s.x, s.base - b.px.h);
      root.zIndex = s.base;
      root.addChild(new Sprite(tex));
      this.entities.addChild(root);
      this.addCastShadow(b.px, s.x, s.base);

      b.windows.forEach((w, i) => {
        const pane = new Sprite(Texture.WHITE);
        pane.tint = tint(i % 3 === 0 ? 'Y' : 'y');
        pane.position.set(w.x, w.y);
        pane.width = w.w;
        pane.height = w.h;
        pane.alpha = 0;
        root.addChild(pane);
        const glow = new Sprite(this.glow);
        glow.anchor.set(0.5);
        glow.position.set(s.x + w.x + w.w / 2, s.base - b.px.h + w.y + w.h / 2);
        glow.width = glow.height = 18 + w.w * 2;
        glow.tint = tint('o');
        glow.blendMode = 'add';
        glow.alpha = 0;
        this.lightSlab.addChild(glow);
        const pseudo = (Math.sin((s.x + 1) * 12.9 + i * 78.2) * 43758.5) % 1;
        const r = Math.abs(pseudo);
        // Ministry: one window burns all night. Nobody has found out why.
        const stubborn = s.art === 'ministry' && i === 6;
        this.windows.push({ sprite: pane, glow, threshold: 0.15 + r * 0.7, latest: stubborn ? 99 : 22 + r * 5 });
      });
      for (const c of b.smoke) this.chimneys.push({ x: s.x + c.x, y: s.base - b.px.h + c.y });

      if (s.art === 'castle') {
        const a = textureOf(pennant(0));
        const c = textureOf(pennant(1));
        for (const [x, y] of [[13, 3], [75, 3], [45, 2]] as const) {
          const sprite = new Sprite(a);
          sprite.position.set(x, y - 1);
          root.addChild(sprite);
          this.pennants.push({ sprite, a, b: c, phase: x });
        }
      }
      if (s.art === 'clock') {
        this.clockHands.position.set(s.x + 10, s.base - b.px.h + 24);
        this.clockHands.zIndex = s.base + 0.5;
        this.entities.addChild(this.clockHands);
      }
    }

    TREES.forEach((t, i) => {
      const a = t.kind === 'oak' ? oak(i) : pine(i);
      const b = t.kind === 'oak' ? oak(i, 1) : pine(i, 1);
      const ta = textureOf(a);
      const sprite = new Sprite(ta);
      sprite.anchor.set(0.5, 1);
      sprite.position.set(t.x, t.y);
      sprite.zIndex = t.y;
      this.entities.addChild(sprite);
      this.trees.push({ sprite, a: ta, b: textureOf(b), phase: i * 1.7 });
      this.addCastShadow(a, t.x - a.w / 2, t.y);
    });

    const on = textureOf(lamp(true));
    const off = textureOf(lamp(false));
    for (const l of LAMPS) {
      const sprite = new Sprite(off);
      sprite.anchor.set(0.5, 1);
      sprite.position.set(l.x, l.y);
      sprite.zIndex = l.y;
      this.entities.addChild(sprite);
      const glow = new Sprite(this.glow);
      glow.anchor.set(0.5);
      glow.position.set(l.x, l.y - 12);
      glow.width = 74;
      glow.height = 60;
      glow.tint = tint('Y');
      glow.blendMode = 'add';
      glow.alpha = 0;
      this.lightSlab.addChild(glow);
      this.lamps.push({ sprite, glow, on, off, lit: false });
    }

    const benchTex = textureOf(bench());
    for (const b of BENCHES) {
      const sprite = new Sprite(benchTex);
      sprite.anchor.set(0.5, 1);
      sprite.position.set(b.x, b.y);
      sprite.zIndex = b.y - 1;
      this.entities.addChild(sprite);
    }

    const bushes: Pt[] = [{ x: 74, y: 104 }, { x: 186, y: 150 }, { x: 96, y: 160 }, { x: 250, y: 150 }, { x: 64, y: 62 }, { x: 60, y: 156 }, { x: 16, y: 180 }];
    bushes.forEach((p, i) => {
      const sprite = new Sprite(textureOf(bush(i + 1)));
      sprite.anchor.set(0.5, 1);
      sprite.position.set(p.x, p.y);
      sprite.zIndex = p.y;
      this.entities.addChild(sprite);
    });
  }

  private addCastShadow(px: Px, x: number, base: number) {
    const shape = px.clone();
    shape.recolour(Object.fromEntries(Object.keys(PALETTE).map((c) => [c, 'k'])));
    const sprite = new Sprite(textureOf(shape));
    sprite.anchor.set(0, 1);
    sprite.alpha = 0.22;
    sprite.position.set(x, base - 1);
    this.shadows.addChild(sprite);
    this.castShadows.push({ sprite, x });
  }

  private buildCitizens() {
    const shadowTex = textureOf(footShadow(10));
    for (const def of CITIZENS) {
      const root = new Container();
      const shadow = new Sprite(shadowTex);
      shadow.anchor.set(0.5);
      shadow.alpha = 0.3;
      const body = new Sprite(sheetFor(def.id).frame('front', 'stand'));
      body.anchor.set(0.5, 1);
      body.y = 1;
      if (def.animal === 'pigeon') shadow.scale.set(0.6);
      const emote = new Sprite(Texture.EMPTY);
      emote.anchor.set(0.5, 1);
      emote.y = -24;
      emote.visible = false;
      root.addChild(shadow, body, emote);
      this.entities.addChild(root);
      this.citizens.set(def.id, { id: def.id, root, shadow, body, emote, emoteUntil: 0, x: NaN, y: NaN, walked: 0, height: 0, landed: 0 });
    }
  }

  // ---- the set, rebuilt to fit the window ---------------------------------

  private layout() {
    const cssW = Math.max(120, this.host.clientWidth);
    const cssH = Math.max(120, this.host.clientHeight);
    this.app.renderer.resize(cssW, cssH);
    const scale = Math.min(cssW / BASE_W, cssH / BASE_H);
    this.pixelScale = scale;
    this.logW = Math.ceil(cssW / scale);
    this.logH = Math.ceil(cssH / scale);
    this.slabX = Math.round((this.logW - SLAB_W) / 2);
    this.slabY = this.logH - (SLAB_H + SOIL_DEPTH + FRONT_BOARDS);
    this.slab.position.set(this.slabX, this.slabY);
    this.lightSlab.position.set(this.slabX, this.slabY);
    this.worldRT.resize(this.logW, this.logH);
    this.lightRT.resize(this.logW, this.logH);
    this.presenter.setTextures(this.worldRT, this.lightRT);
    this.buildSet();
  }

  private buildSet() {
    for (const child of [...this.set.removeChildren(), ...this.front.removeChildren()]) child.destroy({ children: true, texture: false });
    for (const g of this.footGlows) g.destroy();
    this.footGlows = [];
    this.cloudViews = [];
    const W = this.logW;
    const H = this.logH;
    const add = (px: Px, x: number, y: number, parent = this.set) => {
      const s = new Sprite(textureOf(px));
      s.position.set(x, y);
      parent.addChild(s);
      return s;
    };

    const skyH = this.slabY + 90;
    add(daySky(W, skyH), 0, 0);
    this.skyDusk = add(duskSky(W, skyH), 0, 0);
    this.skyNight = add(nightSky(W, skyH), 0, 0);

    const rodTexture = Texture.WHITE;
    this.rodSun = new Sprite(rodTexture);
    this.rodMoon = new Sprite(rodTexture);
    for (const rod of [this.rodSun, this.rodMoon]) {
      rod.tint = tint('b');
      rod.width = 1;
      rod.anchor.set(0.5, 1);
      this.set.addChild(rod);
    }
    this.sun = add(sunDisc(), 0, 0);
    this.moon = add(moonDisc(), 0, 0);
    this.sun.anchor.set(0.5);
    this.moon.anchor.set(0.5);

    for (let i = 0; i < 4; i++) {
      const root = new Container();
      const art = new Sprite(textureOf(cloud(i)));
      const baseY = 22 + ((i * 17) % 34);
      const thread = new Sprite(Texture.WHITE);
      thread.tint = tint('K');
      thread.width = 1;
      thread.height = baseY + 6;
      thread.position.set(20, -baseY - 2);
      const thread2 = new Sprite(Texture.WHITE);
      thread2.tint = tint('K');
      thread2.width = 1;
      thread2.height = baseY + 6;
      thread2.position.set(32 - i, -baseY - 2);
      root.addChild(thread, thread2, art);
      root.y = baseY;
      this.set.addChild(root);
      this.cloudViews.push({ root, speed: 0.6 + i * 0.25, x: (i * W) / 4 + i * 13, baseY });
    }

    const boardsTop = this.slabY + SLAB_H - 44;
    add(hillFlat(W, boardsTop - this.slabY - 40, 1, 'A', 'i', 'a'), 0, this.slabY + 40);
    add(hillFlat(W, boardsTop - this.slabY - 80, 2, 'M', 'l', 'm'), 0, this.slabY + 80);
    add(hillFlat(W, boardsTop - this.slabY - 122, 3, 'm', 'M', 'G'), 0, this.slabY + 122);
    add(stageBoards(W, H - boardsTop), 0, boardsTop);

    // The slab's shadow on the boards.
    const shadow = new Graphics();
    shadow.ellipse(W / 2, this.slabY + SLAB_H + SOIL_DEPTH - 3, SLAB_W / 2 + 2, 10).fill({ color: tint('k'), alpha: 0.45 });
    this.set.addChild(shadow);

    // Foreground: footlights, drapes, valance, main curtain.
    const lightOff = footlight(false);
    const lightOn = footlight(true);
    const count = Math.max(3, Math.round(W / 62));
    for (let i = 0; i < count; i++) {
      const x = Math.round(((i + 0.5) / count) * W) - 6;
      const y = H - 10;
      const s = add(lightOff, x, y, this.front);
      const lit = new Sprite(textureOf(lightOn));
      lit.position.set(x, y);
      this.front.addChild(lit);
      lit.alpha = 0;
      const glow = new Sprite(this.glow);
      glow.anchor.set(0.5);
      glow.position.set(x + 6, y - 2);
      glow.width = 96;
      glow.height = 44;
      glow.tint = tint('Y');
      glow.blendMode = 'add';
      this.lightScene.addChild(glow);
      this.footGlows.push(glow);
      void s;
      (glow as Sprite & { bulb?: Sprite }).bulb = lit;
    }

    // Wider windows show more theatre, so the drapes stay slim and the set carries on behind them.
    const drape = Math.min(58, 14 + Math.round((W - BASE_W) * 0.12));
    add(sideDrape(drape, H, -1), 0, 0, this.front);
    add(sideDrape(drape, H, 1), W - drape, 0, this.front);

    const panelW = Math.ceil(W / 2) + 3;
    this.curtainL = add(curtainPanel(panelW, H, -1), 0, 0, this.front);
    this.curtainR = add(curtainPanel(panelW, H, 1), 0, 0, this.front);
    add(valance(W), 0, 0, this.front);
  }

  // ---- input helpers ------------------------------------------------------

  /** Client coordinates to slab coordinates. */
  toWorld(clientX: number, clientY: number): Pt {
    const rect = this.host.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / this.pixelScale - this.slabX,
      y: (clientY - rect.top) / this.pixelScale - this.slabY,
    };
  }

  /** Slab coordinates to CSS pixels within the host. */
  project(x: number, y: number): Pt {
    return { x: (x + this.slabX) * this.pixelScale, y: (y + this.slabY) * this.pixelScale };
  }

  /** Where a citizen is on screen, with a head offset for bubbles. */
  headOf(id: string): Pt | null {
    const v = this.citizens.get(id);
    if (!v || !v.root.visible) return null;
    return this.project(v.x, v.y - 24 - v.height);
  }

  setHand(p: Pt | null) {
    this.hand = p;
  }

  hit(world: World, p: Pt): Hit {
    let best: string | undefined;
    let bestY = -Infinity;
    for (const c of Object.values(world.citizens)) {
      if (c.inside) continue;
      const animal = CITIZEN_BY_ID[c.id].animal;
      const halfW = animal ? 7 : 7;
      const tall = animal ? 12 : 21;
      if (Math.abs(p.x - c.pos.x) <= halfW && p.y <= c.pos.y + 2 && p.y >= c.pos.y - tall && c.pos.y > bestY) {
        best = c.id;
        bestY = c.pos.y;
      }
    }
    if (best) return { citizen: best };
    for (let i = STRUCTURES.length - 1; i >= 0; i--) {
      const s = STRUCTURES[i];
      const f = s.foot;
      const top = f.y - (s.art === 'tower' ? 44 : s.art === 'castle' ? 36 : 20);
      if (s.location && p.x >= f.x && p.x < f.x + f.w && p.y >= top && p.y < f.y + f.h) return { location: s.location };
    }
    for (const loc of Object.values(LOCATIONS)) if (Math.hypot(p.x - loc.centre.x, p.y - loc.centre.y) < 18) return { location: loc.id };
    return {};
  }

  // ---- cues ---------------------------------------------------------------

  cue(cue: Cue) {
    switch (cue.type) {
      case 'emote': {
        const v = this.citizens.get(cue.id);
        if (!v) return;
        v.emote.texture = this.emoteTextures.get(cue.kind)!;
        v.emote.visible = true;
        v.emoteUntil = this.time + 2.8;
        break;
      }
      case 'puff':
        this.motes.puff(cue.x, cue.y);
        break;
      case 'flash':
        this.motes.flash(cue.x, cue.y);
        this.spell.position.set(cue.x, cue.y - 10);
        this.spell.alpha = 1;
        break;
      default:
    }
  }

  setCurtain(open: boolean, instant = false) {
    this.curtainTarget = open ? 1 : 0;
    if (instant) this.curtain = this.curtainTarget;
  }

  get curtainMoving() {
    return Math.abs(this.curtain - this.curtainTarget) > 0.002;
  }

  // ---- frame --------------------------------------------------------------

  draw(world: World, dt: number) {
    this.time += dt;
    const hour = hourOf(world.clock);
    const night = nightness(hour);

    this.drawSky(hour, world, dt);
    this.drawTown(world, hour, night, dt);
    this.drawCitizens(world, dt);
    this.drawWeather(world, night, dt);

    const threats: Pt[] = [];
    for (const v of this.citizens.values()) if (v.root.visible && v.id !== 'gerald' && v.height === 0) threats.push({ x: v.x, y: v.y });
    if (this.hand) threats.push(this.hand);
    this.flock.update(dt, threats);
    this.motes.update(dt);

    // Curtains ease with a little weight.
    this.curtain += (this.curtainTarget - this.curtain) * Math.min(1, dt * 1.9);
    if (Math.abs(this.curtain - this.curtainTarget) < 0.002) this.curtain = this.curtainTarget;
    const half = this.logW / 2 + 3;
    const open = this.curtain * this.curtain * (3 - 2 * this.curtain);
    this.curtainL.x = Math.round(-open * half) - 2;
    this.curtainR.x = Math.round(this.logW / 2 + open * half) - 1;
    this.curtainL.visible = this.curtainR.visible = this.curtain < 1;

    this.spell.alpha = Math.max(0, this.spell.alpha - dt * 1.5);

    const r = this.app.renderer;
    r.render({ container: this.scene, target: this.worldRT, clear: true });
    r.render({ container: this.lightScene, target: this.lightRT, clear: true, clearColor: [0, 0, 0, 1] });

    const fog = world.weather === 'fog' ? 0.4 : 0;
    const res = this.app.renderer.resolution;
    this.presenter.update([this.logW, this.logH], this.pixelScale * res, [0, 0, 1], gradeAt(hour, world.weather), fog, this.time);
    r.render({ container: this.present });
    this.onFrame?.();
  }

  private drawSky(hour: number, world: World, dt: number) {
    const blend = skyBlend(hour);
    this.skyDusk.alpha = blend.dusk;
    this.skyNight.alpha = blend.night;

    // Sun and moon are props on rods, pivoting from below the stage.
    const pivotX = this.logW / 2;
    const pivotY = this.slabY + 100;
    const reach = Math.max(118, this.slabY + 74);
    const sun = sunAt(hour);
    const moonHour = (hour + 12) % 24;
    const moon = sunAt(moonHour);
    const place = (disc: Sprite, rod: Sprite, angle: number, height: number) => {
      const up = height > 0;
      disc.visible = rod.visible = up;
      if (!up) return;
      const x = pivotX + Math.sin(angle) * reach * 1.0;
      const y = pivotY - Math.cos(angle) * reach;
      disc.position.set(Math.round(x), Math.round(y));
      rod.position.set(pivotX, pivotY);
      rod.height = reach;
      rod.rotation = angle;
    };
    place(this.sun, this.rodSun, sun.angle, sun.height);
    place(this.moon, this.rodMoon, moon.angle, moon.height);

    const overcast = world.weather === 'cloudy' || world.weather === 'rain';
    this.cloudViews.forEach((c, i) => {
      c.x += c.speed * dt * (overcast ? 2 : 1);
      if (c.x > this.logW + 10) c.x = -50;
      c.root.position.set(Math.round(c.x), c.baseY + Math.round(Math.sin(this.time * 0.4 + i) * 1));
      c.root.visible = overcast || i < 2;
    });
  }

  private drawTown(world: World, hour: number, night: number, dt: number) {
    const sun = sunAt(hour);
    const length = sun.height > 0 ? 0.18 + (1 - sun.height) * 0.5 : 0;
    for (const s of this.castShadows) {
      s.sprite.visible = length > 0;
      s.sprite.scale.y = -length;
      s.sprite.skew.x = sun.angle * -0.9;
      s.sprite.alpha = 0.26 * Math.min(1, sun.height * 3) * (world.weather === 'rain' ? 0.35 : 1);
    }

    world.lamps.forEach((lit, i) => {
      const l = this.lamps[i];
      if (lit !== l.lit) {
        l.lit = lit;
        l.sprite.texture = lit ? l.on : l.off;
      }
      l.glow.alpha = lit ? (0.72 + Math.sin(this.time * 7 + i * 3) * 0.04) * Math.max(0.15, night) : 0;
    });

    for (const w of this.windows) {
      const on = night > w.threshold && (hour > 6 || w.latest > 90) && (hour < w.latest || hour < 5 && w.latest > 90);
      const target = on ? 1 : 0;
      w.sprite.alpha += (target - w.sprite.alpha) * Math.min(1, dt * 3);
      w.glow.alpha = w.sprite.alpha * 0.34;
    }

    for (const g of this.footGlows) {
      const glow = g as Sprite & { bulb?: Sprite };
      g.alpha = 0.32 + night * 0.34;
      if (glow.bulb) glow.bulb.alpha = Math.min(1, 0.2 + night);
    }

    for (const t of this.trees) t.sprite.texture = Math.sin(this.time * 0.9 + t.phase) > 0.5 ? t.b : t.a;
    for (const p of this.pennants) p.sprite.texture = Math.sin(this.time * 5 + p.phase) > 0 ? p.a : p.b;

    if (Math.random() < dt * 2.6 && this.chimneys.length) {
      const c = this.chimneys[Math.floor(Math.random() * this.chimneys.length)];
      this.motes.smoke(c.x, c.y);
    }
    if (Math.random() < dt * 14) this.motes.spray(136, 103);
    if (Math.random() < dt * 1.6) {
      const a = Math.random() * Math.PI * 2;
      this.motes.sparkle(POND.x + Math.cos(a) * POND.rx * Math.random(), POND.y + Math.sin(a) * POND.ry * Math.random());
    }
    if (night > 0.6 && Math.random() < dt * 1.3 && world.weather !== 'rain') {
      const s = FIREFLY_SPOTS[Math.floor(Math.random() * FIREFLY_SPOTS.length)];
      this.motes.firefly(s.x + (Math.random() - 0.5) * 50, s.y + (Math.random() - 0.5) * 26);
    }
    if (night === 0 && world.weather === 'clear' && Math.random() < dt * 0.18) {
      const s = LOCATIONS.gardens.centre;
      this.motes.butterfly(s.x + (Math.random() - 0.5) * 80, s.y + (Math.random() - 0.5) * 40);
    }

    const m = Math.floor(world.clock.minute);
    if (m !== this.lastClockMinute) {
      this.lastClockMinute = m;
      const g = this.clockHands.clear();
      const dot = (x: number, y: number, c: Colour) => g.rect(x, y, 1, 1).fill(tint(c));
      const hand = (angle: number, len: number, c: Colour) => {
        for (let i = 1; i <= len; i++) dot(Math.round(Math.sin(angle) * i), Math.round(-Math.cos(angle) * i), c);
      };
      hand(((m % 60) / 60) * Math.PI * 2, 4, 'k');
      hand((((m / 60) % 12) / 12) * Math.PI * 2, 3, 'r');
      dot(0, 0, 'k');
    }
  }

  private drawCitizens(world: World, dt: number) {
    for (const c of Object.values(world.citizens)) {
      const v = this.citizens.get(c.id)!;
      v.root.visible = !c.inside;
      if (c.inside) {
        v.x = NaN;
        continue;
      }
      if (Number.isNaN(v.x)) {
        v.x = c.pos.x;
        v.y = c.pos.y;
      }
      const dx = c.pos.x - v.x;
      const dy = c.pos.y - v.y;
      const k = Math.abs(dx) + Math.abs(dy) > 40 || c.lifted ? 1 : Math.min(1, dt * 11);
      const stepX = dx * k;
      const stepY = dy * k;
      v.x += stepX;
      v.y += stepY;
      const moved = Math.hypot(stepX, stepY);
      v.walked += moved;

      const target = c.lifted ? 16 : 0;
      v.height += (target - v.height) * Math.min(1, dt * 16);
      if (Math.abs(v.height - target) < 0.3) v.height = target;

      const walking = moved > 0.03 && !c.lifted;
      let pose: Pose = 'stand';
      if (c.lifted) pose = Math.sin(this.time * 18) > 0 ? 'dangle1' : 'dangle2';
      else if (c.faintUntil > world.tick) pose = 'flat';
      else if (walking) pose = (['stand', 'walk1', 'stand', 'walk3'] as const)[Math.floor(v.walked / 2.6) % 4];

      const sheet = sheetFor(c.id);
      v.body.texture = sheet.frame(c.lifted ? 'front' : c.facing, pose);
      const animal = CITIZEN_BY_ID[c.id].animal;
      const sideways = c.facing === 'side' || animal;
      v.body.scale.x = sideways && c.flip ? -1 : 1;

      v.root.position.set(Math.round(v.x), Math.round(c.lifted ? v.y + v.height : v.y));
      v.root.zIndex = c.lifted ? 3000 : c.pos.y;
      v.body.y = 1 - Math.round(v.height);
      v.shadow.scale.x = (animal === 'pigeon' ? 0.6 : 1) * (c.lifted ? 0.7 : 1);
      v.shadow.alpha = c.lifted ? 0.4 : 0.3;

      if (v.emote.visible) {
        const remaining = v.emoteUntil - this.time;
        if (remaining <= 0) v.emote.visible = false;
        v.emote.y = -22 - Math.round(v.height) - (animal ? -10 : 0);
      }
    }
  }

  private drawWeather(world: World, night: number, dt: number) {
    void night;
    if (world.weather !== 'rain') return;
    this.rainCarry += dt * 110;
    while (this.rainCarry > 1) {
      this.rainCarry -= 1;
      this.motes.rain(Math.random() * (SLAB_W + 60) - 30, -this.slabY + Math.random() * (SLAB_H + this.slabY));
    }
  }
}
