// The London Eastcheap & 20 Fenchurch Street ("Walkie-Talkie") world as one three.js scene:
// sky, clouds, London street & shopfronts, the concave glass skyscraper with toggleable brise-soleil sunshades,
// flat glass comparison building, barbershop doormat, cracking sidewalk tiles, delivery van with blistering paint,
// shiny black Jaguar XJ with drooping mirror & panels, reporter's frying pan with sizzling egg,
// park table with curved shaving mirror & converging sunbeams, and the 2D cartoon cast.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Batch, V, boxGeo, lam, buildTown, towerPt, flagTex, Kit, Ray, kitClone } from "./build";
import { beam, rep, ctex, stoneHD, cobbleHD, grassHD, cloudHD } from "./paint";
import { Pen, fxSign } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, SIGN_AT, SU_SWING } from "./cast";
import {
  FPS, D0, SHOTS, PARK, ANCHOR, SNAP,
  BUDGET_AT, DOORMAT_AT, TILES_AT, VAN_AT, JAG_AT, PAN_AT,
  camAt, bridgeState, BridgeState, V3, smooth, clamp01, FOREGROUND, ShotDef,
} from "./story";

// ---------------- procedural 3D toon trees & bushes kit (zero HTTP 404s, instant load) ----------------
let kitP: Promise<Kit> | null = null;
const makeTree = (foliageCols: string[], h: number, rCrown: number, cone = false): THREE.Object3D => {
  const g = new THREE.Group();
  const trunkM = new THREE.MeshLambertMaterial({ color: "#6e4e3a" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, h * 0.42, 8), trunkM);
  trunk.position.y = h * 0.21;
  g.add(trunk);
  foliageCols.forEach((col, i) => {
    const m = new THREE.MeshLambertMaterial({ color: col });
    const rad = rCrown * (1 - i * 0.18);
    const mesh = cone
      ? new THREE.Mesh(new THREE.ConeGeometry(rad, h * 0.55, 10), m)
      : new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), m);
    mesh.position.y = h * (0.48 + i * 0.18);
    if (!cone) mesh.scale.set(1, 0.85, 1);
    g.add(mesh);
  });
  return g;
};
const makeBush = (col: string, rx: number, ry: number): THREE.Object3D => {
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: col });
  for (const [dx, dy, dz, s] of [[0, ry * 0.55, 0, 1], [-rx * 0.45, ry * 0.42, 0.08, 0.75], [rx * 0.45, ry * 0.4, -0.06, 0.72]] as const) {
    const sp = new THREE.Mesh(new THREE.SphereGeometry(rx * s, 10, 8), m);
    sp.scale.set(1, ry / rx, 0.9);
    sp.position.set(dx, dy, dz);
    g.add(sp);
  }
  return g;
};
const makeFlower = (col: string): THREE.Object3D => {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 6), new THREE.MeshLambertMaterial({ color: "#4f8f43" }));
  stem.position.y = 0.25;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshLambertMaterial({ color: col }));
  head.position.y = 0.52;
  g.add(stem, head);
  return g;
};
export const loadKit = (): Promise<Kit> => {
  if (!kitP) {
    const kit: Kit = {
      tree_oak: makeTree(["#589e47", "#6bb357"], 4.2, 1.35),
      tree_default: makeTree(["#4e9442", "#62a851"], 4.0, 1.2),
      tree_detailed: makeTree(["#5ea34b", "#72b85c", "#80c468"], 4.4, 1.3),
      tree_fat: makeTree(["#539944", "#66ad54"], 3.8, 1.5),
      tree_cone: makeTree(["#3f7d3c", "#4d8e48"], 4.5, 1.15, true),
      "tree-high-round": makeTree(["#5a9e49", "#6eb55b"], 4.6, 1.25),
      tree: makeTree(["#549945", "#68ae56"], 4.0, 1.2),
      plant_bushLarge: makeBush("#529644", 0.65, 0.52),
      plant_bushDetailed: makeBush("#5ea34e", 0.6, 0.48),
      plant_bush: makeBush("#4d8f40", 0.55, 0.44),
      hedge: makeBush("#4a8a3e", 0.85, 0.55),
      flower_redA: makeFlower("#d94c4c"),
      flower_yellowA: makeFlower("#ebbf3b"),
      flower_purpleA: makeFlower("#8c5ec9"),
    };
    kitP = Promise.resolve(kit);
  }
  return kitP;
};

export const BOLT: V3 = [ANCHOR[0], ANCHOR[1] + 0.24, ANCHOR[2]];
export const chainY = (_z: number, _b: BridgeState) => D0 + 4.0;

/** Sun disc, halo, and glowing solar beam textures */
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
const smokeTex = () => ctex("smoke", 256, 256, (g) => {
  const p = new Pen(g);
  for (const [x, y, r, c] of [[90, 150, 60, "#8f8d96"], [150, 120, 70, "#a3a1aa"], [170, 165, 55, "#8f8d96"], [120, 100, 50, "#b4b2ba"]] as const) p.ell(x, y, r, r * 0.85, c, 0);
});

const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 2: { az: 120 }, 12: { az: -55, el: 14 }, 13: { az: -35, el: 18 }, 14: { az: -60, el: 12 } };

const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a - 8; f < s.b + 8; f += 2) {
    const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
    const fw = look.clone().sub(o), len = fw.length();
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};

/** Orient a unit cylinder (height 1 along y) between point a and point b with radius r0 (at a) and r1 (at b) */
const placeBeam = (mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, w: number) => {
  const dir = b.clone().sub(a), len = Math.max(0.01, dir.length());
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(V(0, 1, 0), dir.divideScalar(len));
  mesh.scale.set(w, len, w);
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private swing: Actor;
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private fill: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private fgs: { o: THREE.Object3D; a: number; b: number }[] = [];
  private smoke: { m: THREE.Mesh; mat: THREE.MeshLambertMaterial; top: V3; k: number }[] = [];
  private clouds: THREE.Mesh[] = [];

  // Skyscraper story dynamic 3D objects
  private sign = new THREE.Group();
  private signBoardUncut: THREE.Mesh;
  private signBoardCut: THREE.Mesh;
  private louverRows: THREE.Group[] = [];
  private doormatScorch: THREE.Mesh;
  private crackTiles: THREE.Mesh[] = [];
  private vanGrp = new THREE.Group();
  private vanBlisters: THREE.Mesh[] = [];
  private jagMirror: THREE.Group;
  private jagPanels: THREE.Mesh[] = [];
  private jagDrips: THREE.Mesh[] = [];
  private panGroup = new THREE.Group();
  private eggWhite: THREE.Mesh;
  private eggYolk: THREE.Mesh;
  private shavingMirrorPivot = new THREE.Group();
  private shavingSpot: THREE.Mesh;
  private mirrorBeams: THREE.Mesh[] = [];
  private deathRays: THREE.Mesh[] = [];
  private flatRays: THREE.Mesh[] = [];
  private focalSpot: THREE.Mesh;

  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R = this.root;
    // ---- sky + light ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.fill = new THREE.DirectionalLight("#9fb8ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.fill, this.fill.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    // ---- ground, London street, sidewalks & curbs (static batch) ----
    const b = new Batch();
    const grassM = lam("grassHD", () => ({ map: grassHD() }));
    const cobbleM = lam("cobbleHD", () => ({ map: cobbleHD() }));
    const roadM = lam("roadAsphalt", () => ({ color: "#585e6e" }));
    const copeM = lam("copeHD", () => ({ map: stoneHD("copeHD", ["#e6dccd", "#ddd3c3", "#ece4d6", "#d6cbba"], "#aea293") }));
    const paintM = lam("roadPaint", () => ({ color: "#f2ece1" }));
    const woodM = lam("wood", () => ({ map: beam() }));
    const sandM = lam("sand", () => ({ color: "#e2c992" }));

    // Urban courtyard stone under the city blocks + green lawn in the Park Square & outer hills
    b.add(quadUp(-900, 900, -900, -18.5, 450, 217.5), grassM);
    b.add(quadUp(-900, 900, 19.5, 900, 450, 217.5), grassM);
    b.add(quadUp(-48, 44, -46, -18.5, 24, 7, 0.008), copeM);
    b.add(quadUp(-48, 44, 19.5, 46, 24, 7, 0.008), copeM);
    // Roadway (z = -14.0 .. +14.0)
    b.add(quadUp(-400, 400, -14.0, 14.0, 200, 7, 0.005), roadM);
    // Dashed white centre road markings & parking bay lines
    for (let x = -80; x <= 80; x += 6) {
      b.add(quadUp(x - 1.4, x + 1.4, -0.18, 0.18, 1, 1, 0.02), paintM);
    }
    b.add(quadUp(1.5, 7.8, -11.6, -11.45, 1, 1, 0.02), paintM);
    b.add(quadUp(1.5, 7.8, -7.85, -7.7, 1, 1, 0.02), paintM);
    // Raised South Sidewalk (z = -18.5 .. -14.0) and North Sidewalk (z = 14.0 .. 19.5)
    b.add(quadUp(-200, 200, -18.5, -14.0, 100, 2.25, 0.15), cobbleM);
    b.add(quadUp(-200, 200, 14.0, 19.5, 100, 2.25, 0.15), cobbleM);
    // Stone curbs at z = -14.0 and z = +14.0
    b.add(boxGeo(V(-200, D0, -14.15), V(200, D0 + 0.17, -13.85), 2), copeM);
    b.add(boxGeo(V(-200, D0, 13.85), V(200, D0 + 0.17, 14.15), 2), copeM);

    // Park demonstration table at PARK (for Shot 13 curved shaving mirror)
    const sandG = new THREE.CircleGeometry(3.4, 32); sandG.rotateX(-Math.PI / 2);
    b.add(sandG, sandM, new THREE.Matrix4().makeTranslation(PARK[0], D0 + 0.012, PARK[2]));
    b.add(boxGeo(V(PARK[0] - 1.1, D0 + 0.98, PARK[2] - 1.25), V(PARK[0] + 1.1, D0 + 1.12, PARK[2] + 0.65), 1, true), woodM);
    for (const [lx, lz] of [[-0.95, -1.1], [0.95, -1.1], [-0.95, 0.5], [0.95, 0.5]] as const) {
      b.add(boxGeo(V(PARK[0] + lx - 0.08, D0, PARK[2] + lz - 0.08), V(PARK[0] + lx + 0.08, D0 + 1.0, PARK[2] + lz + 0.08), 1), woodM);
    }

    // Barbershop doormat base at DOORMAT_AT
    const matM = lam("coirMat", () => ({ color: "#9c6b43" }));
    const matBorderM = lam("coirBorder", () => ({ color: "#5e3d24" }));
    b.add(boxGeo(V(DOORMAT_AT[0] - 0.78, DOORMAT_AT[1], DOORMAT_AT[2] - 0.48), V(DOORMAT_AT[0] + 0.78, DOORMAT_AT[1] + 0.04, DOORMAT_AT[2] + 0.48), 1), matBorderM);
    b.add(boxGeo(V(DOORMAT_AT[0] - 0.68, DOORMAT_AT[1] + 0.01, DOORMAT_AT[2] - 0.38), V(DOORMAT_AT[0] + 0.68, DOORMAT_AT[1] + 0.05, DOORMAT_AT[2] + 0.38), 1), matM);

    b.build(R);
    buildTown(R, kit, sightLines());

    // ---- 1. Toggleable Continuous Horizontal Aluminum Sunshade Louvers (Brise-Soleil) on the Walkie-Talkie ----
    const finM = twoTone(new THREE.MeshPhongMaterial({ color: "#d5dfe8", specular: "#ffffff", shininess: 65 }), 0.18);
    const NFLOORS = 26, NX = 20;
    for (let fl = 1; fl <= NFLOORS; fl++) {
      const u = fl / (NFLOORS + 2);
      const rowGrp = new THREE.Group();
      // Build one continuous curved horizontal ribbon bar across the tower width so ink lines are smooth without segment seams
      const pts: THREE.Vector3[] = [];
      for (let ix = 0; ix <= NX; ix++) {
        const s = -0.97 + (1.94 * ix) / NX;
        const p = towerPt(u, s, -1);
        p.z -= 0.38;
        pts.push(p);
      }
      const posArr: number[] = [], norArr: number[] = [];
      const pushQ = (a: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, e: THREE.Vector3, nx: number, ny: number, nz: number) => {
        posArr.push(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z, a.x, a.y, a.z, d.x, d.y, d.z, e.x, e.y, e.z);
        for (let k = 0; k < 6; k++) norArr.push(nx, ny, nz);
      };
      const hh = 0.09, hd = 0.36;
      for (let ix = 0; ix < NX; ix++) {
        const p0 = pts[ix], p1 = pts[ix + 1];
        const a0 = V(p0.x, p0.y - hh, p0.z - hd), b0 = V(p1.x, p1.y - hh, p1.z - hd);
        const c0 = V(p1.x, p1.y + hh, p1.z - hd), d0 = V(p0.x, p0.y + hh, p0.z - hd);
        const a1 = V(p0.x, p0.y - hh, p0.z + hd), b1 = V(p1.x, p1.y - hh, p1.z + hd);
        const c1 = V(p1.x, p1.y + hh, p1.z + hd), d1 = V(p0.x, p0.y + hh, p0.z + hd);
        pushQ(a0, b0, c0, d0, 0, 0, -1); // front face (-z)
        pushQ(d0, c0, c1, d1, 0, 1, 0);  // top face (+y)
        pushQ(a1, b1, b0, a0, 0, -1, 0); // bottom face (-y)
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(posArr, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(norArr, 3));
      const bar = new THREE.Mesh(geo, finM);
      bar.castShadow = true; bar.receiveShadow = true;
      rowGrp.add(bar);
      R.add(rowGrp);
      this.louverRows.push(rowGrp);
    }

    // ---- 2. Scorch patch on Barbershop Doormat ----
    const scorchM = lam("scorchM", () => ({ color: "#262028" }));
    this.doormatScorch = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.03, 16), scorchM);
    this.doormatScorch.position.set(DOORMAT_AT[0], DOORMAT_AT[1] + 0.045, DOORMAT_AT[2]);
    R.add(this.doormatScorch);

    // ---- 3. Cracking Sidewalk Tiles at TILES_AT ----
    const darkCrackM = lam("darkCrack", () => ({ color: "#231e28" }));
    const crackBed = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.03, 1.3), darkCrackM);
    crackBed.position.set(TILES_AT[0], TILES_AT[1] + 0.005, TILES_AT[2]);
    R.add(crackBed);
    for (const [dx, dz] of [[-0.36, -0.3], [0.36, -0.3], [-0.36, 0.3], [0.36, 0.3]] as const) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.07, 0.56), copeM);
      slab.position.set(TILES_AT[0] + dx, TILES_AT[1] + 0.03, TILES_AT[2] + dz);
      slab.castShadow = true; slab.receiveShadow = true;
      this.crackTiles.push(slab);
      R.add(slab);
    }

    // ---- 4. Delivery Van with Blistering Paint at VAN_AT ----
    const vanGrp = this.vanGrp;
    vanGrp.position.set(VAN_AT[0], VAN_AT[1], VAN_AT[2]);
    const vanWhite = lam("vanWhite", () => ({ color: "#f0ece1" }));
    const vanTeal = lam("vanTeal", () => ({ color: "#2f7a78" }));
    const vanGlass = twoTone(new THREE.MeshPhongMaterial({ color: "#68b0e8", specular: "#ffffff", shininess: 85 }), 0.15);
    const tireM = lam("tireM", () => ({ color: "#2b2933" }));
    const blisterM = lam("blisterM", () => ({ color: "#e86f2c" }));
    // Cargo box + cab
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.75, 1.75), vanWhite);
    cargo.position.set(0.35, 1.22, 0);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.24, 0.32, 1.78), vanTeal);
    stripe.position.set(0.35, 0.95, 0);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.35, 1.72), vanWhite);
    cab.position.set(-1.65, 1.02, 0);
    const wshield = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.58, 1.48), vanGlass);
    wshield.position.set(-2.2, 1.32, 0);
    vanGrp.add(cargo, stripe, cab, wshield);
    for (const [wx, wz] of [[-1.45, -0.82], [-1.45, 0.82], [1.15, -0.82], [1.15, 0.82]] as const) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.24, 14).rotateX(Math.PI / 2), tireM);
      wh.position.set(wx, 0.38, wz);
      vanGrp.add(wh);
    }
    // Paint blisters on the +z side of the van
    for (const [bx, by, br] of [[-0.5, 1.35, 0.19], [0.05, 1.18, 0.23], [0.65, 1.42, 0.20], [1.15, 1.22, 0.22], [-0.2, 0.95, 0.17], [0.45, 0.98, 0.18]] as const) {
      const bl = new THREE.Mesh(new THREE.SphereGeometry(br, 12, 10), blisterM);
      bl.position.set(bx, by, 0.88);
      this.vanBlisters.push(bl);
      vanGrp.add(bl);
    }
    vanGrp.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    R.add(vanGrp);

    // ---- 5. Shiny Black Jaguar XJ with Drooping Wing Mirror & Panels at JAG_AT ----
    const jagGrp = new THREE.Group();
    jagGrp.position.set(JAG_AT[0], JAG_AT[1], JAG_AT[2]);
    const jagBlack = twoTone(new THREE.MeshPhongMaterial({ color: "#323b4f", specular: "#c8dff5", shininess: 85 }), 0.16);
    const chromeM = twoTone(new THREE.MeshPhongMaterial({ color: "#e4ecf5", specular: "#ffffff", shininess: 95 }), 0.12);
    const tailM = lam("tailRed", () => ({ color: "#c93434" }));
    // Lower body + cabin greenhouse
    const bodyLow = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.68, 1.76), jagBlack);
    bodyLow.position.set(0, 0.62, 0);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.56, 1.52), jagBlack);
    cabin.position.set(0.15, 1.20, 0);
    const winFront = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.48, 1.44), vanGlass);
    winFront.position.set(-0.92, 1.18, 0); winFront.rotation.z = -0.35;
    const winSide = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.44, 1.56), vanGlass);
    winSide.position.set(0.15, 1.20, 0);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.98), chromeM);
    grille.position.set(-2.08, 0.64, 0);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 1.80), chromeM);
    bumper.position.set(-2.08, 0.38, 0);
    for (const sz of [-0.62, 0.62]) {
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), chromeM);
      hl.position.set(-2.06, 0.70, sz);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.32), tailM);
      tl.position.set(2.06, 0.72, sz);
      jagGrp.add(hl, tl);
    }
    for (const [wx, wz] of [[-1.32, -0.86], [-1.32, 0.86], [1.32, -0.86], [1.32, 0.86]] as const) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 14).rotateX(Math.PI / 2), tireM);
      wh.position.set(wx, 0.36, wz);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.26, 12).rotateX(Math.PI / 2), chromeM);
      hub.position.set(wx, 0.36, wz);
      jagGrp.add(wh, hub);
    }
    jagGrp.add(bodyLow, cabin, winFront, winSide, grille, bumper);

    // Drooping Wing Mirror on the +z street side
    this.jagMirror = new THREE.Group();
    this.jagMirror.position.set(-0.62, 1.00, 0.88);
    const mirStem = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.30), jagBlack);
    mirStem.position.set(0, -0.06, 0.12);
    const mirHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), jagBlack);
    mirHead.scale.set(1.25, 0.9, 0.95);
    mirHead.position.set(0, -0.08, 0.26);
    const mirChrome = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.10, 0.16), chromeM);
    mirChrome.position.set(0, -0.08, 0.30);
    this.jagMirror.add(mirStem, mirHead, mirChrome);
    jagGrp.add(this.jagMirror);

    // Drooping Side Door Panels & Chrome Trim strips along +z side
    for (let i = 0; i < 5; i++) {
      const px = -1.1 + i * 0.55;
      const pan = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.44, 0.16), jagBlack);
      pan.position.set(px, 0.68, 0.86);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.10, 0.18), chromeM);
      trim.position.set(0, 0.14, 0.01);
      pan.add(trim);
      this.jagPanels.push(pan);
      jagGrp.add(pan);
      // Wax-like drip lobes that emerge when melted
      const drip = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), jagBlack);
      drip.position.set(px, 0.42, 0.91);
      this.jagDrips.push(drip);
      jagGrp.add(drip);
    }
    jagGrp.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    R.add(jagGrp);

    // ---- 6. Reporter's Frying Pan & Sizzling Egg at PAN_AT ----
    this.panGroup.position.set(PAN_AT[0], PAN_AT[1], PAN_AT[2]);
    const ironPanM = lam("ironPan", () => ({ color: "#282630" }));
    const eggWhiteM = lam("eggWhite", () => ({ color: "#faf6ec" }));
    const eggYolkM = lam("eggYolk", () => ({ color: "#f59c24" }));
    const panBase = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 0.07, 18), ironPanM);
    panBase.position.y = 0.035;
    const panHandle = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 0.08), ironPanM);
    panHandle.position.set(-0.52, 0.06, 0);
    this.eggWhite = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.03, 16), eggWhiteM);
    this.eggWhite.position.y = 0.07;
    this.eggYolk = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), eggYolkM);
    this.eggYolk.scale.set(1, 0.55, 1);
    this.eggYolk.position.y = 0.09;
    this.panGroup.add(panBase, panHandle, this.eggWhite, this.eggYolk);
    this.panGroup.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    R.add(this.panGroup);

    // ---- 7. Curved Shaving Mirror on Stand & Converging Beams in the Park (Shot 13) ----
    const standGrp = new THREE.Group();
    standGrp.position.set(PARK[0], D0 + 1.12, PARK[2] + 0.15);
    const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.06, 16), chromeM);
    const standYoke = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.045, 8, 20, Math.PI).rotateZ(Math.PI), chromeM);
    standYoke.position.y = 0.72;
    this.shavingMirrorPivot.position.set(0, 0.72, 0);
    const mirFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.08, 22).rotateX(Math.PI / 2), chromeM);
    const mirGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.09, 22).rotateX(Math.PI / 2),
      twoTone(new THREE.MeshPhongMaterial({ color: "#8cd3ff", specular: "#ffffff", shininess: 95 }), 0.1));
    this.shavingMirrorPivot.add(mirFrame, mirGlass);
    standGrp.add(standBase, standYoke, this.shavingMirrorPivot);
    standGrp.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    R.add(standGrp);

    // Glowing solar ray material (non-HDR golden sunbeam on NOINK layer so it never washes out close-ups with bloom)
    const rayMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ffe278"),
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const rayGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 10, 1, true);

    // 5 converging beams + 5 incoming beams for the Shaving Mirror in Shot 13
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(rayGeo, rayMat);
      m.layers.set(NOINK); m.frustumCulled = false;
      this.mirrorBeams.push(m); R.add(m);
    }
    this.shavingSpot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 16),
      new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffea88"), transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.shavingSpot.position.set(PARK[0], D0 + 1.13, PARK[2] - 0.95);
    this.shavingSpot.layers.set(NOINK);
    R.add(this.shavingSpot);

    // 14 Death-Ray beams from the concave Walkie-Talkie facade down to the street focal spot
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(rayGeo, rayMat);
      m.layers.set(NOINK); m.frustumCulled = false;
      this.deathRays.push(m); R.add(m);
    }
    this.focalSpot = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.04, 24),
      new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffe070"), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.focalSpot.layers.set(NOINK);
    R.add(this.focalSpot);

    // 10 Parallel harmless beams for the Flat Glass Wall in Shot 12
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(rayGeo, rayMat);
      m.layers.set(NOINK); m.frustumCulled = false;
      this.flatRays.push(m); R.add(m);
    }

    // ---- 8. Architect's Budget Easel Sign at SIGN_AT (BUDGET_AT) ----
    this.signBoardUncut = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.04),
      new THREE.MeshBasicMaterial({ map: ctex("signUncut", 700, 520, (g) => fxSign(new Pen(g), false)), alphaTest: 0.5, color: 0xe6e6e6 }));
    this.signBoardCut = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.04),
      new THREE.MeshBasicMaterial({ map: ctex("signCut", 700, 520, (g) => fxSign(new Pen(g), true)), alphaTest: 0.5, color: 0xe6e6e6 }));
    for (const bd of [this.signBoardUncut, this.signBoardCut]) {
      bd.layers.set(NOINK);
      bd.position.set(SIGN_AT[0], D0 + 1.62, SIGN_AT[2] - 0.04);
      bd.rotation.y = Math.PI;
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.46, 1.1, 0.06), woodM);
    back.position.set(SIGN_AT[0], D0 + 1.62, SIGN_AT[2]);
    this.sign.add(this.signBoardUncut, this.signBoardCut, back);
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.15, 0.12), woodM);
      p.position.set(SIGN_AT[0] + s * 0.52, D0 + 1.07, SIGN_AT[2] + 0.07);
      this.sign.add(p);
    }
    this.sign.traverse((o) => { if (o !== this.signBoardUncut && o !== this.signBoardCut) { o.castShadow = true; o.receiveShadow = true; } });
    R.add(this.sign);

    // Chimney background smoke
    const smokeT = smokeTex();
    for (const [top, n] of [[[-22, D0 + 30.6, -77], 7], [[-80, D0 + 24.6, 93], 6]] as const)
      for (let k = 0; k < n; k++) {
        const mat = new THREE.MeshLambertMaterial({ map: smokeT, transparent: true, depthWrite: false });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
        m.layers.set(NOINK);
        this.smoke.push({ m, mat, top: top as unknown as V3, k: k / n }); R.add(m);
      }

    this.swing = new Actor(R, swingGeo);
    for (const fg of FOREGROUND) {
      const o = kitClone(kit, fg.kit, fg.s ?? 1);
      if (!o) continue;
      o.position.set(...fg.pos); o.rotation.y = fg.yaw ?? 0; o.visible = false;
      this.fgs.push({ o, a: fg.a, b: fg.b }); R.add(o);
    }
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? SUN_SHOT[id]?.az ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? SUN_SHOT[id]?.el ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], tau = s.tau(t), b = bridgeState(id, t), L = LIGHTS[s.light];
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    this.fill.intensity = 0;
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...LOOK[s.light].bounce); TONE.uSat.value = LOOK[s.light].sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky & fog ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden" || id === 5;
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      const sd = id === 5 ? V(0.05, 0.42, 0.90).normalize() : sunDir;
      this.sunDisc.position.copy(cam.position).addScaledVector(sd, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    for (const g of this.fgs) g.o.visible = f >= g.a && f < g.b && g.a < s.b && g.b > s.a;

    // ---- pose skyscraper & street props ----
    this.poseStory(b, t, tau, id);

    for (const sm of this.smoke) {
      const u = (t * 0.11 + sm.k) % 1, sz = 3 + u * 9;
      sm.m.position.set(sm.top[0] - u * 18, sm.top[1] + u * 13 + u * u * 4, sm.top[2] + u * 3);
      sm.m.scale.set(sz, sz, 1); sm.m.quaternion.copy(cam.quaternion);
      sm.mat.opacity = 0.85 * (1 - u) ** 1.2;
    }

    // ---- cast + 2D effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, b, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const tint = s.light === "golden" ? "#ffcf9e" : "#ffffff";
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (p.geo !== "swing" && !this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = p.geo === "swing" ? this.swing : this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      if (a.mat.emissiveMap) a.mat.emissive.set(tint);
      a.mesh.castShadow = p.geo === "swing" ? true : L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    if (!used.includes(this.swing)) this.swing.mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1);
      fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
    return focus;
  }

  private poseStory(b: BridgeState, t: number, _tau: number, id: number) {
    // 1. Louvers on the Walkie-Talkie
    const nRows = this.louverRows.length;
    for (let i = 0; i < nRows; i++) {
      const thresh = (i + 0.5) / nRows;
      const vis = b.shades >= thresh;
      this.louverRows[i].visible = vis;
    }

    // 2. Budget easel sign (visible in Shot 4, 15, 16)
    this.sign.visible = id === 4 || id === 15 || id === 16;
    const isCut = b.snap > 0.3 || id >= 5;
    this.signBoardUncut.visible = !isCut;
    this.signBoardCut.visible = isCut;

    // 3. Doormat scorch patch
    this.doormatScorch.visible = b.doormatSmoke > 0.02;
    const scS = Math.max(0.05, b.doormatSmoke);
    this.doormatScorch.scale.set(scS * 1.3, 1, scS * 0.85);

    // 4. Cracking sidewalk tiles
    const ck = b.tileCrack;
    this.crackTiles.forEach((slab, idx) => {
      const sx = idx % 2 === 0 ? -1 : 1, sz = idx < 2 ? -1 : 1;
      slab.position.y = TILES_AT[1] + 0.03 + ck * 0.08;
      slab.rotation.set(sz * 0.22 * ck, sx * sz * 0.08 * ck, -sx * 0.26 * ck);
    });

    // 5. Delivery van paint blisters (only show van in Shot 7 and Shot 11 so it never photobombs Shot 5/6)
    this.vanGrp.visible = id === 7 || id === 11;
    const vb = b.vanBlister;
    this.vanBlisters.forEach((bl, idx) => {
      bl.visible = vb > 0.02;
      const s = Math.max(0.01, vb * (0.85 + 0.15 * Math.sin(t * 6 + idx)));
      bl.scale.set(s * 1.2, s, s * 0.7);
    });

    // 6. Shiny black Jaguar melting mirror & side panels
    const m = b.drop; // 0 = pristine, 1 = melted like wax
    this.jagMirror.position.set(-0.62, 1.00 - 0.34 * m, 0.88 + 0.08 * m);
    this.jagMirror.rotation.set(0.85 * m, 0, 0.38 * m);
    this.jagMirror.scale.set(1, 1 + 0.8 * m, 1);
    this.jagPanels.forEach((pan, i) => {
      const wave = Math.sin(i * 1.7 + 0.5);
      pan.position.y = 0.68 - (0.18 + 0.07 * Math.abs(wave)) * m;
      pan.rotation.x = 0.32 * m;
      pan.rotation.z = wave * 0.24 * m;
      pan.scale.set(1, 1 + 0.35 * m, 1 + 0.4 * m);
    });
    this.jagDrips.forEach((drip, i) => {
      drip.visible = m > 0.05;
      drip.position.y = 0.48 - (0.22 + (i % 2) * 0.08) * m;
      drip.scale.set(0.8, (0.3 + 1.8 * m) * (0.85 + 0.2 * (i % 3)), 0.8);
    });

    // 7. Reporter's frying pan & sizzling egg (Shot 9)
    this.panGroup.visible = id === 9;
    if (id === 9) {
      const ec = Math.max(0.15, b.eggCook);
      const sizzle = 1 + 0.06 * Math.sin(t * 18);
      this.eggWhite.scale.set(ec * sizzle, 1, ec / sizzle);
      this.eggYolk.scale.set(ec, 0.55 * ec * sizzle, ec);
    }

    // 8. Concave Skyscraper Death-Ray Beams & Street Focal Spot
    // Show 3D ray cylinders in wide/medium shots (id 1 wide, id 5, id 11, id 14) so close-up inserts stay 100% crisp and un-washed
    const fCur = Math.round(t * FPS);
    const showRayBeams = b.rayIntensity > 0.02 && ((id === 1 && (fCur < 36 || fCur >= 76)) || id === 5 || id === 11 || id === 14);
    const showFocalSpot = b.rayIntensity > 0.02 && (id === 1 || id === 5 || id === 11 || id === 14);
    this.focalSpot.visible = showFocalSpot;
    const targetPt = V(b.spotX, D0 + 0.22, b.spotZ);
    this.focalSpot.position.set(b.spotX, D0 + 0.18, b.spotZ);
    this.focalSpot.scale.set(1.15 * b.rayIntensity, 1, 0.72 * b.rayIntensity);
    this.deathRays.forEach((beamMesh, i) => {
      beamMesh.visible = showRayBeams;
      if (!showRayBeams) return;
      const row = Math.floor(i / 3), col = (i % 3) - 1;
      const u = 0.25 + (row / 4) * 0.68;
      const sx = col * 0.58 + (row % 2 ? 0.12 : -0.12);
      const src = towerPt(u, sx, -1);
      const dst = targetPt.clone().add(V(col * 0.35, 0.15, (row - 2) * 0.18));
      placeBeam(beamMesh, src, dst, 0.38 * b.rayIntensity);
    });

    // 9. Flat Glass Building Parallel Harmless Beams (Shot 12)
    const showFlat = id === 12;
    this.flatRays.forEach((beamMesh, i) => {
      beamMesh.visible = showFlat;
      if (!showFlat) return;
      const col = i % 5, incoming = i >= 5;
      const x = -30.8 + col * 2.4;
      const wallPt = V(x, D0 + 11.5, 17.9);
      if (incoming) {
        placeBeam(beamMesh, V(x + 3.5, D0 + 26.0, 4.0), wallPt, 0.36);
      } else {
        // Neat parallel rows bouncing onto the street without converging
        placeBeam(beamMesh, wallPt, V(x - 1.2, D0 + 0.1, 4.5), 0.36);
      }
    });

    // 10. Curved Shaving Mirror & Converging Beams in Park (Shot 13)
    const showMirror = id === 13;
    this.shavingSpot.visible = showMirror && t >= 50.5;
    if (showMirror) {
      const tiltU = smooth((t - 48.8) / 2.2);
      this.shavingMirrorPivot.rotation.x = -0.35 + 0.52 * tiltU;
      const mirCenter = V(PARK[0], D0 + 1.84, PARK[2] + 0.15);
      const spotDst = V(PARK[0], D0 + 1.14, PARK[2] - 0.95);
      for (let i = 0; i < 5; i++) {
        const s = (i - 2) / 2;
        const hitPt = mirCenter.clone().add(V(s * 0.44, (i % 2 ? 0.18 : -0.14), -0.04));
        const inBeam = this.mirrorBeams[i], outBeam = this.mirrorBeams[i + 5];
        inBeam.visible = outBeam.visible = true;
        placeBeam(inBeam, hitPt.clone().add(V(0.8, 3.8, -3.2)), hitPt, 0.09);
        const convDst = hitPt.clone().add(V(-s * 0.1, -0.65, -1.1)).lerp(spotDst, tiltU);
        placeBeam(outBeam, hitPt, convDst, 0.09);
      }
    } else {
      for (const m2 of this.mirrorBeams) m2.visible = false;
    }
  }
}

const swingGeo = (() => { const g = new THREE.PlaneGeometry(700 * SU_SWING, 2300 * SU_SWING); g.translate(0, -(1150 - 20) * SU_SWING, 0); return g; })();
function quadUp(x0: number, x1: number, z0: number, z1: number, u: number, v: number, dy = 0) {
  const y = D0 + dy, g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
}
