import * as THREE from '../vendor/three.module.js';
import { WORLD, COIN_VALUE } from './config.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

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

function facadeTextures(rnd) {
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

  const t1 = new THREE.CanvasTexture(base);
  const t2 = new THREE.CanvasTexture(glow);
  for (const t of [t1, t2]) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
  }
  return { facade: t1, glow: t2 };
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
  for (let i = 0; i < 60; i++) {
    ctx.fillRect(rnd() * 16, rnd() * 90, 1, 1);
  }
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
    this.N = WORLD.blocks;
    this.B = WORLD.blockSize;
    this.RW = WORLD.roadWidth;
    this.extent = this.N * this.B;
    this.half = this.extent / 2;
    this.buildings = [];
    this.grid = new Map();
    this.coins = [];
    this.build();
  }

  key(i, j) { return i * 1000 + j; }

  blockIndex(x, z) {
    return [
      clamp(Math.floor((x + this.half) / this.B), 0, this.N - 1),
      clamp(Math.floor((z + this.half) / this.B), 0, this.N - 1)
    ];
  }

  addBuilding(b) {
    this.buildings.push(b);
    const [i0, j0] = this.blockIndex(b.minX, b.minZ);
    const [i1, j1] = this.blockIndex(b.maxX, b.maxZ);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const k = this.key(i, j);
        if (!this.grid.has(k)) this.grid.set(k, []);
        this.grid.get(k).push(b);
      }
    }
  }

  build() {
    const { N, B, RW, half, extent } = this;
    const scene = this.scene;
    const rnd = this.rng;
    const rand = this.rand;

    scene.background = skyTexture(rnd);
    scene.fog = new THREE.Fog(0x1d2740, 130, 640);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(extent + 500, extent + 500),
      new THREE.MeshStandardMaterial({ color: 0x191d24, roughness: 0.88, metalness: 0.06 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const m = new THREE.Matrix4();
    const inner = B - RW;
    const plazas = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x333a45, roughness: 0.82 }),
      N * N
    );
    plazas.receiveShadow = true;
    let pi = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        m.makeScale(inner, 0.34, inner);
        m.setPosition(-half + i * B + B / 2, 0.17, -half + j * B + B / 2);
        plazas.setMatrixAt(pi++, m);
      }
    }
    plazas.instanceMatrix.needsUpdate = true;
    scene.add(plazas);

    const dashGeo = new THREE.PlaneGeometry(0.44, 3.6);
    dashGeo.rotateX(-Math.PI / 2);
    const dashes = new THREE.InstancedMesh(
      dashGeo,
      new THREE.MeshBasicMaterial({ color: 0xe4e2cc, transparent: true, opacity: 0.42 }),
      (N + 1) * Math.floor(extent / 9) * 2
    );
    const rot = new THREE.Matrix4().makeRotationY(Math.PI / 2);
    const step = 9;
    let di = 0;
    for (let i = 0; i <= N; i++) {
      const line = -half + i * B;
      for (let s = 0, n = Math.floor(extent / step); s < n; s++) {
        const along = -half + s * step + step * 0.5;
        m.identity().setPosition(line, 0.02, along);
        dashes.setMatrixAt(di++, m);
        m.copy(rot).setPosition(along, 0.02, line);
        dashes.setMatrixAt(di++, m);
      }
    }
    dashes.count = di;
    dashes.instanceMatrix.needsUpdate = true;
    scene.add(dashes);

    const lots = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (rnd() < 0.08) continue;
        const bx0 = -half + i * B + RW / 2;
        const bz0 = -half + j * B + RW / 2;
        const size = B - RW;
        const splitX = rnd() < 0.55;
        const parts = rnd() < 0.45 ? 2 : 1;
        for (let p = 0; p < parts; p++) {
          const frac = parts === 1 ? 1 : (p === 0 ? 0.52 : 0.48);
          const offFrac = parts === 1 ? 0 : (p === 0 ? 0 : 0.52);
          let x0 = bx0, z0 = bz0, sx = size, sz = size;
          if (parts === 2) {
            if (splitX) { x0 = bx0 + size * offFrac; sx = size * frac; }
            else { z0 = bz0 + size * offFrac; sz = size * frac; }
          }
          const mg = rand(2.5, 6);
          const w = Math.max(9, sx - mg * 2);
          const d = Math.max(9, sz - mg * 2);
          const edge = Math.min(i, j, N - 1 - i, N - 1 - j);
          const centerBias = 1 - edge / (N / 2);
          const h = clamp(
            WORLD.minBuildingHeight + Math.pow(rnd(), 1.7) * WORLD.maxBuildingHeight * (0.45 + centerBias * 0.9),
            WORLD.minBuildingHeight, WORLD.maxBuildingHeight * 1.4
          );
          lots.push({ cx: x0 + sx / 2, cz: z0 + sz / 2, w, d, h });
        }
      }
    }

    const walls = new MeshBuilder(true);
    const roofs = new MeshBuilder(false);
    const tint = new THREE.Color();
    for (const l of lots) {
      const t = rand(0.72, 1.12);
      tint.setRGB(t * rand(0.9, 1.0), t * rand(0.93, 1.0), t * rand(0.98, 1.12));
      const c = [tint.r, tint.g, tint.b];
      const x0 = l.cx - l.w / 2, x1 = l.cx + l.w / 2;
      const z0 = l.cz - l.d / 2, z1 = l.cz + l.d / 2;
      const h = l.h;
      const uW = l.w / TILE_U, uD = l.d / TILE_U, vH = h / TILE_V;

      walls.quad([[x0, 0, z1], [x1, 0, z1], [x1, h, z1], [x0, h, z1]], [0, 0, 1], uW, vH, c);
      walls.quad([[x1, 0, z0], [x0, 0, z0], [x0, h, z0], [x1, h, z0]], [0, 0, -1], uW, vH, c);
      walls.quad([[x1, 0, z1], [x1, 0, z0], [x1, h, z0], [x1, h, z1]], [1, 0, 0], uD, vH, c);
      walls.quad([[x0, 0, z0], [x0, 0, z1], [x0, h, z1], [x0, h, z0]], [-1, 0, 0], uD, vH, c);

      const rc = [c[0] * 0.42, c[1] * 0.44, c[2] * 0.48];
      roofs.quad([[x0, h, z1], [x1, h, z1], [x1, h, z0], [x0, h, z0]], [0, 1, 0], 1, 1, rc);
      const ph = rand(1.2, 3.4);
      const pw = Math.min(l.w, l.d) * rand(0.18, 0.34);
      const px = l.cx + rand(-l.w * 0.2, l.w * 0.2);
      const pz = l.cz + rand(-l.d * 0.2, l.d * 0.2);
      const a0 = px - pw / 2, a1 = px + pw / 2, b0 = pz - pw / 2, b1 = pz + pw / 2;
      const top = h + ph;
      roofs.quad([[a0, h, b1], [a1, h, b1], [a1, top, b1], [a0, top, b1]], [0, 0, 1], 1, 1, rc);
      roofs.quad([[a1, h, b0], [a0, h, b0], [a0, top, b0], [a1, top, b0]], [0, 0, -1], 1, 1, rc);
      roofs.quad([[a1, h, b1], [a1, h, b0], [a1, top, b0], [a1, top, b1]], [1, 0, 0], 1, 1, rc);
      roofs.quad([[a0, h, b0], [a0, h, b1], [a0, top, b1], [a0, top, b0]], [-1, 0, 0], 1, 1, rc);
      roofs.quad([[a0, top, b1], [a1, top, b1], [a1, top, b0], [a0, top, b0]], [0, 1, 0], 1, 1, rc);

      this.addBuilding({
        minX: x0, maxX: x1, minZ: z0, maxZ: z1, height: h
      });
    }

    const tex = facadeTextures(rnd);
    const wallMesh = new THREE.Mesh(walls.geometry(), new THREE.MeshStandardMaterial({
      map: tex.facade,
      emissiveMap: tex.glow,
      emissive: 0xffffff,
      emissiveIntensity: 1.05,
      vertexColors: true,
      roughness: 0.74,
      metalness: 0.1
    }));
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    scene.add(wallMesh);

    const roofMesh = new THREE.Mesh(roofs.geometry(), new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.9, metalness: 0.1
    }));
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    scene.add(roofMesh);

    const wallH = 95;
    const wallT = 7;
    const bar = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x232935, roughness: 0.92 }),
      4
    );
    const wl = half + wallT;
    [[0, wl, extent + wallT * 2, wallT],
     [0, -wl, extent + wallT * 2, wallT],
     [wl, 0, wallT, extent + wallT * 2],
     [-wl, 0, wallT, extent + wallT * 2]].forEach(([cx, cz, sx, sz], idx) => {
      m.makeScale(sx, wallH, sz);
      m.setPosition(cx, wallH / 2, cz);
      bar.setMatrixAt(idx, m);
      this.addBuilding({
        minX: cx - sx / 2, maxX: cx + sx / 2,
        minZ: cz - sz / 2, maxZ: cz + sz / 2,
        height: wallH, wall: true
      });
    });
    bar.instanceMatrix.needsUpdate = true;
    scene.add(bar);

    const count = (N + 1) * (N + 1);
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
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N; j++) {
        const x = -half + i * B + RW * 0.42;
        const z = -half + j * B + RW * 0.42;
        m.identity().setPosition(x, 3.7, z);
        poles.setMatrixAt(li, m);
        m.identity().setPosition(x, 7.6, z);
        lamps.setMatrixAt(li, m);
        li++;
      }
    }
    poles.instanceMatrix.needsUpdate = true;
    lamps.instanceMatrix.needsUpdate = true;
    scene.add(poles, lamps);

    this.buildCoins();
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
      const p = this.randomRoadPoint(null, 0, this.rng);
      this.coins.push({ x: p.x, z: p.z, y: 1.5, active: true, respawn: 0 });
    }
    this.coinSpin = 0;
    this.updateCoins(0);
  }

  randomRoadPoint(avoid, minDist = 0, rnd = Math.random) {
    const { N, B, half } = this;
    const range = (a, b) => a + rnd() * (b - a);
    for (let tries = 0; tries < 40; tries++) {
      const axis = rnd() < 0.5;
      const line = -half + Math.floor(range(0, N + 1)) * B;
      const along = range(-half + 8, half - 8);
      const off = range(-this.RW * 0.26, this.RW * 0.26);
      const x = axis ? line + off : along;
      const z = axis ? along : line + off;
      if (avoid && minDist > 0 && Math.hypot(x - avoid.x, z - avoid.z) < minDist) continue;
      return {
        x, z,
        yaw: axis ? (rnd() < 0.5 ? 0 : Math.PI) : (rnd() < 0.5 ? Math.PI / 2 : -Math.PI / 2)
      };
    }
    return { x: 0, z: 0, yaw: 0 };
  }

  nearby(x, z) {
    const [i, j] = this.blockIndex(x, z);
    const out = [];
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        const list = this.grid.get(this.key(clamp(i + a, 0, this.N - 1), clamp(j + b, 0, this.N - 1)));
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
      let dx = v.pos.x - cx;
      let dz = v.pos.z - cz;
      let d = Math.hypot(dx, dz);
      if (d >= r) continue;
      if (d < 0.0001) {
        const toL = Math.abs(v.pos.x - b.minX), toR = Math.abs(b.maxX - v.pos.x);
        const toB = Math.abs(v.pos.z - b.minZ), toT = Math.abs(b.maxZ - v.pos.z);
        const mn = Math.min(toL, toR, toB, toT);
        dx = mn === toL ? -1 : mn === toR ? 1 : 0;
        dz = mn === toB ? -1 : mn === toT ? 1 : 0;
        d = 0.0001;
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
          const p = this.randomRoadPoint();
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

  update(dt) { this.updateCoins(dt); }
}
