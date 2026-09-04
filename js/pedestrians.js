import * as THREE from '../vendor/three.module.js';

const COUNT = 110;
const SIM_RADIUS = 165;
const INSET = 1.5;

const SHIRTS = [
  0xd94f4f, 0x4f7fd9, 0x4fd98f, 0xd9c94f, 0xa14fd9,
  0xe0e0e0, 0x2f3540, 0xd97f3f, 0x3fd9d0, 0xd94f9f
];

function mergeParts(defs) {
  const geos = defs.map(d => {
    const g = new THREE.BoxGeometry(d.w, d.h, d.d).toNonIndexed();
    g.translate(d.x || 0, d.y || 0, d.z || 0);
    return g;
  });
  let total = 0;
  for (const g of geos) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const norm = new Float32Array(total * 3);
  let o = 0;
  for (const g of geos) {
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

export class Pedestrians {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.people = [];
    this.tmpM = new THREE.Matrix4();
    this.tmpQ = new THREE.Quaternion();
    this.tmpP = new THREE.Vector3();
    this.tmpS = new THREE.Vector3(1, 1, 1);
    this.axisY = new THREE.Vector3(0, 1, 0);
    this.color = new THREE.Color();

    this.blocks = world.blocks.filter(b =>
      b.x1 - b.x0 > 16 && b.z1 - b.z0 > 16 && !world.wetPoint((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2));

    this.body = new THREE.InstancedMesh(
      mergeParts([
        { w: 0.44, h: 0.62, d: 0.26, y: 1.14 },
        { w: 0.16, h: 0.52, d: 0.18, x: -0.13, y: 0.56 },
        { w: 0.16, h: 0.52, d: 0.18, x: 0.13, y: 0.56 }
      ]),
      new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 }),
      COUNT
    );
    this.head = new THREE.InstancedMesh(
      mergeParts([{ w: 0.26, h: 0.28, d: 0.24, y: 1.6 }]),
      new THREE.MeshStandardMaterial({ color: 0xc9a07c, roughness: 0.9 }),
      COUNT
    );
    for (const m of [this.body, this.head]) {
      m.frustumCulled = false;
      scene.add(m);
    }
    for (let i = 0; i < COUNT; i++) {
      this.color.setHex(SHIRTS[i % SHIRTS.length]);
      this.body.setColorAt(i, this.color);
    }

    for (let i = 0; i < COUNT; i++) {
      this.people.push({ block: null, edge: 0, t: 0, dir: 1, speed: 1, phase: 0, dodge: 0, active: false });
    }
    if (this.blocks.length) for (const p of this.people) this.place(p);
  }

  place(p, near) {
    if (!this.blocks.length) return;
    for (let k = 0; k < 24; k++) {
      const b = this.blocks[Math.floor(Math.random() * this.blocks.length)];
      const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
      if (near) {
        const d = Math.hypot(cx - near.x, cz - near.z);
        if (d > SIM_RADIUS * 0.9) continue;
      }
      p.block = b;
      p.edge = Math.floor(Math.random() * 4);
      p.t = Math.random();
      p.dir = Math.random() < 0.5 ? 1 : -1;
      p.speed = 0.9 + Math.random() * 0.9;
      p.phase = Math.random() * Math.PI * 2;
      p.dodge = 0;
      p.active = true;
      return;
    }
    p.active = false;
  }

  edgePoint(p) {
    const b = p.block;
    const x0 = b.x0 + INSET, x1 = b.x1 - INSET;
    const z0 = b.z0 + INSET, z1 = b.z1 - INSET;
    const t = p.t;
    switch (p.edge) {
      case 0: return { x: x0 + (x1 - x0) * t, z: z0, yaw: p.dir > 0 ? Math.PI / 2 : -Math.PI / 2, len: x1 - x0 };
      case 1: return { x: x1, z: z0 + (z1 - z0) * t, yaw: p.dir > 0 ? 0 : Math.PI, len: z1 - z0 };
      case 2: return { x: x1 - (x1 - x0) * t, z: z1, yaw: p.dir > 0 ? -Math.PI / 2 : Math.PI / 2, len: x1 - x0 };
      default: return { x: x0, z: z1 - (z1 - z0) * t, yaw: p.dir > 0 ? Math.PI : 0, len: z1 - z0 };
    }
  }

  update(dt, player) {
    let n = 0;
    for (const p of this.people) {
      if (!p.active) { this.place(p, player.pos); continue; }
      const at = this.edgePoint(p);
      const far = Math.hypot(at.x - player.pos.x, at.z - player.pos.z);
      if (far > SIM_RADIUS) { this.place(p, player.pos); continue; }

      p.t += (p.speed * p.dir * dt) / Math.max(4, at.len);
      if (p.t > 1) { p.t = 0; p.edge = (p.edge + 1) % 4; }
      else if (p.t < 0) { p.t = 1; p.edge = (p.edge + 3) % 4; }

      const scare = far < 9 && player.speed > 6 ? 1 : 0;
      p.dodge += (scare - p.dodge) * Math.min(1, dt * 6);
      p.phase += dt * (4 + p.speed * 3) * (1 + p.dodge * 1.4);

      const away = p.edge === 0 ? { x: 0, z: 1 }
        : p.edge === 1 ? { x: -1, z: 0 }
        : p.edge === 2 ? { x: 0, z: -1 }
        : { x: 1, z: 0 };
      const plaza = 0.17;
      const push = p.dodge * 1.5;
      const bob = Math.abs(Math.sin(p.phase)) * 0.07;

      this.tmpQ.setFromAxisAngle(this.axisY, at.yaw);
      this.tmpP.set(at.x + away.x * push, plaza + bob, at.z + away.z * push);
      this.tmpM.compose(this.tmpP, this.tmpQ, this.tmpS);
      this.body.setMatrixAt(n, this.tmpM);
      this.head.setMatrixAt(n, this.tmpM);
      this.color.setHex(SHIRTS[(n * 7) % SHIRTS.length]);
      this.body.setColorAt(n, this.color);
      n++;
    }
    this.body.count = n;
    this.head.count = n;
    this.body.instanceMatrix.needsUpdate = true;
    this.head.instanceMatrix.needsUpdate = true;
    if (this.body.instanceColor) this.body.instanceColor.needsUpdate = true;
  }
}
