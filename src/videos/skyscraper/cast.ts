// Our cast as lit flat sprites in the 3D London street world.
// Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, swingKid, soldier, townsfolk,
  OFFICER, BUILDER, MARTIN, BARBER, REPORTER, DRIVER, KID, PARENT,
  fxBurst, fxSplash, fxStars, fxCreak, fxShadow, fxContact, fxHeatWave, fxSmokePuff,
  Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import {
  FPS, D0, PARK, SHOTS, SNAP, DROP0, DROP1, BOLT_HITS,
  BUDGET_AT, DOORMAT_AT, TILES_AT, VAN_AT, JAG_AT, PAN_AT, SIGN_AT,
  V3, smooth, clamp01, BridgeState,
} from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

export { SIGN_AT };

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830;
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
const ROOTS = new Set<THREE.Object3D>();

export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}

export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false;
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    } else {
      this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0;
    }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const FOLK = [0, 1, 2, 3, 4, 5].map((v) => townsfolk(v));
const WORKERS = [0, 1, 2, 3].map((v) => soldier(v, { jacket: "#3b5b8c", pants: "#323846", hat: "cap", cap: "#f5c63b", rifle: false, belt: null }));
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- blinks & expression swaps ----------------
const LEAD = 2 / FPS;
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h;
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

export type Stage = { places: Place[]; fx: FxPlace[] };

/** Helper: add rising smoke puffs and wavy heat lines at (x, y, z) */
const addSmokeAndHeat = (out: Stage, t: number, x: number, y: number, z: number, scale = 1, seed = 0) => {
  for (let k = 0; k < 3; k++) {
    const u = q(((t * 0.75 + k * 0.33 + seed * 0.19) % 1), 30);
    out.fx.push({
      key: `smokepuff|${u}`, cw: 320, ch: 320, draw: (p) => fxSmokePuff(p, u),
      x: x + Math.sin(t * 2 + k) * 0.14 * scale, y: y + 0.25 + u * 1.15 * scale, z: z - 0.05,
      w: (0.45 + 0.35 * u) * scale, h: (0.45 + 0.35 * u) * scale,
    });
  }
  const hu = q((t * 1.2 + seed) % 1, 30);
  out.fx.push({
    key: `heatwave|${hu}`, cw: 300, ch: 360, draw: (p) => fxHeatWave(p, hu),
    x, y: y + 0.38 * scale, z: z + 0.05, w: 0.55 * scale, h: 0.66 * scale,
  });
};

/** Background & sidewalk London townsfolk */
const CHEER: [number, number][] = [[6.8 - LEAD, 8.5], [64.9 - LEAD, 68.4]];
const townsfolkAt = (cam: CamInfo, t: number, out: Stage) => {
  const spots: [number, number][] = [
    [-11.5, -15.6], [-6.2, -15.8], [-2.0, -15.5], [2.8, -15.7], [7.8, -15.5], [11.5, -15.6],
    [-10.2, 13.8], [-4.8, 14.2], [4.6, 14.0], [10.4, 13.8],
  ];
  const on = CHEER.some(([a, b]) => t >= a && t < b);
  spots.forEach(([x, z], i) => {
    const kid = i % 5 === 2, o = kid ? KID : FOLK[i % 6], hop = kid && on ? Math.max(0, Math.sin(t * 7 + i)) * 0.16 : 0;
    const who: Who = { i: i + 200, o, okey: kid ? "kid" : `f${i % 6}` };
    const expr: Expr = (["smile", "grin", "laugh", "smile_closed"] as Expr[])[i % 4];
    const fo: FrontOpts = { mode: "stand", expr, wave: i % 3 === 2 || !on ? undefined : q(Math.sin(t * 8 + i * 1.3), 30), blink: lidAt(t, i + 40) };
    out.places.push(person(cam, who, x, D0 + 0.16 + hop, z, { side: false, mirror: false }, fo, {}, kid ? 0.72 : 1));
    blob(out, x, D0 + 0.16, z, kid ? 0.72 : 1, hop > 0 ? 0.6 : 1);
  });
};

const hammerK = (t: number, hits: number[]) => {
  let k = 1;
  for (const th of hits) {
    const n = (t - th) * FPS;
    if (n >= -11 && n < -7) k = Math.min(k, 1 - smooth((n + 11) / 4));
    else if (n >= -7 && n < 0) k = 0;
  }
  return k;
};

/** Everything with a face or 2D FX in shot `id` at time t */
export const stage = (id: number, t: number, b: BridgeState, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  if (s.towns) townsfolkAt(cam, t, out);

  // Shot 1 (Hook): Martin shocked beside his melting Jaguar + smoke & heat waves + background Londoners
  if (id === 1) {
    const mx = JAG_AT[0] + 1.85, mz = JAG_AT[2] - 0.35;
    out.places.push(person(cam, { i: 11, o: MARTIN, okey: "martin" }, mx, D0, mz, { side: false, mirror: false },
      { mode: "stand", expr: "shock", facing: -1, blink: lidAt(t, 11) }, {}));
    blob(out, mx, D0, mz);
    addSmokeAndHeat(out, t, JAG_AT[0] - 0.25, D0 + 0.95, JAG_AT[2] + 0.75, 1.15, 1);
    const su = q((t * 0.9) % 1, 30);
    out.fx.push({ key: `stars${su}`, cw: 420, ch: 210, draw: (p) => fxStars(p, su), x: mx, y: D0 + 2.25, z: mz, w: 0.7, h: 0.35 });
    for (const [i, x, z] of [[0, -5.5, -15.4], [1, -1.5, -15.5], [2, 8.8, -15.2]] as const) {
      out.places.push(person(cam, { i: 30 + i, o: FOLK[i], okey: `f${i}` }, x, D0 + 0.16, z, { side: false, mirror: false },
        { mode: "stand", expr: "shock", blink: lidAt(t, 30 + i) }, {}));
      blob(out, x, D0 + 0.16, z);
    }
  }

  // Shot 2 & 3: Architects & builders admiring the flared glass tower
  if (id === 2 || id === 3) {
    const spots: [number, number, Outfit, string, Expr][] = [
      [-6.8, -3.5, OFFICER, "off", "grin"],
      [-4.6, -2.8, BUILDER, "bld", "smile"],
      [4.8, -3.2, WORKERS[0], "wk0", "grin"],
    ];
    spots.forEach(([x, z, o, ok, expr], idx) => {
      out.places.push(person(cam, { i: 50 + idx, o, okey: ok }, x, D0, z, { side: false, mirror: false },
        { mode: "stand", expr, wave: id === 2 && t > 7.2 ? q(Math.sin(t * 8 + idx), 30) : undefined, blink: lidAt(t, 50 + idx) }, {}));
      blob(out, x, D0, z);
    });
  }

  // Shot 4: Developer cutting the window shades from the budget on the easel at BUDGET_AT
  if (id === 4) {
    const cutK = q(smooth((t - (SNAP - 0.15)) / 0.2), 30);
    const ox = BUDGET_AT[0] + 0.85, oz = BUDGET_AT[2] - 0.3;
    out.places.push(person(cam, { i: 99, o: OFFICER, okey: "off" }, ox, D0, oz, { side: false, mirror: false },
      { mode: "stand", expr: t >= SNAP - LEAD ? "laugh" : "grin", prop: ["scissors", cutK], facing: -1, blink: lidAt(t, 99, [SNAP]) }, {}));
    blob(out, ox, D0, oz, 1.05);
    const bx = BUDGET_AT[0] - 0.95, bz = BUDGET_AT[2] - 0.3;
    out.places.push(person(cam, { i: 98, o: BUILDER, okey: "bld" }, bx, D0, bz, { side: false, mirror: false },
      { mode: "stand", expr: "grin", facing: 1, blink: lidAt(t, 98) }, {}));
    blob(out, bx, D0, bz);
    if (t >= SNAP && t < SNAP + 0.45) {
      const u = q((t - SNAP) / 0.45, 30);
      out.fx.push({ key: `cutburst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u), x: BUDGET_AT[0], y: D0 + 1.55, z: BUDGET_AT[2] - 0.15, w: 1.2, h: 1.2 });
    }
  }

  // Shot 5: Blinding strip of light creeping across the shops while pedestrians jump back
  if (id === 5) {
    const pedSpots: [number, number][] = [[-10.2, -15.4], [-7.2, -15.6], [-4.2, -15.3], [-1.0, -15.5], [2.5, -15.4]];
    pedSpots.forEach(([x, z], i) => {
      const nearBeam = Math.abs(x - b.spotX) < 3.2 && t > 18.5;
      const expr: Expr = nearBeam ? "shock" : "nervous";
      const hop = nearBeam ? Math.abs(Math.sin(t * 9 + i)) * 0.18 : 0;
      out.places.push(person(cam, { i: 60 + i, o: FOLK[i % 6], okey: `f${i % 6}` }, x, D0 + 0.16 + hop, z, { side: false, mirror: false },
        { mode: "stand", expr, blink: lidAt(t, 60 + i) }, {}));
      blob(out, x, D0 + 0.16, z);
    });
    if (t > 18.6) addSmokeAndHeat(out, t, b.spotX, D0 + 0.16, b.spotZ, 0.95, 5);
  }

  // Shot 6: Barbershop doormat smoking
  if (id === 6) {
    const bx = DOORMAT_AT[0] + 1.35, bz = DOORMAT_AT[2] - 0.2;
    out.places.push(person(cam, { i: 71, o: BARBER, okey: "barber" }, bx, D0 + 0.16, bz, { side: false, mirror: false },
      { mode: "stand", expr: t < 22.8 ? "nervous" : "shock", facing: -1, blink: lidAt(t, 71, [22.8]) }, {}));
    blob(out, bx, D0 + 0.16, bz);
    if (b.doormatSmoke > 0.05) addSmokeAndHeat(out, t, DOORMAT_AT[0], DOORMAT_AT[1], DOORMAT_AT[2], 0.95 * b.doormatSmoke + 0.3, 6);
  }

  // Shot 7: Sidewalk tiles crack & delivery van paint blisters
  if (id === 7) {
    if (t >= DROP0 && t < DROP0 + 0.45) {
      const u = q((t - DROP0) / 0.45, 30);
      out.fx.push({ key: `tileburst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u), x: TILES_AT[0], y: TILES_AT[1] + 0.15, z: TILES_AT[2], w: 1.15, h: 1.15 });
    }
    if (t >= DROP0 - 0.2) {
      const cu = q((t * 1.4) % 1, 30);
      out.fx.push({ key: `creak${cu}`, cw: 300, ch: 300, draw: (p) => fxCreak(p, cu), x: TILES_AT[0], y: TILES_AT[1] + 0.28, z: TILES_AT[2], w: 0.65, h: 0.65 });
    }
    const dx = VAN_AT[0] - 2.25, dz = VAN_AT[2] + 0.85;
    out.places.push(person(cam, { i: 72, o: DRIVER, okey: "driver" }, dx, D0, dz, { side: false, mirror: false },
      { mode: "stand", expr: t < 25.9 ? "nervous" : "shock", facing: 1, blink: lidAt(t, 72, [25.9]) }, {}));
    blob(out, dx, D0, dz);
    if (b.vanBlister > 0.05) {
      addSmokeAndHeat(out, t, VAN_AT[0] - 0.15, D0 + 1.15, VAN_AT[2] + 0.95, 0.85, 7);
    }
  }

  // Shot 8: Martin parks his shiny black Jaguar, then returns to find the mirror & panels drooping like wax
  if (id === 8) {
    if (t < 29.8) {
      const walkU = clamp01((t - 28.2) / 1.5);
      const mx = JAG_AT[0] - 0.9 - walkU * 1.6, mz = JAG_AT[2] + 1.45;
      const mode = walkU > 0.05 && walkU < 0.95 ? "stroll" : "stand";
      out.places.push(person(cam, { i: 11, o: MARTIN, okey: "martin" }, mx, D0, mz, { side: false, mirror: false },
        { mode, phase: q((t * 1.2) % 1, 60), expr: "grin", facing: -1, blink: lidAt(t, 11) }, {}));
      blob(out, mx, D0, mz);
      // Shiny car sparkles
      const su = q((t * 0.8) % 1, 30);
      out.fx.push({ key: `sparkle${su}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, su, "#ffffff", 8, 20, 140),
        x: JAG_AT[0] - 0.5, y: D0 + 1.15, z: JAG_AT[2] + 0.4, w: 0.55, h: 0.55 });
    } else {
      const retU = clamp01((t - 29.8) / 0.7);
      const mx = JAG_AT[0] - 2.1 + retU * 1.0, mz = JAG_AT[2] + 1.45;
      const expr: Expr = t < 31.0 ? "shock" : "dazed";
      out.places.push(person(cam, { i: 11, o: MARTIN, okey: "martin" }, mx, D0, mz, { side: false, mirror: false },
        { mode: retU < 0.95 ? "stroll" : "stand", phase: q((t * 1.2) % 1, 60), expr, prop: "coffee", facing: 1, blink: lidAt(t, 11, [30.2, 31.0]) }, {}));
      blob(out, mx, D0, mz);
      addSmokeAndHeat(out, t, JAG_AT[0] - 0.25, D0 + 0.92, JAG_AT[2] + 0.75, 0.95, 8);
      if (t >= 31.0) {
        const su = q((t * 0.95) % 1, 30);
        out.fx.push({ key: `stars${su}`, cw: 420, ch: 210, draw: (p) => fxStars(p, su), x: mx, y: D0 + 2.25, z: mz, w: 0.7, h: 0.35 });
      }
    }
  }

  // Shot 9: Reporter sets a frying pan on the pavement and cooks an egg right on the bricks
  if (id === 9) {
    const rx = PAN_AT[0] - 1.15, rz = PAN_AT[2] - 0.2;
    out.places.push(person(cam, { i: 81, o: REPORTER, okey: "reporter" }, rx, D0 + 0.16, rz, { side: false, mirror: false },
      { mode: "stand", expr: t > 36.6 ? "laugh" : "grin", prop: "mic", facing: 1, blink: lidAt(t, 81) }, {}));
    blob(out, rx, D0 + 0.16, rz);
    const cx = PAN_AT[0] + 1.25, cz = PAN_AT[2] - 0.25;
    out.places.push(person(cam, { i: 82, o: FOLK[2], okey: "f2" }, cx, D0 + 0.16, cz, { side: false, mirror: false },
      { mode: "stand", expr: "shock", facing: -1, blink: lidAt(t, 82) }, {}));
    blob(out, cx, D0 + 0.16, cz);
    addSmokeAndHeat(out, t, PAN_AT[0], PAN_AT[1] + 0.06, PAN_AT[2], 0.75, 9);
  }

  // Shots 10 & 11: Builders politely pay £900 -> Unluckily, still a 500-foot death ray aimed at the street
  if (id === 10 || id === 11) {
    const bx = JAG_AT[0] - 1.45, bz = JAG_AT[2] + 1.55;
    const mx = JAG_AT[0] - 0.15, mz = JAG_AT[2] + 1.60;
    out.places.push(person(cam, { i: 98, o: BUILDER, okey: "bld" }, bx, D0, bz, { side: false, mirror: false },
      { mode: "stand", expr: id === 10 ? "smile" : "nervous", prop: "cash", facing: -1, blink: lidAt(t, 98, [41.9]) }, {}));
    blob(out, bx, D0, bz);
    out.places.push(person(cam, { i: 11, o: MARTIN, okey: "martin" }, mx, D0, mz, { side: false, mirror: false },
      { mode: "stand", expr: id === 10 ? "relief" : "shock", facing: 1, blink: lidAt(t, 11, [41.9]) }, {}));
    blob(out, mx, D0, mz);
    if (id === 11) {
      addSmokeAndHeat(out, t, JAG_AT[0] - 0.25, D0 + 0.92, JAG_AT[2] + 0.75, 1.15, 11);
      for (const [i, x, z] of [[0, -4.5, -15.4], [1, 0.5, -15.5], [2, 8.5, -15.2]] as const) {
        out.places.push(person(cam, { i: 30 + i, o: FOLK[i], okey: `f${i}` }, x, D0 + 0.16, z, { side: false, mirror: false },
          { mode: "stand", expr: "shock", blink: lidAt(t, 30 + i) }, {}));
        blob(out, x, D0 + 0.16, z);
      }
    }
  }

  // Shot 12: Flat glass wall bounces sunlight away in neat, harmless rows
  if (id === 12) {
    for (let i = 0; i < 5; i++) {
      const x = -31.5 + i * 2.8, z = 11.5 + (i % 2) * 1.4;
      out.places.push(person(cam, { i: 120 + i, o: FOLK[i % 6], okey: `f${i % 6}` }, x, D0, z, { side: false, mirror: false },
        { mode: "stroll", phase: q((t * 0.7 + i * 0.2) % 1, 60), expr: "smile", blink: lidAt(t, 120 + i) }, {}));
      blob(out, x, D0, z);
    }
  }

  // Shot 13: Curved shaving mirror in the sun -> every beam angles inward to one scorching spot
  if (id === 13) {
    const px = PARK[0] - 1.35, pz = PARK[2] + 0.15;
    const kx = PARK[0] + 1.35, kz = PARK[2] + 0.20;
    const hot = t >= 52.4;
    out.places.push(person(cam, { i: 77, o: PARENT, okey: "parent" }, px, D0, pz, { side: false, mirror: false },
      { mode: "stand", expr: hot ? "shock" : "smile", facing: 1, blink: lidAt(t, 77, [52.4]) }, {}));
    blob(out, px, D0, pz);
    out.places.push(person(cam, { i: 78, o: KID, okey: "kid" }, kx, D0, kz, { side: false, mirror: false },
      { mode: "stand", expr: hot ? "shock" : "grin", facing: -1, blink: lidAt(t, 78, [52.4]) }, {}, 0.75));
    blob(out, kx, D0, kz, 0.75);
    if (hot) {
      const fxX = PARK[0], fxY = D0 + 1.15, fxZ = PARK[2] - 0.95;
      addSmokeAndHeat(out, t, fxX, fxY, fxZ, 0.85, 13);
      const bu = q(((t - 52.4) * 1.5) % 1, 30);
      out.fx.push({ key: `spotburst${bu}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, bu), x: fxX, y: fxY + 0.1, z: fxZ, w: 0.75, h: 0.75 });
    }
  }

  // Shot 14: 37 floors of curved glass acting like one giant magnifying mirror aimed at the parking spaces
  if (id === 14) {
    const mx = JAG_AT[0] + 1.85, mz = JAG_AT[2] - 0.4;
    out.places.push(person(cam, { i: 11, o: MARTIN, okey: "martin" }, mx, D0, mz, { side: false, mirror: false },
      { mode: "stand", expr: "shock", facing: -1, blink: lidAt(t, 11) }, {}));
    blob(out, mx, D0, mz);
    addSmokeAndHeat(out, t, JAG_AT[0] - 0.25, D0 + 0.92, JAG_AT[2] + 0.75, 1.15, 14);
  }

  // Shot 15: Bolting millions of dollars of metal shades across every single floor
  if (id === 15) {
    const hk = q(hammerK(t, BOLT_HITS), 30);
    const workers: [number, number, Outfit, string][] = [
      [-2.4, -6.4, OFFICER, "off"],
      [-0.4, -6.2, BUILDER, "bld"],
      [1.6, -6.5, WORKERS[0], "wk0"],
    ];
    workers.forEach(([x, z, o, ok], idx) => {
      out.places.push(person(cam, { i: 90 + idx, o, okey: ok }, x, D0, z, { side: false, mirror: false },
        { mode: "stand", expr: "stern", prop: ["hammer", hk], facing: 1, blink: lidAt(t, 90 + idx) }, {}));
      blob(out, x, D0, z);
    });
    for (const [bi, th] of BOLT_HITS.entries()) if (t >= th && t < th + 6 / FPS) {
      const u = q((t - th) / (6 / FPS), 30);
      const fy = D0 + 8.0 + bi * 8.5;
      out.fx.push({ key: `boltburst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u), x: (bi - 1) * 4.5, y: fy, z: 16.5, w: 2.2, h: 2.2 });
    }
  }

  // Shot 16: Finale on the shaded street
  if (id === 16) {
    const mx = JAG_AT[0] + 1.65, mz = JAG_AT[2] - 0.45;
    out.places.push(person(cam, { i: 11, o: MARTIN, okey: "martin" }, mx, D0, mz, { side: false, mirror: false },
      { mode: "stand", expr: "grin", wave: q(Math.sin(t * 7), 30), facing: -1, blink: lidAt(t, 11) }, {}));
    blob(out, mx, D0, mz);
    const ox = BUDGET_AT[0] + 1.15, oz = BUDGET_AT[2] - 0.3;
    out.places.push(person(cam, { i: 99, o: OFFICER, okey: "off" }, ox, D0, oz, { side: false, mirror: false },
      { mode: "stand", expr: "nervous", facing: 1, blink: lidAt(t, 99) }, {}));
    blob(out, ox, D0, oz);
    // Strolling pedestrians enjoying the now-shaded street
    for (let i = 0; i < 12; i++) {
      const sp = 0.6 + hh(i) * 0.4, x = -14 + i * 2.5 - sp * (t - 64.8) * (i % 2 ? 1 : -1), z = i % 2 ? -14.8 : -4.5;
      out.places.push(person(cam, { i: 150 + i, o: FOLK[i % 6], okey: `f${i % 6}` }, x, D0 + (z < -12 ? 0.16 : 0), z, { side: false, mirror: false },
        { mode: "stroll", phase: q((t * 0.9 + i * 0.17) % 1, 60), expr: "smile", blink: lidAt(t, 150 + i) }, {}));
      blob(out, x, D0 + (z < -12 ? 0.16 : 0), z);
    }
  }

  return out;
};

export const snapFx = (_tau: number, _at: V3, _out: Stage) => {};
export const splashFx = (_tau: number, _out: Stage) => {};
export const creakFx = (_t: number, _pts: V3[], _out: Stage, _size = 0.8) => {};
export { FPS, swingKid };
