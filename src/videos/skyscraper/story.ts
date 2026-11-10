// Timeline of "The Skyscraper That Melted a Car": 16 shots timed to ~/skyscraper-short/voice/words.json,
// story physics (concave glass tower, sunshade budget cut, creeping solar focal strip, smoking doormat,
// cracking tiles, blistering van, melting Jaguar mirror & panels, sizzling egg in pan, flat vs concave mirror rays,
// retrofitted brise-soleil fins) and reference camera grammar (continuous push-ins, smootherstep glides, 7f kicks).
export const FPS = 30;
export const TOTAL = 2055;
export const D0 = 6.0; // street ground level (m)
export const HALF = 27;
export const FILES = [-1.65, -0.55, 0.55, 1.65];
export const ROW_GAP = 1.3;
export const COUNT = 24;
export const PARK: V3 = [70, D0, -75]; // shaving mirror demonstration table in the park square
export type V3 = [number, number, number];

// Key street landmarks
export const TOWER_Z = 18.0; // South concave facade base z
export const BUDGET_AT: V3 = [-4.2, D0, -6.5];
export const DOORMAT_AT: V3 = [-8.0, D0 + 0.16, -16.4];
export const TILES_AT: V3 = [-5.5, D0 + 0.16, -15.4];
export const VAN_AT: V3 = [-1.2, D0, -11.8];
export const JAG_AT: V3 = [4.5, D0, -9.5];
export const PAN_AT: V3 = [0.8, D0 + 0.16, -14.8];
export const SIGN_AT: V3 = BUDGET_AT;
export const ANCHOR: V3 = TILES_AT;

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

// ---------------- story physics (tau = story time in seconds) ----------------
export const SNAP = 15.80;   // "cut" (cutting window shades from the budget)
export const DROP0 = 25.16;  // "crack" (sidewalk tiles crack)
export const DROP1 = 31.08;  // "mirror and panels drooping" (Jaguar melt reveal)
export const BOLT_HITS = [61.80, 62.45, 63.10]; // bolting metal shades across every floor

export const front = (tau: number) => 12 - 0.8 * (tau - 4.4);
export const marchPhase = (tau: number) => ((tau % 1) + 1) % 1;
export const stomp = (_tau: number) => 1.0;
export const shapeZ = (z: number) => (Math.abs(z) < HALF ? Math.cos((Math.PI * z) / (2 * HALF)) : 0);
export const dropW = (z: number) => smooth((20 - z) / 26);
export const dropU = (tau: number) => clamp01((tau - 29.8) / 2.6);
export const DROP_H = 6.6;

/** Story state at frame/time for the skyscraper world */
export type BridgeState = {
  bounce: number;
  drop: number;       // 0 = pristine Jaguar, 1 = fully drooped/melted Jaguar mirror & panels
  snap: number;       // 0..1 budget shades cut progress in Shot 4
  collapsed: boolean;
  shades: number;     // 0 = bare glass, 1 = full horizontal brise-soleil louvers installed
  rayIntensity: number; // 0..1 solar death-ray beam intensity from the concave tower
  spotX: number;      // x position of the creeping focal strip on the south street
  spotZ: number;      // z position of the focal strip on the south street
  doormatSmoke: number; // 0..1 charring + smoke on barbershop doormat
  tileCrack: number;  // 0..1 cracked sidewalk tiles heave
  vanBlister: number; // 0..1 paint blisters on delivery van
  eggCook: number;    // 0..1 frying pan + sizzling egg on bricks
};

export const deckY = (_z: number, _b: BridgeState) => D0;
export const snapEnd = (snap: number): V3 => {
  const u = easeOut(snap);
  return [ANCHOR[0] - 0.3 * u, ANCHOR[1] + 1.2 * u, ANCHOR[2] + 0.5 * u];
};

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Crowd = "street" | "hook" | "builders" | "budget" | "beam" | "doormat" | "tiles_van" | "jaguar" | "egg" | "payout" | "deathray" | "flat_glass" | "mirror_park" | "magnify" | "retrofit" | "finale";
export type ShotDef = { id: number; a: number; b: number; light: Light; crowd: Crowd; tau: (t: number) => number; towns?: boolean; sunAz?: number; sunEl?: number };

export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 131, light: "day", crowd: "hook", tau: (t) => 30.6 + t * 0.55 },
  { id: 2, a: 131, b: 256, light: "day", crowd: "street", tau: (t) => t, towns: true },
  { id: 3, a: 256, b: 410, light: "day", crowd: "builders", tau: (t) => t },
  { id: 4, a: 410, b: 518, light: "day", crowd: "budget", tau: (t) => t },
  { id: 5, a: 518, b: 649, light: "day", crowd: "beam", tau: (t) => t },
  { id: 6, a: 649, b: 724, light: "day", crowd: "doormat", tau: (t) => t },
  { id: 7, a: 724, b: 820, light: "day", crowd: "tiles_van", tau: (t) => t },
  { id: 8, a: 820, b: 1000, light: "day", crowd: "jaguar", tau: (t) => t },
  { id: 9, a: 1000, b: 1151, light: "day", crowd: "egg", tau: (t) => t },
  { id: 10, a: 1151, b: 1255, light: "day", crowd: "payout", tau: (t) => t },
  { id: 11, a: 1255, b: 1352, light: "day", crowd: "deathray", tau: (t) => t },
  { id: 12, a: 1352, b: 1457, light: "golden", crowd: "flat_glass", tau: (t) => t },
  { id: 13, a: 1457, b: 1624, light: "golden", crowd: "mirror_park", tau: (t) => t },
  { id: 14, a: 1624, b: 1793, light: "golden", crowd: "magnify", tau: (t) => t },
  { id: 15, a: 1793, b: 1946, light: "day", crowd: "retrofit", tau: (t) => t },
  { id: 16, a: 1946, b: TOTAL, light: "day", crowd: "finale", tau: (t) => t, towns: true },
];

/** crossfades (frames) at place/time/lighting changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 9: 6, 12: 8, 13: 8, 14: 8, 15: 8, 16: 8 };
export const FLASH_AT = 131;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

export const bridgeState = (id: number, t: number): BridgeState => {
  const s = SHOTS[id - 1];
  const tau = s.tau(t);
  // Shades on tower: visible in Shot 4 before "cut" (15.80s), then retrofitted in Shot 15 (61.5..64.3s), full in Shot 16
  let shades = 0;
  if (id === 4) shades = 1 - smooth((tau - 15.75) / 0.35);
  else if (id === 15) shades = smooth((tau - 61.5) / 2.7);
  else if (id === 16) shades = 1;

  // Death ray intensity: active in Hook (id 1), ramps on in Shot 5 (17.6s), stays on through Shot 11 & 14, blocked in Shot 15 as shades go up
  let rayIntensity = 0;
  if (id === 1) rayIntensity = 1;
  else if (id === 5) rayIntensity = smooth((tau - 17.6) / 0.9);
  else if (id >= 6 && id <= 11) rayIntensity = 1;
  else if (id === 14) rayIntensity = 1;
  else if (id === 15) rayIntensity = Math.max(0, 1 - shades * 1.45);

  // Focal spot position on street
  const spotX = id === 1 ? JAG_AT[0] : lin([
    [18.5, -12.0], [21.5, -8.0], [24.0, -7.8], [25.2, TILES_AT[0]], [26.8, VAN_AT[0]], [28.5, JAG_AT[0]], [33.5, PAN_AT[0]], [38.4, JAG_AT[0]],
  ], tau);
  const spotZ = id === 1 ? JAG_AT[2] : lin([
    [18.5, -16.2], [24.0, -16.4], [25.2, TILES_AT[2]], [26.8, VAN_AT[2]], [28.5, JAG_AT[2]], [33.5, PAN_AT[2]], [38.4, JAG_AT[2]],
  ], tau);

  // Melted Jaguar state (drop = meltU)
  const drop = id === 1 ? smooth((tau - 30.7) / 1.8)
    : id === 8 ? smooth((tau - 29.8) / 2.4)
    : id >= 9 && id <= 11 ? (id === 10 ? 1 - 0.7 * smooth((tau - 39.8) / 1.5) : 0.85)
    : id === 14 ? 0.9 : 0;

  const snap = id === 4 ? smooth((tau - SNAP) / 0.4) : id > 4 ? 1 : 0;
  const doormatSmoke = id === 6 ? smooth((tau - 22.0) / 1.2) : id > 6 && id <= 11 ? 0.7 : 0;
  const tileCrack = tau >= DROP0 ? smooth((tau - DROP0) / 0.25) : 0;
  const vanBlister = tau >= 25.8 ? smooth((tau - 25.8) / 0.8) : 0;
  const eggCook = id === 9 ? smooth((tau - 35.0) / 2.2) : 0;

  return {
    bounce: 0,
    drop,
    snap,
    collapsed: drop > 0.5,
    shades,
    rayIntensity,
    spotX,
    spotZ,
    doormatSmoke,
    tileCrack,
    vanBlister,
    eggCook,
  };
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };

export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3,
  look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k,
  roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;

const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });

// ---- Shot framings (every hold has pushK >= 0.002 so zero static frames occur) ----
// Shot 1 (Hook, 0..131): Wide street 3/4 from behind the Jaguar looking across to the glowing Walkie-Talkie -> 3/4 CU melting Jaguar -> low angle up at tower
const S1a = (f: number) => dolly([6.8, D0 + 2.4, -14.8], [1.8, D0 + 5.5, 6.0], pushK(f, 0, 0.0028), { fov: 44 });
const S1b = (f: number) => dolly([JAG_AT[0] - 2.3, D0 + 1.55, JAG_AT[2] + 3.4], [JAG_AT[0] - 0.1, D0 + 0.85, JAG_AT[2] + 0.4], pushK(f, 34, 0.003), { fov: 38, roll: -0.04 });
const S1c = (f: number) => dolly([4.8, D0 + 1.2, -13.5], [0.5, D0 + 11.0, 14.0], pushK(f, 76, 0.0032), { fov: 44, roll: 0.04 });

// Shot 2 (Establishing aerial, 131..256): London skyline + 37-story glass tower -> closer heroic angle on "newest pride of the city"
const S2a = (f: number) => zoom([18.5, D0 + 19.5, -26.0], [0, D0 + 15.0, 16.0], 46, pushK(f, 127, 0.0024));
const S2b = (f: number) => zoom([9.5, D0 + 6.0, -14.8], [0, D0 + 14.0, 16.0], 44, pushK(f, 185, 0.0022, 0.006, 35));

// Shot 3 (Curved glass bowl, 256..410): Top floors flaring outward against sky -> 3/4 side profile of the concave glass bowl wall
const S3a = (f: number) => dolly([-17.5, D0 + 9.5, -14.5], [-2.0, D0 + 24.5, 18.0], pushK(f, 256, 0.0025), { fov: 46 });
const S3b = (f: number) => dolly([-21.5, D0 + 15.5, 3.5], [-3.0, D0 + 18.5, 19.5], pushK(f, 325, 0.0028, 0.0055, 32), { fov: 44, roll: -0.035 });

// Shot 4 (Cutting window shades from budget, 410..518): Developer & easel side-by-side with tower behind -> cut on "cut the window shades"
const S4a = (f: number) => dolly([BUDGET_AT[0] - 0.5, D0 + 1.65, BUDGET_AT[2] - 5.2], [BUDGET_AT[0] - 0.35, D0 + 1.45, BUDGET_AT[2]], pushK(f, 410, 0.0026), { fov: 42 });
const S4b = (f: number) => dolly([BUDGET_AT[0] - 0.45, D0 + 1.55, BUDGET_AT[2] - 4.2], [BUDGET_AT[0] - 0.3, D0 + 1.45, BUDGET_AT[2]], pushK(f, 468, 0.0025, 0.006, 28), { fov: 38, roll: 0.035 });

// Shot 5 (August sun & creeping light strip, 518..649): Up at blazing sun over tower -> down along street as blinding strip creeps across shops
const S5a = (f: number) => zoom([2.5, D0 + 2.2, -9.5], [0, D0 + 24.0, 17.0], 46, pushK(f, 518, 0.003));
const S5b = (f: number) => {
  const u = clamp01((f - 556) / 90);
  return dolly([-2.5 + u * 2.0, D0 + 3.1, -9.2], [-8.2 + u * 2.5, D0 + 0.9, -16.2], pushK(f, 556, 0.0025), { fov: 42, roll: -0.03 });
};

// Shot 6 (Barbershop doormat smoking, 649..724): MS barbershop front & barber -> CU smoking doormat
const S6a = (f: number) => dolly([-5.8, D0 + 1.55, -11.4], [DOORMAT_AT[0], D0 + 1.1, DOORMAT_AT[2] - 0.6], pushK(f, 649, 0.0028), { fov: 40 });
const S6b = (f: number) => dolly([-6.6, D0 + 1.05, -13.4], [DOORMAT_AT[0], D0 + 0.32, DOORMAT_AT[2]], pushK(f, 682, 0.0032), { fov: 36, roll: 0.03 });

// Shot 7 (Sidewalk tiles crack & delivery van blisters, 724..820): CU tiles cracking -> MS delivery van blistering
const S7a = (f: number) => dolly([TILES_AT[0] - 1.5, D0 + 1.25, TILES_AT[2] + 2.3], [TILES_AT[0], D0 + 0.22, TILES_AT[2]], pushK(f, 724, 0.003, 0.0055, 25), { fov: 36 });
const S7b = (f: number) => dolly([VAN_AT[0] - 1.8, D0 + 1.65, VAN_AT[2] + 4.4], [VAN_AT[0], D0 + 1.2, VAN_AT[2] + 0.5], pushK(f, 766, 0.0028), { fov: 40, roll: -0.035 });

// Shot 8 (Shiny black Jaguar parked -> owner returns -> mirror & panels drooping like wax, 820..1000)
const S8a = (f: number) => dolly([JAG_AT[0] - 2.8, D0 + 1.65, JAG_AT[2] + 5.2], [JAG_AT[0] + 0.2, D0 + 1.05, JAG_AT[2]], pushK(f, 820, 0.0025), { fov: 40 });
const S8b = (f: number) => dolly([JAG_AT[0] - 2.5, D0 + 1.65, JAG_AT[2] + 4.5], [JAG_AT[0] + 0.4, D0 + 1.15, JAG_AT[2]], pushK(f, 902, 0.0028), { fov: 38, roll: 0.035 });
const S8c = (f: number) => dolly([JAG_AT[0] - 2.1, D0 + 1.45, JAG_AT[2] + 3.1], [JAG_AT[0] - 0.1, D0 + 0.85, JAG_AT[2] + 0.4], pushK(f, 948, 0.0032, 0.006, 30), { fov: 36, roll: -0.04 });

// Shot 9 (Reporter frying pan & egg on the bricks, 1000..1151)
const S9a = (f: number) => dolly([2.4, D0 + 1.45, -10.0], [PAN_AT[0], D0 + 0.85, PAN_AT[2] - 0.4], pushK(f, 994, 0.0025), { fov: 40 });
const S9b = (f: number) => dolly([1.5, D0 + 0.72, -12.4], [PAN_AT[0], D0 + 0.24, PAN_AT[2]], pushK(f, 1072, 0.003, 0.0055, 30), { fov: 34, roll: 0.03 });

// Shots 10 & 11 (Builders politely pay £900 in front of Jaguar -> pull back to reveal 500-foot death ray aimed at street, 1151..1352)
const S10a = (f: number) => dolly([JAG_AT[0] - 1.2, D0 + 1.55, JAG_AT[2] + 5.2], [JAG_AT[0] - 0.8, D0 + 1.35, JAG_AT[2] + 1.6], pushK(f, 1151, 0.0025), { fov: 38, roll: -0.025 });
const S11a = (f: number) => dolly([7.8, D0 + 1.85, -15.4], [1.5, D0 + 9.0, 10.0], pushK(f, 1255, 0.0026, 0.0055, 32), { fov: 44, roll: 0.04 });

// Shot 12 (Golden physics 1: Flat glass wall bounces sunlight in neat rows, 1352..1457)
const S12a = (f: number) => zoom([-17.5, D0 + 5.5, -8.5], [-26.0, D0 + 7.5, 16.0], 42, pushK(f, 1344, 0.0024));

// Shot 13 (Golden physics 2: Curved shaving mirror in the sun -> beams angle inward to one scorching spot, 1457..1624)
const S13a = (f: number) => dolly([PARK[0] + 1.8, D0 + 1.85, PARK[2] - 5.2], [PARK[0], D0 + 1.35, PARK[2] + 0.2], pushK(f, 1449, 0.0024), { fov: 38 });
const S13b = (f: number) => dolly([PARK[0] + 0.8, D0 + 1.75, PARK[2] - 3.6], [PARK[0], D0 + 1.22, PARK[2] - 0.4], pushK(f, 1528, 0.0028, 0.006, 32), { fov: 36, roll: -0.03 });

// Shot 14 (Golden physics 3: 37 floors of curved glass acting like one giant magnifying mirror aimed at parking spaces, 1624..1793)
const S14a = (f: number) => zoom([15.5, D0 + 8.5, -14.8], [1.5, D0 + 11.0, 6.0], 44, pushK(f, 1616, 0.0024));
const S14b = (f: number) => dolly([6.8, D0 + 1.5, -14.5], [1.5, D0 + 10.5, 12.0], pushK(f, 1710, 0.0028), { fov: 42, roll: 0.035 });

// Shot 15 (Bolting millions of dollars of metal shades across every single floor, 1793..1946)
const S15a = (f: number) => dolly([-2.5, D0 + 1.6, -12.0], [-1.0, D0 + 1.5, -6.0], pushK(f, 1785, 0.0026), { fov: 40 });
const S15b = (f: number) => zoom([8.5, D0 + 5.5, -14.0], [0, D0 + 14.5, 17.0], 42, pushK(f, 1842, 0.0025, 0.005, 28));

// Shot 16 (Finale: All because someone cut the sunshades from the budget, 1946..2055)
const S16a = (f: number) => dolly([5.8, D0 + 1.65, -13.5], [1.8, D0 + 2.2, -4.0], pushK(f, 1938, 0.0026), { fov: 40 });
const S16b = (f: number) => dolly([-2.8, D0 + 1.6, -12.2], [0, D0 + 2.5, -3.0], pushK(f, 1968, 0.0022, 0.0055, 28), { fov: 40 });
const CRANE: V3[] = [[4.0, D0 + 14.5, -16.0], [14.0, D0 + 21.0, -26.0], [0, D0 + 13.5, 14.0]];
const S16c = (f: number): Shot => {
  const a = S16b(1992), s = glide((f - 1992) / 63), r = 1 - s, [C, B, L] = CRANE;
  return {
    pos: [0, 1, 2].map((i) => r * r * a.pos[i] + 2 * s * r * C[i] + s * s * B[i]) as V3,
    look: [0, 1, 2].map((i) => a.look[i] + (L[i] - a.look[i]) * s) as V3,
    fov: (a.fov ?? 40) + (44 - (a.fov ?? 40)) * s,
    roll: 0,
  };
};

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: S1a },
    { f: 34, dur: 28, s: S1b }, // centred on 48 ("melted a luxury car")
    { f: 76, dur: 26, s: S1c }, // centred on 89 ("standing across the street")
  ],
  2: [
    { f: 127, s: S2a },
    { f: 185, dur: 24, s: S2b }, // centred on 197 ("thirty-seven-story glass tower")
  ],
  3: [
    { f: 256, s: S3a },
    { f: 325, dur: 28, s: S3b }, // centred on 339 ("curve the glass wall outward")
  ],
  4: [
    { f: 410, s: S4a },
    { f: 468, cut: true, s: S4b }, // cut on "cut the window shades"
    { f: 468, dur: 20, s: rolled(S4b, -0.035) },
  ],
  5: [
    { f: 518, s: S5a },
    { f: 556, cut: true, s: S5b }, // cut on "Down on the street"
  ],
  6: [
    { f: 649, s: S6a },
    { f: 682, dur: 22, s: S6b }, // glide to smoking doormat
  ],
  7: [
    { f: 724, s: S7a },
    { f: 766, cut: true, s: S7b }, // cut on "and paint blisters on a delivery van"
  ],
  8: [
    { f: 820, s: S8a },
    { f: 902, cut: true, s: S8b }, // cut on "and comes back"
    { f: 948, cut: true, s: S8c }, // cut on "drooping like melted wax"
  ],
  9: [
    { f: 994, s: S9a },
    { f: 1072, dur: 24, s: S9b }, // glide into sizzling egg in frying pan
  ],
  10: [
    { f: 1151, s: S10a },
  ],
  11: [
    { f: 1255, cut: true, s: S11a }, // reveal 500-foot death ray
  ],
  12: [
    { f: 1344, s: S12a },
  ],
  13: [
    { f: 1449, s: S13a },
    { f: 1528, dur: 24, s: S13b }, // glide into scorching focal spot
  ],
  14: [
    { f: 1616, s: S14a },
    { f: 1710, cut: true, s: S14b }, // cut on "aimed at the parking spaces"
  ],
  15: [
    { f: 1785, s: S15a },
    { f: 1842, cut: true, s: S15b }, // cut to tower as metal shades bolt across every floor
  ],
  16: [
    { f: 1938, s: S16a },
    { f: 1968, dur: 22, s: S16b },
    { f: 1992, cut: true, s: S16c }, // crane pull-out to end
  ],
};

// Impact kicks (7 frames, alternating sign): budget cut, tile crack, Jaguar melt reveal, 3 shade-bolting impacts
const KICKS: [number, number][] = [[SNAP, 0.9], [DROP0, 1.1], [DROP1, 1.2], [61.80, 0.6], [62.45, 0.6], [63.10, 0.7]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- lens: depth of field + foreground framing ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: 34, dur: 28, cInf: 12, focus: () => [JAG_AT[0], D0 + 1.0, JAG_AT[2]] },
  { f: 76, dur: 26, cInf: 0 },
  { f: 131, cInf: 0 }, // aerial + tower wides stay sharp
  { f: 410, cInf: 10, focus: () => [BUDGET_AT[0], D0 + 1.5, BUDGET_AT[2]] },
  { f: 468, cInf: 13, focus: () => [BUDGET_AT[0], D0 + 1.5, BUDGET_AT[2]] },
  { f: 518, cInf: 0 },
  { f: 649, cInf: 10, focus: () => [DOORMAT_AT[0], D0 + 0.9, DOORMAT_AT[2]] },
  { f: 682, dur: 22, cInf: 14, focus: () => [DOORMAT_AT[0], D0 + 0.25, DOORMAT_AT[2]] },
  { f: 724, cInf: 14, focus: () => [TILES_AT[0], D0 + 0.22, TILES_AT[2]] },
  { f: 766, cInf: 11, focus: () => [VAN_AT[0], D0 + 1.15, VAN_AT[2] + 0.8] },
  { f: 820, cInf: 10, focus: () => [JAG_AT[0], D0 + 1.1, JAG_AT[2]] },
  { f: 948, cInf: 15, focus: () => [JAG_AT[0] - 0.2, D0 + 0.92, JAG_AT[2] + 0.7] },
  { f: 1000, cInf: 10, focus: () => [PAN_AT[0], D0 + 0.8, PAN_AT[2]] },
  { f: 1072, dur: 24, cInf: 15, focus: () => [PAN_AT[0], D0 + 0.24, PAN_AT[2]] },
  { f: 1151, cInf: 11, focus: () => [JAG_AT[0] + 0.8, D0 + 1.35, JAG_AT[2] - 0.4] },
  { f: 1255, cInf: 0 },
  { f: 1352, cInf: 5 },
  { f: 1457, cInf: 10, focus: () => [PARK[0], D0 + 1.3, PARK[2]] },
  { f: 1528, dur: 24, cInf: 14, focus: () => [PARK[0], D0 + 1.18, PARK[2] - 0.8] },
  { f: 1624, cInf: 0 },
  { f: 1793, cInf: 9, focus: () => [-1.0, D0 + 1.5, -6.0] },
  { f: 1842, cInf: 0 },
  { f: 1946, cInf: 0 },
];

export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  { a: 1457, b: 1624, kit: "plant_bushDetailed", pos: [PARK[0] + 2.3, D0, PARK[2] - 3.6], s: 1.1, yaw: 0.4 },
];
