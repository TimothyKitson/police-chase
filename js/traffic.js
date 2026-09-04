import * as THREE from '../vendor/three.module.js';
import { TRAFFIC, WORLD } from './config.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

const PALETTE = [
  0xb8bec7, 0x2f3540, 0x8e2f2f, 0x25506e, 0x2f6b4a,
  0xb5892f, 0x6a4b8f, 0xd6d9de, 0x40464f, 0x7d3b2a
];

function mergeBoxes(defs) {
  const parts = [];
  let total = 0;
  for (const d of defs) {
    const g = new THREE.BoxGeometry(d.w, d.h, d.d).toNonIndexed();
    g.translate(d.x || 0, d.y || 0, d.z || 0);
    parts.push(g);
    total += g.attributes.position.count;
  }
  const pos = new Float32Array(total * 3);
  const norm = new Float32Array(total * 3);
  let o = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, o * 3);
    norm.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  out.computeBoundingSphere();
  return out;
}

export class Traffic {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.cars = [];
    this.count = WORLD.trafficCars;
    this.tmpM = new THREE.Matrix4();
    this.tmpQ = new THREE.Quaternion();
    this.tmpP = new THREE.Vector3();
    this.tmpS = new THREE.Vector3(1, 1, 1);
    this.axisY = new THREE.Vector3(0, 1, 0);
    this.buildMeshes();
    this.spawnAll();
  }

  buildMeshes() {
    const body = mergeBoxes([
      { w: 1.94, h: 0.62, d: 4.3, y: 0.72 },
      { w: 1.7, h: 0.46, d: 1.9, y: 1.26, z: -0.25 },
      { w: 1.82, h: 0.2, d: 1.1, y: 1.05, z: 1.2 }
    ]);
    const details = mergeBoxes([
      { w: 0.34, h: 0.62, d: 0.66, x: -0.9, y: 0.36, z: 1.35 },
      { w: 0.34, h: 0.62, d: 0.66, x: 0.9, y: 0.36, z: 1.35 },
      { w: 0.34, h: 0.62, d: 0.66, x: -0.9, y: 0.36, z: -1.35 },
      { w: 0.34, h: 0.62, d: 0.66, x: 0.9, y: 0.36, z: -1.35 },
      { w: 1.56, h: 0.4, d: 0.12, y: 1.24, z: 0.68 }
    ]);
    const tails = mergeBoxes([
      { w: 0.46, h: 0.16, d: 0.1, x: -0.62, y: 0.85, z: -2.16 },
      { w: 0.46, h: 0.16, d: 0.1, x: 0.62, y: 0.85, z: -2.16 }
    ]);
    const heads = mergeBoxes([
      { w: 0.4, h: 0.16, d: 0.1, x: -0.66, y: 0.85, z: 2.16 },
      { w: 0.4, h: 0.16, d: 0.1, x: 0.66, y: 0.85, z: 2.16 }
    ]);

    this.bodyMesh = new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({
      roughness: 0.42, metalness: 0.5
    }), this.count);
    this.detailMesh = new THREE.InstancedMesh(details, new THREE.MeshStandardMaterial({
      color: 0x14171c, roughness: 0.8, metalness: 0.2
    }), this.count);
    this.lightMesh = new THREE.InstancedMesh(tails, new THREE.MeshStandardMaterial({
      color: 0xff5555, emissive: 0xff2200, emissiveIntensity: 1.1, roughness: 0.5
    }), this.count);
    this.headMesh = new THREE.InstancedMesh(heads, new THREE.MeshStandardMaterial({
      color: 0xfff2d0, emissive: 0xffeeb0, emissiveIntensity: 1.5, roughness: 0.4
    }), this.count);

    const c = new THREE.Color();
    for (let i = 0; i < this.count; i++) {
      c.setHex(PALETTE[i % PALETTE.length]);
      this.bodyMesh.setColorAt(i, c);
    }
    this.instColor = c;

    this.bodyMesh.castShadow = true;
    for (const m of [this.bodyMesh, this.detailMesh, this.lightMesh, this.headMesh]) {
      m.frustumCulled = false;
      this.scene.add(m);
    }
  }

  neighbours(i, j) {
    const w = this.world;
    const out = [];
    const maxI = w.xs.length - 1, maxJ = w.zs.length - 1;
    const open = (axis, a, b) => !w.segmentWet(axis, a, b) && !w.segmentBlocked(axis, a, b);
    if (i < maxI && open('x', i, j)) out.push([i + 1, j]);
    if (i > 0 && open('x', i - 1, j)) out.push([i - 1, j]);
    if (j < maxJ && open('z', i, j)) out.push([i, j + 1]);
    if (j > 0 && open('z', i, j - 1)) out.push([i, j - 1]);
    return out;
  }

  randomNode() {
    const w = this.world;
    for (let k = 0; k < 60; k++) {
      const i = Math.floor(Math.random() * w.xs.length);
      const j = Math.floor(Math.random() * w.zs.length);
      if (w.wetPoint(w.xs[i], w.zs[j])) continue;
      if (this.neighbours(i, j).length) return [i, j];
    }
    return [0, 0];
  }

  spawnAll() {
    for (let n = 0; n < this.count; n++) {
      const car = {
        i: 0, j: 0, ti: 0, tj: 0, t: 0,
        speed: 0, want: 0, color: PALETTE[n % PALETTE.length],
        x: 0, z: 0, y: 0, yaw: 0, state: 'drive',
        vx: 0, vz: 0, spin: 0, timer: 0, active: false
      };
      this.cars.push(car);
      this.place(car);
    }
  }

  place(car, near) {
    const w = this.world;
    let node = null;
    for (let k = 0; k < 40; k++) {
      const cand = this.randomNode();
      if (!near) { node = cand; break; }
      const d = Math.hypot(w.xs[cand[0]] - near.x, w.zs[cand[1]] - near.z);
      if (d > TRAFFIC.spawnClear && d < TRAFFIC.simRadius * 0.85) { node = cand; break; }
    }
    if (!node) node = this.randomNode();
    const opts = this.neighbours(node[0], node[1]);
    if (!opts.length) { car.active = false; return; }
    const to = opts[Math.floor(Math.random() * opts.length)];
    car.i = node[0]; car.j = node[1];
    car.ti = to[0]; car.tj = to[1];
    car.t = Math.random();
    car.want = TRAFFIC.minSpeed + Math.random() * (TRAFFIC.maxSpeed - TRAFFIC.minSpeed);
    car.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    car.speed = car.want;
    car.state = 'drive';
    car.timer = 0;
    car.active = true;
    this.evaluate(car);
  }

  laneOffset(car) {
    const w = this.world;
    const dx = Math.sign(car.ti - car.i);
    const dz = Math.sign(car.tj - car.j);
    if (dx !== 0) {
      const width = w.wz[car.j];
      return { ox: 0, oz: -dx * width * 0.24 };
    }
    const width = w.wx[car.i];
    return { ox: dz * width * 0.24, oz: 0 };
  }

  evaluate(car) {
    const w = this.world;
    const ax = w.xs[car.i], az = w.zs[car.j];
    const bx = w.xs[car.ti], bz = w.zs[car.tj];
    car.len = Math.hypot(bx - ax, bz - az);
    const { ox, oz } = this.laneOffset(car);
    car.ax = ax + ox; car.az = az + oz;
    car.bx = bx + ox; car.bz = bz + oz;
    car.targetYaw = Math.atan2(car.bx - car.ax, car.bz - car.az);
  }

  advance(car) {
    const opts = this.neighbours(car.ti, car.tj);
    const forward = opts.filter(([ni, nj]) => !(ni === car.i && nj === car.j));
    let next;
    if (!forward.length) next = [car.i, car.j];
    else if (forward.length === 1 || Math.random() > TRAFFIC.turnChance) {
      const straight = forward.find(([ni, nj]) =>
        ni - car.ti === car.ti - car.i && nj - car.tj === car.tj - car.j);
      next = straight || forward[Math.floor(Math.random() * forward.length)];
    } else {
      next = forward[Math.floor(Math.random() * forward.length)];
    }
    car.i = car.ti; car.j = car.tj;
    car.ti = next[0]; car.tj = next[1];
    car.t = 0;
    this.evaluate(car);
  }

  edgeKey(car) {
    return ((car.i * 31 + car.j) * 31 + car.ti) * 31 + car.tj;
  }

  rebuildBuckets() {
    if (!this.buckets) this.buckets = new Map();
    this.buckets.clear();
    for (const car of this.cars) {
      if (!car.active || car.state !== 'drive') continue;
      const k = this.edgeKey(car);
      let list = this.buckets.get(k);
      if (!list) { list = []; this.buckets.set(k, list); }
      list.push(car);
    }
  }

  gapAhead(car) {
    const list = this.buckets.get(this.edgeKey(car));
    if (!list) return Infinity;
    let gap = Infinity;
    for (const o of list) {
      if (o === car || o.t <= car.t) continue;
      const d = (o.t - car.t) * car.len;
      if (d < gap) gap = d;
    }
    return gap;
  }

  update(dt, playerPos) {
    const w = this.world;
    this.rebuildBuckets();
    for (let n = 0; n < this.cars.length; n++) {
      const car = this.cars[n];
      if (!car.active) { this.place(car, playerPos); continue; }

      const far = Math.hypot(car.x - playerPos.x, car.z - playerPos.z);
      if (far > TRAFFIC.simRadius) { this.place(car, playerPos); continue; }

      if (car.state === 'spun') {
        car.timer -= dt;
        const fr = Math.exp(-1.5 * dt);
        car.vx *= fr; car.vz *= fr;
        car.x += car.vx * dt;
        car.z += car.vz * dt;
        car.yaw += car.spin * dt;
        car.spin *= fr;
        car.y += (w.floorAt(car.x, car.z) - car.y) * Math.min(1, dt * 8);
        if (car.timer <= 0) this.place(car, playerPos);
      } else {
        const gap = this.gapAhead(car);
        let want = car.want;
        if (gap < TRAFFIC.followGap) want *= clamp(gap / TRAFFIC.followGap, 0, 1);
        if (car.t > 0.86) want *= TRAFFIC.junctionSlow;
        car.speed += (want - car.speed) * Math.min(1, dt * 3.4);
        car.t += (car.speed * dt) / Math.max(1, car.len);
        if (car.t >= 1) this.advance(car);
        car.x = car.ax + (car.bx - car.ax) * car.t;
        car.z = car.az + (car.bz - car.az) * car.t;
        car.y = w.floorAt(car.x, car.z);
        let d = car.targetYaw - car.yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        car.yaw += d * Math.min(1, dt * 6);
      }
    }
    this.sync();
  }

  sync() {
    let n = 0;
    for (const car of this.cars) {
      if (!car.active) continue;
      this.tmpQ.setFromAxisAngle(this.axisY, car.yaw);
      this.tmpP.set(car.x, car.y, car.z);
      this.tmpM.compose(this.tmpP, this.tmpQ, this.tmpS);
      this.bodyMesh.setMatrixAt(n, this.tmpM);
      this.detailMesh.setMatrixAt(n, this.tmpM);
      this.lightMesh.setMatrixAt(n, this.tmpM);
      this.headMesh.setMatrixAt(n, this.tmpM);
      this.instColor.setHex(car.color);
      this.bodyMesh.setColorAt(n, this.instColor);
      n++;
    }
    this.bodyMesh.count = n;
    this.detailMesh.count = n;
    this.lightMesh.count = n;
    this.headMesh.count = n;
    this.bodyMesh.instanceMatrix.needsUpdate = true;
    this.detailMesh.instanceMatrix.needsUpdate = true;
    this.lightMesh.instanceMatrix.needsUpdate = true;
    this.headMesh.instanceMatrix.needsUpdate = true;
    if (this.bodyMesh.instanceColor) this.bodyMesh.instanceColor.needsUpdate = true;
  }

  collide(v, opts = {}) {
    let impact = 0;
    const r = v.radius + 2.05;
    for (const car of this.cars) {
      if (!car.active || car.state === 'spun') continue;
      if (Math.abs(car.y - v.pos.y) > 2.6) continue;
      const dx = v.pos.x - car.x;
      const dz = v.pos.z - car.z;
      const d = Math.hypot(dx, dz);
      if (d >= r || d < 0.0001) continue;
      const ux = dx / d, uz = dz / d;
      const push = r - d;
      v.pos.x += ux * push * 0.75;
      v.pos.z += uz * push * 0.75;
      const rel = -(v.vel.x * ux + v.vel.z * uz);
      if (rel > 1) {
        impact = Math.max(impact, rel);
        v.vel.x += ux * rel * 0.55;
        v.vel.z += uz * rel * 0.55;
        v.fwdSpeed = v.vel.dot(v.forward());
        v.latSpeed = v.vel.dot(v.right());
        car.state = 'spun';
        car.timer = 5;
        car.vx = -ux * rel * 0.75;
        car.vz = -uz * rel * 0.75;
        car.spin = (Math.random() - 0.5) * rel * 0.4;
      }
    }
    return impact;
  }
}
