import * as THREE from '../vendor/three.module.js';
import { WORLD, COIN_VALUE } from './config.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const CELL = 40;

export const DISTRICT = { DOWNTOWN: 0, MIDTOWN: 1, INDUSTRIAL: 2, PARK: 3 };

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function worldSeed() {
  const q = new URLSearchParams(location.search).get('seed');
  if (q !== null) {
    const n = Number(q);
    if (Number.isFinite(n)) return Math.floor(n);
    let h = 2166136261;
    for (let i = 0; i < q.length; i++) {
      h ^= q.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  return WORLD.seed;
}

const WIN_COLS = 6;
const WIN_ROWS = 12;
const TILE_U = 18;
const TILE_V = 40;

function officeTexture(rnd) {
  const w = 192, h = 384;
  const base = document.createElement('canvas');
  base.width = w; base.height = h;
  const glow = document.createElement('canvas');
  glow.width = w; glow.height = h;
  const bc = base.getContext('2d');
  const gc = glow.getContext('2d');
  bc.fillStyle = '#39414f';
  bc.fillRect(0, 0, w, h);
  gc.fillStyle = '#000';
  gc.fillRect(0, 0, w, h);
  const cw = w / WIN_COLS, ch = h / WIN_ROWS;
  const mx = cw * 0.22, my = ch * 0.26;
  for (let r = 0; r < WIN_ROWS; r++) {
    for (let c = 0; c < WIN_COLS; c++) {
      const x = c * cw + mx, y = r * ch + my;
      const ww = cw - mx * 2, wh = ch - my * 2;
      const lit = rnd() < 0.4;
      bc.fillStyle = lit ? '#ffdd9c' : '#151b26';
      bc.fillRect(x, y, ww, wh);
      if (lit) {
        gc.fillStyle = rnd() < 0.22 ? '#7fd0ff' : '#ffc978';
        gc.fillRect(x, y, ww, wh);
      }
      bc.fillStyle = 'rgba(0,0,0,.22)';
      bc.fillRect(x, y + wh, ww, my * 0.5);
    }
    bc.fillStyle = 'rgba(255,255,255,.035)';
    bc.fillRect(0, r * ch, w, 1.5);
  }
  return { base, glow };
}

function warehouseTexture(rnd) {
  const w = 128, h = 128;
  const base = document.createElement('canvas');
  base.width = w; base.height = h;
  const glow = document.createElement('canvas');
  glow.width = w; glow.height = h;
  const bc = base.getContext('2d');
  const gc = glow.getContext('2d');
  bc.fillStyle = '#4a4f52';
  bc.fillRect(0, 0, w, h);
  gc.fillStyle = '#000';
  gc.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 6) {
    bc.fillStyle = x % 12 === 0 ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.05)';
    bc.fillRect(x, 0, 3, h);
  }
  bc.fillStyle = '#2d3134';
  bc.fillRect(0, h - 26, w, 26);
  for (let i = 0; i < 4; i++) {
    const x = 8 + i * 30;
    bc.fillStyle = '#20252a';
    bc.fillRect(x, h - 24, 20, 22);
    if (rnd() < 0.5) {
      bc.fillStyle = '#ffcf7a';
      bc.fillRect(x + 4, h - 20, 12, 6);
      gc.fillStyle = '#ffb347';
      gc.fillRect(x + 4, h - 20, 12, 6);
    }
  }
  for (let i = 0; i < 6; i++) {
    const x = 6 + i * 20, y = 14 + (i % 2) * 10;
    const lit = rnd() < 0.7;
    bc.fillStyle = lit ? '#ffe6b0' : '#252b31';
    bc.fillRect(x, y, 12, 8);
    if (lit) { gc.fillStyle = '#ffcf7a'; gc.fillRect(x, y, 12, 8); }
  }
  for (let i = 0; i < 5; i++) {
    const x = 12 + i * 26;
    bc.fillStyle = '#ffd9a0';
    bc.fillRect(x, 2, 9, 4);
    gc.fillStyle = '#ffd9a0';
    gc.fillRect(x, 2, 9, 4);
    gc.fillStyle = 'rgba(255,200,120,.35)';
    gc.fillRect(x - 3, 6, 15, 10);
  }
  return { base, glow };
}

function storeTexture(rnd) {
  const w = 192, h = 128;
  const base = document.createElement('canvas');
  base.width = w; base.height = h;
  const glow = document.createElement('canvas');
  glow.width = w; glow.height = h;
  const bc = base.getContext('2d');
  const gc = glow.getContext('2d');
  bc.fillStyle = '#2f343d';
  bc.fillRect(0, 0, w, h);
  gc.fillStyle = '#000';
  gc.fillRect(0, 0, w, h);

  const units = 3;
  const uw = w / units;
  const signColours = ['#ff5a4d', '#4dd2ff', '#ffd24d', '#8b6bff', '#4dff9e'];
  for (let u = 0; u < units; u++) {
    const x = u * uw;
    const open = rnd() < 0.6;
    bc.fillStyle = '#1b1f26';
    bc.fillRect(x + 4, 26, uw - 8, h - 44);
    if (open) {
      const warm = rnd() < 0.5;
      const grd = bc.createLinearGradient(0, 26, 0, h - 18);
      grd.addColorStop(0, warm ? '#fff0c8' : '#dfe9f2');
      grd.addColorStop(1, warm ? '#d9a95e' : '#93a7b8');
      bc.fillStyle = grd;
      bc.fillRect(x + 7, 29, uw - 14, h - 50);
      gc.fillStyle = rnd() < 0.5 ? '#ffd89a' : '#c9a978';
      gc.fillRect(x + 7, 29, uw - 14, h - 50);
      for (let k = 0; k < 3; k++) {
        bc.fillStyle = 'rgba(30,25,20,.55)';
        bc.fillRect(x + 12 + k * (uw - 24) / 3, h - 44, 6, 18);
      }
    }
    const sign = signColours[Math.floor(rnd() * signColours.length)];
    bc.fillStyle = sign;
    bc.fillRect(x + 6, 8, uw - 12, 13);
    gc.fillStyle = sign;
    gc.fillRect(x + 6, 8, uw - 12, 13);
    bc.fillStyle = '#151920';
    bc.fillRect(x + 2, 22, uw - 4, 5);
    bc.fillStyle = '#0f1319';
    bc.fillRect(x, h - 16, uw, 16);
  }
  return { base, glow };
}

function makeMaterial(pair, tileU, tileV, intensity) {
  const map = new THREE.CanvasTexture(pair.base);
  const emis = new THREE.CanvasTexture(pair.glow);
  for (const t of [map, emis]) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
  }
  return new THREE.MeshStandardMaterial({
    map, emissiveMap: emis, emissive: 0xffffff, emissiveIntensity: intensity,
    vertexColors: true, roughness: 0.76, metalness: 0.1,
    userData: { tileU, tileV }
  });
}

function skyTexture(rnd) {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#060b18');
  g.addColorStop(0.38, '#102040');
  g.addColorStop(0.62, '#2d3a68');
  g.addColorStop(0.82, '#7d4c6d');
  g.addColorStop(0.93, '#d1734a');
  g.addColorStop(1, '#f0a860');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 256);
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (let i = 0; i < 60; i++) ctx.fillRect(rnd() * 16, rnd() * 90, 1, 1);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

class MeshBuilder {
  constructor(useUv) {
    this.pos = [];
    this.norm = [];
    this.uv = useUv ? [] : null;
    this.col = [];
  }

  quad(p, n, u, v, c) {
    const idx = [0, 1, 2, 0, 2, 3];
    for (const i of idx) {
      this.pos.push(p[i][0], p[i][1], p[i][2]);
      this.norm.push(n[0], n[1], n[2]);
      this.col.push(c[0], c[1], c[2]);
    }
    if (this.uv) {
      const uvs = [[0, 0], [u, 0], [u, v], [0, v]];
      for (const i of idx) this.uv.push(uvs[i][0], uvs[i][1]);
    }
  }

  boxSides(x0, x1, z0, z1, y0, y1, c, tileU, tileV) {
    const h = y1 - y0;
    const uW = (x1 - x0) / tileU, uD = (z1 - z0) / tileU, vH = h / tileV;
    this.quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], uW, vH, c);
    this.quad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], uW, vH, c);
    this.quad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], uD, vH, c);
    this.quad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], uD, vH, c);
  }

  top(x0, x1, z0, z1, y, c) {
    this.quad([[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]], [0, 1, 0], 1, 1, c);
  }

  tri(p, n, c) {
    for (let i = 0; i < 3; i++) {
      this.pos.push(p[i][0], p[i][1], p[i][2]);
      this.norm.push(n[0], n[1], n[2]);
      this.col.push(c[0], c[1], c[2]);
      if (this.uv) this.uv.push(0, 0);
    }
  }

  empty() { return this.pos.length === 0; }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.norm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    if (this.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    return g;
  }
}

export class World {
  constructor(scene, seed = worldSeed()) {
    this.scene = scene;
    this.seed = seed;
    this.rng = mulberry32(seed);
    this.rand = (a, b) => a + this.rng() * (b - a);
    this.buildings = [];
    this.grid = new Map();
    this.coins = [];
    this.blocks = [];
    this.alleys = [];
    this.water = [];
    this.bridges = [];
    this.ramps = [];
    this.surfaces = [];
    this.surfGrid = new Map();
    this.blockedSegments = new Set();
    this.layoutStreets();
    this.layoutWater();
    this.build();
  }

  layoutStreets() {
    const rnd = this.rng;
    const n = WORLD.streets;
    const gaps = [];
    for (let i = 0; i < n - 1; i++) {
      gaps.push(WORLD.minGap + rnd() * (WORLD.maxGap - WORLD.minGap));
    }
    const total = gaps.reduce((a, b) => a + b, 0);
    this.extent = total;
    this.half = total / 2;

    const build = (gapList) => {
      const lines = [-this.half];
      for (const g of gapList) lines.push(lines[lines.length - 1] + g);
      return lines;
    };
    this.xs = build(gaps);
    const gaps2 = [];
    for (let i = 0; i < n - 1; i++) gaps2.push(WORLD.minGap + rnd() * (WORLD.maxGap - WORLD.minGap));
    const scale = total / gaps2.reduce((a, b) => a + b, 0);
    this.zs = build(gaps2.map(g => g * scale));

    const widthFor = (idx, lines) => {
      if (idx % WORLD.arterialEvery === 0) return WORLD.arterialWidth;
      const c = (lines.length - 1) / 2;
      const central = Math.abs(idx - c) / c < 0.4;
      return central ? WORLD.narrowWidth : WORLD.streetWidth;
    };
    this.wx = this.xs.map((_, i) => widthFor(i, this.xs));
    this.wz = this.zs.map((_, i) => widthFor(i, this.zs));
  }

  layoutWater() {
    const xs = this.xs, zs = this.zs, wx = this.wx, wz = this.wz;
    const k = Math.max(2, Math.min(xs.length - 4, Math.round((xs.length - 1) * 0.62)));
    this.riverCol = k;
    const rx0 = xs[k] + wx[k] / 2;
    const rx1 = xs[k + 1] - wx[k + 1] / 2;
    this.water.push({
      minX: rx0, maxX: rx1,
      minZ: -this.half - 80, maxZ: this.half + 80,
      kind: 'river'
    });

    const bi = xs.length - 3;
    const bj = 2;
    this.bay = {
      minX: xs[bi] + wx[bi] / 2, maxX: xs[xs.length - 1] - wx[xs.length - 1] / 2,
      minZ: zs[0] + wz[0] / 2, maxZ: zs[bj] - wz[bj] / 2,
      kind: 'bay'
    };
    this.water.push(this.bay);

    const W = rx1 - rx0;
    for (let j = 0; j < zs.length; j++) {
      if (wz[j] < 20) continue;
      const deckY = 4.2;
      const width = wz[j];
      const z = zs[j];
      const inset = Math.min(18, W * 0.28);
      this.bridges.push({
        j, z, width, deckY,
        minX: rx0 - 4, maxX: rx1 + 4,
        upEnd: rx0 + inset, downStart: rx1 - inset
      });
    }
  }

  addSurface(s) {
    this.surfaces.push(s);
    for (let x = s.minX; x <= s.maxX + CELL; x += CELL) {
      for (let z = s.minZ; z <= s.maxZ + CELL; z += CELL) {
        const k = this.cellKey(Math.min(x, s.maxX), Math.min(z, s.maxZ));
        let list = this.surfGrid.get(k);
        if (!list) { list = []; this.surfGrid.set(k, list); }
        if (!list.includes(s)) list.push(s);
      }
    }
  }

  removeBuilding(b) {
    const i = this.buildings.indexOf(b);
    if (i >= 0) this.buildings.splice(i, 1);
    for (let x = b.minX; x <= b.maxX + CELL; x += CELL) {
      for (let z = b.minZ; z <= b.maxZ + CELL; z += CELL) {
        const list = this.grid.get(this.cellKey(Math.min(x, b.maxX), Math.min(z, b.maxZ)));
        if (!list) continue;
        const k = list.indexOf(b);
        if (k >= 0) list.splice(k, 1);
      }
    }
  }

  floorAt(x, z) {
    const list = this.surfGrid.get(this.cellKey(x, z));
    let h = 0;
    if (list) {
      for (const s of list) {
        if (x < s.minX || x > s.maxX || z < s.minZ || z > s.maxZ) continue;
        let sh;
        if (!s.axis) sh = s.y1;
        else {
          const t = s.axis === 'x'
            ? (x - s.minX) / Math.max(0.001, s.maxX - s.minX)
            : (z - s.minZ) / Math.max(0.001, s.maxZ - s.minZ);
          const u = s.flip ? 1 - t : t;
          sh = s.y0 + (s.y1 - s.y0) * clamp(u, 0, 1);
        }
        if (sh > h) h = sh;
      }
    }
    if (h > 0) return h;
    return this.wetPoint(x, z) ? -0.45 : 0;
  }

  wetPoint(x, z) {
    for (const w of this.water) {
      if (x >= w.minX && x <= w.maxX && z >= w.minZ && z <= w.maxZ) return true;
    }
    return false;
  }

  inWater(x, z, y = 0) {
    if (!this.wetPoint(x, z)) return false;
    return this.floorAt(x, z) < 0 && y < 0.7;
  }

  segmentAt(x, z, axis) {
    if (axis === 'x') {
      let j = 0, dz = Infinity;
      for (let n = 0; n < this.zs.length; n++) {
        const d = Math.abs(this.zs[n] - z);
        if (d < dz) { dz = d; j = n; }
      }
      for (let i = 0; i < this.xs.length - 1; i++) {
        if (x >= this.xs[i] && x <= this.xs[i + 1]) return { axis: 'x', i, j };
      }
      return { axis: 'x', i: 0, j };
    }
    let i = 0, dx = Infinity;
    for (let n = 0; n < this.xs.length; n++) {
      const d = Math.abs(this.xs[n] - x);
      if (d < dx) { dx = d; i = n; }
    }
    for (let j = 0; j < this.zs.length - 1; j++) {
      if (z >= this.zs[j] && z <= this.zs[j + 1]) return { axis: 'z', i, j };
    }
    return { axis: 'z', i, j: 0 };
  }

  segmentKey(axis, i, j) { return axis + ':' + i + ':' + j; }

  blockSegment(axis, i, j) { this.blockedSegments.add(this.segmentKey(axis, i, j)); }

  unblockSegment(axis, i, j) { this.blockedSegments.delete(this.segmentKey(axis, i, j)); }

  segmentBlocked(axis, i, j) { return this.blockedSegments.has(this.segmentKey(axis, i, j)); }

  segmentWet(axis, i, j) {
    const mx = axis === 'x' ? (this.xs[i] + this.xs[i + 1]) / 2 : this.xs[i];
    const mz = axis === 'x' ? this.zs[j] : (this.zs[j] + this.zs[j + 1]) / 2;
    if (!this.wetPoint(mx, mz)) return false;
    return this.floorAt(mx, mz) <= 0;
  }

  dryRoadPoint(avoid, minDist = 0, rnd = Math.random) {
    for (let i = 0; i < 40; i++) {
      const p = this.randomRoadPoint(avoid, minDist, rnd);
      if (!this.wetPoint(p.x, p.z)) return p;
    }
    return { x: this.xs[0], z: this.zs[0], yaw: 0 };
  }

  districtAt(i, j) {
    const ci = (this.xs.length - 1) / 2, cj = (this.zs.length - 1) / 2;
    const r = Math.max(Math.abs(i - ci) / ci, Math.abs(j - cj) / cj);
    if (i >= this.xs.length - 5 && j <= 3) return DISTRICT.INDUSTRIAL;
    if (i <= 2 && j >= this.zs.length - 5) return DISTRICT.INDUSTRIAL;
    if (r < 0.34) return DISTRICT.DOWNTOWN;
    return DISTRICT.MIDTOWN;
  }

  blockBounds(i, j) {
    return {
      x0: this.xs[i] + this.wx[i] / 2,
      x1: this.xs[i + 1] - this.wx[i + 1] / 2,
      z0: this.zs[j] + this.wz[j] / 2,
      z1: this.zs[j + 1] - this.wz[j + 1] / 2
    };
  }

  cellKey(x, z) {
    const i = Math.floor((x + this.half + 200) / CELL);
    const j = Math.floor((z + this.half + 200) / CELL);
    return i * 4000 + j;
  }

  addBuilding(b) {
    this.buildings.push(b);
    for (let x = b.minX; x <= b.maxX + CELL; x += CELL) {
      for (let z = b.minZ; z <= b.maxZ + CELL; z += CELL) {
        const k = this.cellKey(Math.min(x, b.maxX), Math.min(z, b.maxZ));
        let list = this.grid.get(k);
        if (!list) { list = []; this.grid.set(k, list); }
        if (!list.includes(b)) list.push(b);
      }
    }
  }

  build() {
    const scene = this.scene;
    const rnd = this.rng;
    const rand = this.rand;
    const { xs, zs, wx, wz, extent, half } = this;

    scene.background = skyTexture(rnd);
    scene.fog = new THREE.Fog(0x1d2740, 130, 640);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(extent + 600, extent + 600),
      new THREE.MeshStandardMaterial({ color: 0x191d24, roughness: 0.88, metalness: 0.06 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const office = new MeshBuilder(true);
    const store = new MeshBuilder(true);
    const warehouse = new MeshBuilder(true);
    const roofs = new MeshBuilder(false);
    const plazaB = new MeshBuilder(false);
    const tint = new THREE.Color();

    const SHOP_H = 3.7;
    const pushBuilding = (mb, x0, x1, z0, z1, h, c, tileU, tileV, shops) => {
      if (shops && h > SHOP_H + 4) {
        store.boxSides(x0, x1, z0, z1, 0, SHOP_H, [1, 1, 1], 7.5, SHOP_H);
        mb.boxSides(x0, x1, z0, z1, SHOP_H, h, c, tileU, tileV);
        const ledge = 0.16;
        roofs.top(x0 - ledge, x1 + ledge, z0 - ledge, z1 + ledge, SHOP_H, [c[0] * 0.5, c[1] * 0.5, c[2] * 0.54]);
        roofs.boxSides(x0 - ledge, x1 + ledge, z0 - ledge, z1 + ledge, SHOP_H - 0.18, SHOP_H, [c[0] * 0.45, c[1] * 0.45, c[2] * 0.5], 1, 1);
      } else {
        mb.boxSides(x0, x1, z0, z1, 0, h, c, tileU, tileV);
      }
      const rc = [c[0] * 0.42, c[1] * 0.44, c[2] * 0.48];
      roofs.top(x0, x1, z0, z1, h, rc);
      this.addBuilding({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, height: h });
    };

    const containers = [];
    const trees = [];

    for (let i = 0; i < xs.length - 1; i++) {
      for (let j = 0; j < zs.length - 1; j++) {
        const d = this.districtAt(i, j);
        const b = this.blockBounds(i, j);
        const bw = b.x1 - b.x0, bd = b.z1 - b.z0;
        if (bw < 12 || bd < 12) continue;
        if (this.wetPoint((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2)) continue;

        const isPark = d !== DISTRICT.INDUSTRIAL && rnd() < 0.06;
        const district = isPark ? DISTRICT.PARK : d;
        const plazaCol = district === DISTRICT.PARK ? [0.16, 0.3, 0.18]
          : district === DISTRICT.INDUSTRIAL ? [0.19, 0.2, 0.22]
          : [0.2, 0.22, 0.26];
        const kerbCol = [0.42, 0.43, 0.45];
        const kerbW = 0.38;
        const kerbY = 0.21;
        plazaB.top(b.x0 + kerbW, b.x1 - kerbW, b.z0 + kerbW, b.z1 - kerbW, 0.17, plazaCol);
        plazaB.top(b.x0, b.x1, b.z0, b.z0 + kerbW, kerbY, kerbCol);
        plazaB.top(b.x0, b.x1, b.z1 - kerbW, b.z1, kerbY, kerbCol);
        plazaB.top(b.x0, b.x0 + kerbW, b.z0 + kerbW, b.z1 - kerbW, kerbY, kerbCol);
        plazaB.top(b.x1 - kerbW, b.x1, b.z0 + kerbW, b.z1 - kerbW, kerbY, kerbCol);
        plazaB.boxSides(b.x0, b.x1, b.z0, b.z1, 0, kerbY, kerbCol, 1, 1);
        plazaB.boxSides(b.x0 + kerbW, b.x1 - kerbW, b.z0 + kerbW, b.z1 - kerbW, 0.17, kerbY,
          [kerbCol[0] * 0.8, kerbCol[1] * 0.8, kerbCol[2] * 0.8], 1, 1);

        const block = { i, j, district, ...b, alley: null };
        this.blocks.push(block);

        if (district === DISTRICT.PARK) {
          const count = Math.floor(rand(5, 11));
          for (let t = 0; t < count; t++) {
            trees.push({
              x: rand(b.x0 + 4, b.x1 - 4),
              z: rand(b.z0 + 4, b.z1 - 4),
              s: rand(0.8, 1.5)
            });
          }
          continue;
        }

        if (district === DISTRICT.INDUSTRIAL && rnd() < 0.42) {
          const rows = Math.floor(rand(2, 5));
          for (let r = 0; r < rows; r++) {
            const stack = Math.floor(rand(1, 4));
            const cx = rand(b.x0 + 6, b.x1 - 6);
            const cz = rand(b.z0 + 5, b.z1 - 5);
            for (let s = 0; s < stack; s++) {
              containers.push({ x: cx, z: cz, y: s * 2.7, rot: rnd() < 0.5 ? 0 : Math.PI / 2, hue: rnd() });
            }
            this.addBuilding({ minX: cx - 3.2, maxX: cx + 3.2, minZ: cz - 6.4, maxZ: cz + 6.4, height: stack * 2.7 });
          }
          continue;
        }

        const wantAlley = rnd() < WORLD.alleyChance && Math.min(bw, bd) > 34;
        let lots = [{ x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1 }];
        if (wantAlley) {
          const axis = bw > bd ? 'z' : 'x';
          const aw = WORLD.alleyWidth;
          if (axis === 'z') {
            const mid = (b.x0 + b.x1) / 2 + rand(-bw * 0.12, bw * 0.12);
            lots = [
              { x0: b.x0, x1: mid - aw / 2, z0: b.z0, z1: b.z1 },
              { x0: mid + aw / 2, x1: b.x1, z0: b.z0, z1: b.z1 }
            ];
            block.alley = { axis: 'z', x: mid, z: (b.z0 + b.z1) / 2, len: bd, width: aw };
          } else {
            const mid = (b.z0 + b.z1) / 2 + rand(-bd * 0.12, bd * 0.12);
            lots = [
              { x0: b.x0, x1: b.x1, z0: b.z0, z1: mid - aw / 2 },
              { x0: b.x0, x1: b.x1, z0: mid + aw / 2, z1: b.z1 }
            ];
            block.alley = { axis: 'x', x: (b.x0 + b.x1) / 2, z: mid, len: bw, width: aw };
          }
          this.alleys.push(block.alley);
        }

        for (const lot of lots) {
          const lw = lot.x1 - lot.x0, ld = lot.z1 - lot.z0;
          if (lw < 8 || ld < 8) continue;
          const splits = district === DISTRICT.INDUSTRIAL ? 1
            : (Math.min(lw, ld) > 40 && rnd() < 0.55 ? 2 : 1);
          const along = lw > ld ? 'x' : 'z';
          for (let s = 0; s < splits; s++) {
            const f0 = splits === 1 ? 0 : (s === 0 ? 0 : 0.51);
            const f1 = splits === 1 ? 1 : (s === 0 ? 0.49 : 1);
            let x0 = lot.x0, x1 = lot.x1, z0 = lot.z0, z1 = lot.z1;
            if (splits === 2) {
              if (along === 'x') { x0 = lot.x0 + lw * f0; x1 = lot.x0 + lw * f1; }
              else { z0 = lot.z0 + ld * f0; z1 = lot.z0 + ld * f1; }
            }
            const mg = district === DISTRICT.INDUSTRIAL ? rand(1.5, 3.5) : rand(2, 5);
            const bx0 = x0 + mg, bx1 = x1 - mg, bz0 = z0 + mg, bz1 = z1 - mg;
            if (bx1 - bx0 < 7 || bz1 - bz0 < 7) continue;

            let h, mb, tileU, tileV, base;
            if (district === DISTRICT.INDUSTRIAL) {
              h = rand(WORLD.minBuildingHeight, 14);
              mb = warehouse; tileU = 26; tileV = 14;
              base = rand(0.62, 0.92);
              tint.setRGB(base, base * 0.99, base * 0.96);
            } else if (district === DISTRICT.DOWNTOWN) {
              h = rand(26, WORLD.maxBuildingHeight);
              mb = office; tileU = TILE_U; tileV = TILE_V;
              base = rand(0.7, 1.1);
              tint.setRGB(base * 0.94, base * 0.97, base * 1.1);
            } else {
              h = rand(10, 36);
              mb = office; tileU = TILE_U; tileV = TILE_V;
              base = rand(0.7, 1.08);
              tint.setRGB(base * 0.98, base * 0.98, base * 1.04);
            }
            const c = [tint.r, tint.g, tint.b];
            pushBuilding(mb, bx0, bx1, bz0, bz1, h, c, tileU, tileV, district !== DISTRICT.INDUSTRIAL);

            if (district !== DISTRICT.INDUSTRIAL && rnd() < 0.7) {
              const pw = Math.min(bx1 - bx0, bz1 - bz0) * rand(0.18, 0.34);
              const px = (bx0 + bx1) / 2 + rand(-2, 2);
              const pz = (bz0 + bz1) / 2 + rand(-2, 2);
              const ph = rand(1.2, 3.6);
              const rc = [c[0] * 0.4, c[1] * 0.42, c[2] * 0.46];
              roofs.boxSides(px - pw / 2, px + pw / 2, pz - pw / 2, pz + pw / 2, h, h + ph, rc, 1, 1);
              roofs.top(px - pw / 2, px + pw / 2, pz - pw / 2, pz + pw / 2, h + ph, rc);
            }
          }
        }
      }
    }

    const plazaMesh = new THREE.Mesh(plazaB.geometry(), new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.85, metalness: 0.05
    }));
    plazaMesh.receiveShadow = true;
    scene.add(plazaMesh);

    const officeMat = makeMaterial(officeTexture(rnd), TILE_U, TILE_V, 1.05);
    const warehouseMat = makeMaterial(warehouseTexture(rnd), 26, 14, 1.15);
    const storeMat = makeMaterial(storeTexture(rnd), 7.5, SHOP_H, 0.85);
    for (const [mb, mat] of [[office, officeMat], [warehouse, warehouseMat], [store, storeMat]]) {
      if (mb.empty()) continue;
      const mesh = new THREE.Mesh(mb.geometry(), mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
    const roofMesh = new THREE.Mesh(roofs.geometry(), new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.9, metalness: 0.1
    }));
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    scene.add(roofMesh);

    this.addWater();
    this.addBridges();
    this.addRamps();
    this.addRoadPaint();
    this.addStreetlights();
    this.addContainers(containers);
    this.addTrees(trees);
    this.addBoundary();
    this.buildCoins();
  }

  addWater() {
    const rippleC = document.createElement('canvas');
    rippleC.width = 128; rippleC.height = 128;
    const rc = rippleC.getContext('2d');
    rc.fillStyle = '#b9d4e2';
    rc.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 260; i++) {
      const x = this.rng() * 128, y = this.rng() * 128;
      const w = 5 + this.rng() * 18;
      rc.strokeStyle = `rgba(255,255,255,${0.25 + this.rng() * 0.5})`;
      rc.lineWidth = 1 + this.rng();
      rc.beginPath();
      rc.moveTo(x, y);
      rc.quadraticCurveTo(x + w / 2, y - 3, x + w, y);
      rc.stroke();
    }
    for (let i = 0; i < 120; i++) {
      const x = this.rng() * 128, y = this.rng() * 128;
      rc.fillStyle = `rgba(60,110,140,${0.12 + this.rng() * 0.2})`;
      rc.fillRect(x, y, 6 + this.rng() * 20, 1.5);
    }
    const rip = new THREE.CanvasTexture(rippleC);
    rip.wrapS = rip.wrapT = THREE.RepeatWrapping;
    rip.colorSpace = THREE.SRGBColorSpace;
    this.waterTex = rip;

    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x1e5573, map: rip, roughness: 0.16, metalness: 0.45,
      emissive: 0x123c52, emissiveIntensity: 1,
      transparent: true, opacity: 0.93
    });

    for (const w of this.water) {
      const sx = w.maxX - w.minX, sz = w.maxZ - w.minZ;
      const geo = new THREE.PlaneGeometry(sx, sz);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, this.waterMat);
      mesh.position.set((w.minX + w.maxX) / 2, 0.06, (w.minZ + w.maxZ) / 2);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, uv.getX(i) * sx / 26, uv.getY(i) * sz / 26);
      }
      uv.needsUpdate = true;

    }
  }

  addBridges() {
    const mb = new MeshBuilder(false);
    const deckCol = [0.34, 0.36, 0.4];
    const railCol = [0.5, 0.52, 0.56];
    const river = this.water[0];

    for (const b of this.bridges) {
      const z0 = b.z - b.width / 2, z1 = b.z + b.width / 2;
      this.addSurface({ minX: b.minX, maxX: b.upEnd, minZ: z0, maxZ: z1, axis: 'x', y0: 0, y1: b.deckY, flip: false });
      this.addSurface({ minX: b.upEnd, maxX: b.downStart, minZ: z0, maxZ: z1, axis: null, y0: b.deckY, y1: b.deckY });
      this.addSurface({ minX: b.downStart, maxX: b.maxX, minZ: z0, maxZ: z1, axis: 'x', y0: b.deckY, y1: 0, flip: false });

      const thick = 0.7;
      mb.quad([[b.minX, 0, z1], [b.upEnd, b.deckY, z1], [b.upEnd, b.deckY, z0], [b.minX, 0, z0]], [0, 1, 0], 1, 1, deckCol);
      mb.top(b.upEnd, b.downStart, z0, z1, b.deckY, deckCol);
      mb.quad([[b.downStart, b.deckY, z1], [b.maxX, 0, z1], [b.maxX, 0, z0], [b.downStart, b.deckY, z0]], [0, 1, 0], 1, 1, deckCol);
      mb.boxSides(b.upEnd, b.downStart, z0, z1, b.deckY - thick, b.deckY, deckCol, 1, 1);

      for (const zEdge of [z0, z1]) {
        const dir = zEdge === z0 ? -1 : 1;
        const rz0 = zEdge + (dir < 0 ? -0.45 : 0);
        const rz1 = zEdge + (dir < 0 ? 0 : 0.45);
        mb.boxSides(b.upEnd - 2, b.downStart + 2, rz0, rz1, b.deckY, b.deckY + 1.1, railCol, 1, 1);
        mb.top(b.upEnd - 2, b.downStart + 2, rz0, rz1, b.deckY + 1.1, railCol);
        this.addBuilding({
          minX: b.upEnd - 2, maxX: b.downStart + 2,
          minZ: rz0, maxZ: rz1,
          height: b.deckY + 1.1, rail: true
        });
      }

      const piers = 3;
      for (let p = 1; p <= piers; p++) {
        const px = b.upEnd + (b.downStart - b.upEnd) * (p / (piers + 1));
        mb.boxSides(px - 1.4, px + 1.4, b.z - 1.4, b.z + 1.4, -3, b.deckY - thick, [0.26, 0.27, 0.3], 1, 1);
      }
    }

    if (river) {
      const quayCol = [0.28, 0.29, 0.32];
      for (const x of [river.minX, river.maxX]) {
        const d = x === river.minX ? -1 : 1;
        mb.boxSides(x + (d < 0 ? -1.2 : 0), x + (d < 0 ? 0 : 1.2), river.minZ, river.maxZ, -1.6, 0.28, quayCol, 1, 1);
        mb.top(x + (d < 0 ? -1.2 : 0), x + (d < 0 ? 0 : 1.2), river.minZ, river.maxZ, 0.28, quayCol);
      }
    }

    const mesh = new THREE.Mesh(mb.geometry(), new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.82, metalness: 0.12
    }));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  addRamps() {
    const rnd = this.rng;
    const rand = this.rand;
    const mb = new MeshBuilder(false);
    const rampCol = [0.42, 0.3, 0.12];
    const stripeCol = [0.9, 0.72, 0.18];

    const place = (cx, cz, axis, len, h, wide) => {
      const halfW = wide / 2, halfL = len / 2;
      const minX = axis === 'x' ? cx - halfL : cx - halfW;
      const maxX = axis === 'x' ? cx + halfL : cx + halfW;
      const minZ = axis === 'x' ? cz - halfW : cz - halfL;
      const maxZ = axis === 'x' ? cz + halfW : cz + halfL;
      if (this.wetPoint(cx, cz)) return false;
      if (this.wetPoint(minX, minZ) || this.wetPoint(maxX, maxZ)
        || this.wetPoint(minX, maxZ) || this.wetPoint(maxX, minZ)) return false;
      for (const b of this.nearby(cx, cz)) {
        if (maxX > b.minX && minX < b.maxX && maxZ > b.minZ && minZ < b.maxZ) return false;
      }
      for (const s of this.surfaces) {
        if (maxX > s.minX && minX < s.maxX && maxZ > s.minZ && minZ < s.maxZ) return false;
      }
      const flip = rnd() < 0.5;
      this.addSurface({ minX, maxX, minZ, maxZ, axis, y0: 0, y1: h, flip });
      this.ramps.push({ x: cx, z: cz, axis, len, h, wide, flip });
      const wallH = Math.max(0.6, h - 0.35);
      if (axis === 'x') {
        const bx = flip ? minX : maxX;
        this.addBuilding({ minX: bx - 0.6, maxX: bx + 0.6, minZ, maxZ, height: wallH, ramp: true });
      } else {
        const bz = flip ? minZ : maxZ;
        this.addBuilding({ minX, maxX, minZ: bz - 0.6, maxZ: bz + 0.6, height: wallH, ramp: true });
      }

      const lowAtMin = !flip;
      if (axis === 'x') {
        const yA = lowAtMin ? 0 : h, yB = lowAtMin ? h : 0;
        mb.quad([[minX, yA, maxZ], [maxX, yB, maxZ], [maxX, yB, minZ], [minX, yA, minZ]], [0, 1, 0], 1, 1, rampCol);
        const backX = lowAtMin ? maxX : minX;
        mb.boxSides(backX - 0.5, backX + 0.5, minZ, maxZ, 0, h, stripeCol, 1, 1);
        mb.tri([[minX, yA, minZ], [maxX, yB, minZ], [lowAtMin ? maxX : minX, 0, minZ]], [0, 0, -1], rampCol);
        mb.tri([[maxX, yB, maxZ], [minX, yA, maxZ], [lowAtMin ? maxX : minX, 0, maxZ]], [0, 0, 1], rampCol);
      } else {
        const yA = lowAtMin ? 0 : h, yB = lowAtMin ? h : 0;
        mb.quad([[minX, yA, minZ], [minX, yB, maxZ], [maxX, yB, maxZ], [maxX, yA, minZ]], [0, 1, 0], 1, 1, rampCol);
        const backZ = lowAtMin ? maxZ : minZ;
        mb.boxSides(minX, maxX, backZ - 0.5, backZ + 0.5, 0, h, stripeCol, 1, 1);
        mb.tri([[minX, yA, minZ], [minX, yB, maxZ], [minX, 0, lowAtMin ? maxZ : minZ]], [-1, 0, 0], rampCol);
        mb.tri([[maxX, yB, maxZ], [maxX, yA, minZ], [maxX, 0, lowAtMin ? maxZ : minZ]], [1, 0, 0], rampCol);
      }
      return true;
    };

    let street = 0;
    for (let guard = 0; guard < 400 && street < 12; guard++) {
      const axis = rnd() < 0.5 ? 'x' : 'z';
      const lines = axis === 'x' ? this.zs : this.xs;
      const widths = axis === 'x' ? this.wz : this.wx;
      const idx = Math.floor(rnd() * lines.length);
      if (widths[idx] < 14) continue;
      const along = -this.half + rnd() * this.extent;
      const cx = axis === 'x' ? along : lines[idx];
      const cz = axis === 'x' ? lines[idx] : along;
      if (place(cx, cz, axis, rand(11, 16), rand(2.2, 3.6), widths[idx] * 0.62)) street++;
    }

    let big = 0;
    const pads = this.blocks.filter(b => b.district === DISTRICT.INDUSTRIAL || b.district === DISTRICT.PARK);
    for (let guard = 0; guard < 300 && big < 6 && pads.length; guard++) {
      const b = pads[Math.floor(rnd() * pads.length)];
      const cx = (b.x0 + b.x1) / 2 + rand(-8, 8);
      const cz = (b.z0 + b.z1) / 2 + rand(-8, 8);
      if (place(cx, cz, rnd() < 0.5 ? 'x' : 'z', rand(15, 20), rand(4, 5.6), rand(11, 15))) big++;
    }

    const mesh = new THREE.Mesh(mb.geometry(), new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.85, metalness: 0.08
    }));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  addRoadPaint() {
    const paint = new MeshBuilder(false);
    const WHITE = [0.86, 0.86, 0.8];
    const YELLOW = [0.6, 0.5, 0.17];
    const Y = 0.028;
    const { xs, zs, wx, wz } = this;

    const dashed = (a0, a1, fixed, halfW, axis) => {
      for (let a = a0 + 2; a < a1 - 4; a += 8) {
        const b = Math.min(a + 3.4, a1 - 2);
        if (axis === 'z') paint.top(fixed - halfW, fixed + halfW, a, b, Y, WHITE);
        else paint.top(a, b, fixed - halfW, fixed + halfW, Y, WHITE);
      }
    };

    const laneSet = (lineIdx, lines, widths, cross, crossW, axis) => {
      const line = lines[lineIdx];
      const w = widths[lineIdx];
      for (let j = 0; j < cross.length - 1; j++) {
        const wetA = axis === 'z' ? this.segmentWet('z', lineIdx, j) : this.segmentWet('x', j, lineIdx);
        if (wetA) continue;
        const a0 = cross[j] + crossW[j] / 2;
        const a1 = cross[j + 1] - crossW[j + 1] / 2;
        if (a1 - a0 < 6) continue;
        const edge = w / 2 - 0.5;
        if (axis === 'z') {
          paint.top(line - edge - 0.09, line - edge + 0.09, a0, a1, Y, WHITE);
          paint.top(line + edge - 0.09, line + edge + 0.09, a0, a1, Y, WHITE);
        } else {
          paint.top(a0, a1, line - edge - 0.09, line - edge + 0.09, Y, WHITE);
          paint.top(a0, a1, line + edge - 0.09, line + edge + 0.09, Y, WHITE);
        }
        if (w >= 20) {
          for (const off of [-0.22, 0.22]) {
            if (axis === 'z') paint.top(line + off - 0.08, line + off + 0.08, a0, a1, Y, YELLOW);
            else paint.top(a0, a1, line + off - 0.08, line + off + 0.08, Y, YELLOW);
          }
        } else {
          dashed(a0, a1, line, 0.09, axis);
        }
      }
    };

    for (let i = 0; i < xs.length; i++) laneSet(i, xs, wx, zs, wz, 'z');
    for (let j = 0; j < zs.length; j++) laneSet(j, zs, wz, xs, wx, 'x');

    const stripes = (cx, cz, along, span, width) => {
      const n = Math.max(4, Math.round(span / 1.3));
      for (let k = 0; k < n; k++) {
        const t = -span / 2 + (k + 0.25) * (span / n);
        if (along === 'x') paint.top(cx + t, cx + t + span / n * 0.55, cz - width / 2, cz + width / 2, Y + 0.002, WHITE);
        else paint.top(cx - width / 2, cx + width / 2, cz + t, cz + t + span / n * 0.55, Y + 0.002, WHITE);
      }
    };

    for (let i = 0; i < xs.length; i++) {
      for (let j = 0; j < zs.length; j++) {
        if (wx[i] < 20 || wz[j] < 20) continue;
        if (this.wetPoint(xs[i], zs[j])) continue;
        const hx = wx[i] / 2, hz = wz[j] / 2;
        stripes(xs[i], zs[j] - hz - 1.6, 'x', wx[i] - 1.4, 2.4);
        stripes(xs[i], zs[j] + hz + 1.6, 'x', wx[i] - 1.4, 2.4);
        stripes(xs[i] - hx - 1.6, zs[j], 'z', wz[j] - 1.4, 2.4);
        stripes(xs[i] + hx + 1.6, zs[j], 'z', wz[j] - 1.4, 2.4);
        paint.top(xs[i] - hx, xs[i] - 0.3, zs[j] - hz - 3.5, zs[j] - hz - 3.1, Y, WHITE);
        paint.top(xs[i] + 0.3, xs[i] + hx, zs[j] + hz + 3.1, zs[j] + hz + 3.5, Y, WHITE);
        paint.top(xs[i] - hx - 3.5, xs[i] - hx - 3.1, zs[j] + 0.3, zs[j] + hz, Y, WHITE);
        paint.top(xs[i] + hx + 3.1, xs[i] + hx + 3.5, zs[j] - hz, zs[j] - 0.3, Y, WHITE);
      }
    }

    const mesh = new THREE.Mesh(paint.geometry(), new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.72, metalness: 0.02
    }));
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.addTrafficLights();
  }

  addTrafficLights() {
    const { xs, zs, wx, wz } = this;
    const spots = [];
    for (let i = 0; i < xs.length; i++) {
      for (let j = 0; j < zs.length; j++) {
        if (wx[i] < 20 || wz[j] < 20) continue;
        if (this.wetPoint(xs[i], zs[j])) continue;
        const hx = wx[i] / 2, hz = wz[j] / 2;
        spots.push({ x: xs[i] - hx + 0.9, z: zs[j] - hz + 0.9, yaw: 0, axis: 0 });
        spots.push({ x: xs[i] + hx - 0.9, z: zs[j] + hz - 0.9, yaw: Math.PI, axis: 0 });
        spots.push({ x: xs[i] + hx - 0.9, z: zs[j] - hz + 0.9, yaw: -Math.PI / 2, axis: 1 });
        spots.push({ x: xs[i] - hx + 0.9, z: zs[j] + hz - 0.9, yaw: Math.PI / 2, axis: 1 });
      }
    }
    if (!spots.length) return;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const axisY = new THREE.Vector3(0, 1, 0);
    const p = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    const metal = new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: 0.6, metalness: 0.5 });

    const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.14, 5.4, 8), metal, spots.length);
    const arm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.09, 2.6), metal, spots.length);
    const head = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.92, 0.3), metal, spots.length);

    this.signalMats = [0, 1].map(() => ({
      red: new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff2010, emissiveIntensity: 2.4 }),
      amber: new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0xff9000, emissiveIntensity: 0.12 }),
      green: new THREE.MeshStandardMaterial({ color: 0x35e07a, emissive: 0x18c05a, emissiveIntensity: 0.12 })
    }));

    const lensGeo = new THREE.SphereGeometry(0.11, 10, 8);
    const byAxis = [spots.filter(s => s.axis === 0), spots.filter(s => s.axis === 1)];
    this.signalLenses = [];
    byAxis.forEach((list, ax) => {
      const mats = this.signalMats[ax];
      const lamps = {
        red: new THREE.InstancedMesh(lensGeo, mats.red, list.length),
        amber: new THREE.InstancedMesh(lensGeo, mats.amber, list.length),
        green: new THREE.InstancedMesh(lensGeo, mats.green, list.length)
      };
      list.forEach((sp, idx) => {
        const dx = Math.sin(sp.yaw), dz = Math.cos(sp.yaw);
        const hx = sp.x + dx * 1.5, hz = sp.z + dz * 1.5;
        [['red', 5.32], ['amber', 5.02], ['green', 4.72]].forEach(([key, y]) => {
          q.setFromAxisAngle(axisY, sp.yaw);
          p.set(hx + dx * 0.17, y, hz + dz * 0.17);
          m.compose(p, q, one);
          lamps[key].setMatrixAt(idx, m);
        });
      });
      for (const key of ['red', 'amber', 'green']) {
        lamps[key].instanceMatrix.needsUpdate = true;
        this.scene.add(lamps[key]);
      }
      this.signalLenses.push(lamps);
    });

    spots.forEach((sp, idx) => {
      q.setFromAxisAngle(axisY, sp.yaw);
      p.set(sp.x, 2.7, sp.z);
      m.compose(p, q, one);
      pole.setMatrixAt(idx, m);
      const dx = Math.sin(sp.yaw), dz = Math.cos(sp.yaw);
      p.set(sp.x + dx * 0.75, 5.35, sp.z + dz * 0.75);
      m.compose(p, q, one);
      arm.setMatrixAt(idx, m);
      p.set(sp.x + dx * 1.5, 5.0, sp.z + dz * 1.5);
      m.compose(p, q, one);
      head.setMatrixAt(idx, m);
    });
    for (const mesh of [pole, arm, head]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      this.scene.add(mesh);
    }
    this.signalClock = 0;
    this.signalPhase = 0;
  }

  updateSignals(dt) {
    if (!this.signalMats) return;
    this.signalClock += dt;
    const cycle = 11;
    const t = this.signalClock % cycle;
    const amber = t > cycle - 2.2;
    if (t < dt) this.signalPhase ^= 1;
    const set = (mats, green) => {
      mats.red.emissiveIntensity = green ? 0.12 : 2.4;
      mats.green.emissiveIntensity = green && !amber ? 2.4 : 0.12;
      mats.amber.emissiveIntensity = green && amber ? 2.4 : 0.12;
    };
    set(this.signalMats[0], this.signalPhase === 0);
    set(this.signalMats[1], this.signalPhase === 1);
  }

  addStreetlights() {
    const m = new THREE.Matrix4();
    const count = this.xs.length * this.zs.length;
    const poles = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.15, 0.2, 7.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x2f3745, roughness: 0.65, metalness: 0.45 }),
      count
    );
    const lamps = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.44, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xfff3cf, emissive: 0xffdb96, emissiveIntensity: 3 }),
      count
    );
    let li = 0;
    for (let i = 0; i < this.xs.length; i++) {
      for (let j = 0; j < this.zs.length; j++) {
        const x = this.xs[i] + this.wx[i] * 0.45;
        const z = this.zs[j] + this.wz[j] * 0.45;
        if (this.wetPoint(x, z)) continue;
        m.identity().setPosition(x, 3.7, z);
        poles.setMatrixAt(li, m);
        m.identity().setPosition(x, 7.6, z);
        lamps.setMatrixAt(li, m);
        li++;
      }
    }
    poles.count = li; lamps.count = li;
    poles.instanceMatrix.needsUpdate = true;
    lamps.instanceMatrix.needsUpdate = true;
    this.scene.add(poles, lamps);
  }

  addContainers(list) {
    if (!list.length) return;
    const geo = new THREE.BoxGeometry(6.1, 2.6, 12.2);
    const mesh = new THREE.InstancedMesh(
      geo,
      new THREE.MeshStandardMaterial({ vertexColors: false, roughness: 0.72, metalness: 0.35 }),
      list.length
    );
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const axis = new THREE.Vector3(0, 1, 0);
    const scl = new THREE.Vector3(1, 1, 1);
    const pos = new THREE.Vector3();
    const col = new THREE.Color();
    const palette = [0xb5432f, 0x2f6bb5, 0x2f8f5c, 0xb59b2f, 0x7a4bb5, 0xb56d2f];
    list.forEach((c, idx) => {
      q.setFromAxisAngle(axis, c.rot);
      pos.set(c.x, 1.4 + c.y, c.z);
      m.compose(pos, q, scl);
      mesh.setMatrixAt(idx, m);
      col.setHex(palette[Math.floor(c.hue * palette.length) % palette.length]);
      mesh.setColorAt(idx, col);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);
  }

  addTrees(list) {
    if (!list.length) return;
    const m = new THREE.Matrix4();
    const trunk = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.28, 0.36, 2.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x4a3423, roughness: 0.9 }),
      list.length
    );
    const crown = new THREE.InstancedMesh(
      new THREE.ConeGeometry(2.1, 5.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.85 }),
      list.length
    );
    const pos = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    list.forEach((t, idx) => {
      scl.setScalar(t.s);
      pos.set(t.x, 1.3 * t.s + 0.17, t.z);
      m.compose(pos, q, scl);
      trunk.setMatrixAt(idx, m);
      pos.set(t.x, (2.6 + 2.6) * t.s + 0.17, t.z);
      m.compose(pos, q, scl);
      crown.setMatrixAt(idx, m);
    });
    trunk.castShadow = true;
    crown.castShadow = true;
    trunk.instanceMatrix.needsUpdate = true;
    crown.instanceMatrix.needsUpdate = true;
    this.scene.add(trunk, crown);
  }

  addBoundary() {
    const wallH = 7, wallT = 5;
    const m = new THREE.Matrix4();
    const bar = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x39414f, roughness: 0.85, metalness: 0.2 }),
      4
    );
    const cap = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xe8b23a, emissive: 0x8a5f10, emissiveIntensity: 0.9, roughness: 0.7 }),
      4
    );
    const wl = this.half + wallT + 6;
    const span = this.extent + (wallT + 6) * 2;
    [[0, wl, span, wallT], [0, -wl, span, wallT], [wl, 0, wallT, span], [-wl, 0, wallT, span]]
      .forEach(([cx, cz, sx, sz], idx) => {
        m.makeScale(sx, wallH, sz);
        m.setPosition(cx, wallH / 2, cz);
        bar.setMatrixAt(idx, m);
        m.makeScale(sx, 0.5, sz * 1.06);
        m.setPosition(cx, wallH + 0.2, cz);
        cap.setMatrixAt(idx, m);
        this.addBuilding({
          minX: cx - sx / 2, maxX: cx + sx / 2,
          minZ: cz - sz / 2, maxZ: cz + sz / 2,
          height: wallH, wall: true
        });
      });
    bar.instanceMatrix.needsUpdate = true;
    cap.instanceMatrix.needsUpdate = true;
    bar.castShadow = true;
    this.scene.add(bar, cap);
  }

  buildCoins() {
    const geo = new THREE.TorusGeometry(1.05, 0.3, 8, 18);
    geo.rotateY(Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffcc3d, emissive: 0xffaa00, emissiveIntensity: 0.95, metalness: 0.7, roughness: 0.25
    });
    const n = WORLD.coinCount;
    this.coinMesh = new THREE.InstancedMesh(geo, mat, n);
    this.coinMesh.frustumCulled = false;
    this.scene.add(this.coinMesh);
    this.coinMatrix = new THREE.Matrix4();
    this.coinQuat = new THREE.Quaternion();
    this.coinAxis = new THREE.Vector3(0, 1, 0);
    this.coinScale = new THREE.Vector3(1, 1, 1);
    this.coinPos = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const p = i % 7 === 0 && this.alleys.length
        ? this.alleyPoint(this.rng)
        : this.dryRoadPoint(null, 0, this.rng);
      this.coins.push({ x: p.x, z: p.z, y: 1.5, active: true, respawn: 0 });
    }
    this.coinSpin = 0;
    this.updateCoins(0);
  }

  alleyPoint(rnd = Math.random) {
    const a = this.alleys[Math.floor(rnd() * this.alleys.length)];
    const t = (rnd() - 0.5) * a.len * 0.8;
    return a.axis === 'z'
      ? { x: a.x, z: a.z + t, yaw: rnd() < 0.5 ? 0 : Math.PI }
      : { x: a.x + t, z: a.z, yaw: rnd() < 0.5 ? Math.PI / 2 : -Math.PI / 2 };
  }

  randomRoadPoint(avoid, minDist = 0, rnd = Math.random) {
    for (let tries = 0; tries < 50; tries++) {
      const axis = rnd() < 0.5;
      const lines = axis ? this.xs : this.zs;
      const widths = axis ? this.wx : this.wz;
      const idx = Math.floor(rnd() * lines.length);
      const off = (rnd() - 0.5) * widths[idx] * 0.5;
      const along = -this.half + rnd() * this.extent;
      const x = axis ? lines[idx] + off : along;
      const z = axis ? along : lines[idx] + off;
      if (avoid && minDist > 0 && Math.hypot(x - avoid.x, z - avoid.z) < minDist) continue;
      return {
        x, z,
        yaw: axis ? (rnd() < 0.5 ? 0 : Math.PI) : (rnd() < 0.5 ? Math.PI / 2 : -Math.PI / 2)
      };
    }
    return { x: 0, z: 0, yaw: 0 };
  }

  nearestStreetPoint(x, z) {
    let bx = 0, dx = Infinity;
    for (let i = 0; i < this.xs.length; i++) {
      const d = Math.abs(this.xs[i] - x);
      if (d < dx) { dx = d; bx = i; }
    }
    let bz = 0, dz = Infinity;
    for (let j = 0; j < this.zs.length; j++) {
      const d = Math.abs(this.zs[j] - z);
      if (d < dz) { dz = d; bz = j; }
    }
    return dx < dz
      ? { x: this.xs[bx], z, axis: 'z', idx: bx, width: this.wx[bx] }
      : { x, z: this.zs[bz], axis: 'x', idx: bz, width: this.wz[bz] };
  }

  nearby(x, z) {
    const out = [];
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        const list = this.grid.get(this.cellKey(x + a * CELL, z + b * CELL));
        if (list) for (const it of list) if (!out.includes(it)) out.push(it);
      }
    }
    return out;
  }

  collide(v) {
    const r = v.radius;
    let impact = 0;
    let nx = 0, nz = 0;
    for (const b of this.nearby(v.pos.x, v.pos.z)) {
      if (v.pos.y > b.height + 0.2) continue;
      const cx = clamp(v.pos.x, b.minX, b.maxX);
      const cz = clamp(v.pos.z, b.minZ, b.maxZ);
      const dx = v.pos.x - cx;
      const dz = v.pos.z - cz;
      const d = Math.hypot(dx, dz);
      if (d >= r) continue;
      if (d < 0.0001) {
        const toL = v.pos.x - b.minX, toR = b.maxX - v.pos.x;
        const toB = v.pos.z - b.minZ, toT = b.maxZ - v.pos.z;
        const mn = Math.min(toL, toR, toB, toT);
        if (mn === toL) v.pos.x = b.minX - r;
        else if (mn === toR) v.pos.x = b.maxX + r;
        else if (mn === toB) v.pos.z = b.minZ - r;
        else v.pos.z = b.maxZ + r;
        v.vel.multiplyScalar(0.3);
        continue;
      }
      const inv = 1 / d;
      const ux = dx * inv, uz = dz * inv;
      const push = r - d;
      v.pos.x += ux * push;
      v.pos.z += uz * push;
      const vn = v.vel.x * ux + v.vel.z * uz;
      if (vn < 0) {
        impact = Math.max(impact, -vn);
        v.vel.x -= ux * vn * 1.35;
        v.vel.z -= uz * vn * 1.35;
        nx = ux; nz = uz;
      }
    }
    if (impact > 0) {
      v.fwdSpeed = v.vel.dot(v.forward());
      v.latSpeed = v.vel.dot(v.right());
    }
    return { impact, nx, nz };
  }

  collectCoins(pos, radius = 3.4) {
    let got = 0;
    for (const c of this.coins) {
      if (!c.active) continue;
      if (Math.abs(pos.y + 0.8 - c.y) > 4.5) continue;
      if (Math.hypot(pos.x - c.x, pos.z - c.z) < radius + 1.2) {
        c.active = false;
        c.respawn = 6 + Math.random() * 8;
        got += COIN_VALUE;
      }
    }
    return got;
  }

  updateCoins(dt) {
    this.coinSpin += dt * 1.8;
    const q = this.coinQuat.setFromAxisAngle(this.coinAxis, this.coinSpin);
    for (let i = 0; i < this.coins.length; i++) {
      const c = this.coins[i];
      if (!c.active) {
        c.respawn -= dt;
        if (c.respawn <= 0) {
          const p = this.dryRoadPoint();
          c.x = p.x; c.z = p.z; c.active = true;
        } else {
          this.coinScale.setScalar(0.0001);
          this.coinPos.set(c.x, -60, c.z);
          this.coinMatrix.compose(this.coinPos, q, this.coinScale);
          this.coinMesh.setMatrixAt(i, this.coinMatrix);
          continue;
        }
      }
      this.coinScale.setScalar(1);
      this.coinPos.set(c.x, c.y + Math.sin(this.coinSpin * 1.6 + i) * 0.18, c.z);
      this.coinMatrix.compose(this.coinPos, q, this.coinScale);
      this.coinMesh.setMatrixAt(i, this.coinMatrix);
    }
    this.coinMesh.instanceMatrix.needsUpdate = true;
  }

  update(dt) {
    this.updateCoins(dt);
    this.updateSignals(dt);
    if (this.waterTex) {
      this.waterTex.offset.x = (this.waterTex.offset.x + dt * 0.035) % 1;
      this.waterTex.offset.y = (this.waterTex.offset.y + dt * 0.021) % 1;
    }
  }
}
