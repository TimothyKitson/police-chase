import * as THREE from '../vendor/three.module.js';
import { HAZARD, WORLD } from './config.js';

export class Hazards {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.blocks = [];
    this.traps = [];
    this.dynamic = [];
    this.barrierGeo = new THREE.BoxGeometry(3.4, 1.05, 0.42);
    this.barrierMat = new THREE.MeshStandardMaterial({
      color: 0xe8622a, roughness: 0.65, metalness: 0.15
    });
    this.legGeo = new THREE.BoxGeometry(0.22, 0.9, 0.22);
    this.legMat = new THREE.MeshStandardMaterial({ color: 0x2a2f37, roughness: 0.8 });
    this.stripeMat = new THREE.MeshStandardMaterial({ color: 0xf2f4f8, roughness: 0.7 });
    this.build();
  }

  build() {
    const w = this.world;
    const rnd = w.rng;
    for (let guard = 0; guard < 400 && this.blocks.length < WORLD.staticRoadblocks; guard++) {
      const axis = rnd() < 0.5 ? 'x' : 'z';
      const lines = axis === 'x' ? w.zs : w.xs;
      const widths = axis === 'x' ? w.wz : w.wx;
      const idx = Math.floor(rnd() * lines.length);
      if (widths[idx] < 14) continue;
      const along = -w.half + rnd() * w.extent;
      const x = axis === 'x' ? along : lines[idx];
      const z = axis === 'x' ? lines[idx] : along;
      if (w.wetPoint(x, z) || w.floorAt(x, z) > 0.05) continue;
      if (this.blocks.some(b => Math.hypot(b.x - x, b.z - z) < 90)) continue;
      this.addBlock(x, z, axis, widths[idx], false);
    }

    const carBody = [];
    for (let guard = 0; guard < 400 && this.traps.length < WORLD.policePosts; guard++) {
      const i = Math.floor(rnd() * w.xs.length);
      const j = Math.floor(rnd() * w.zs.length);
      const x = w.xs[i], z = w.zs[j];
      if (w.wetPoint(x, z)) continue;
      if (this.traps.some(t => Math.hypot(t.x - x, t.z - z) < 120)) continue;
      const axis = rnd() < 0.5 ? 'x' : 'z';
      const ox = axis === 'x' ? 0 : w.wx[i] * 0.62;
      const oz = axis === 'x' ? w.wz[j] * 0.62 : 0;
      this.traps.push({ x: x + ox, z: z + oz, cooldown: 0 });
      carBody.push({ x: x + ox, z: z + oz, axis });
    }
    this.addTrapProps(carBody);
  }

  addTrapProps(list) {
    if (!list.length) return;
    const pole = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.13, 0.16, 4.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x343b46, roughness: 0.7, metalness: 0.4 }),
      list.length
    );
    const cam = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.9, 0.62, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x1d232c, roughness: 0.6, metalness: 0.3 }),
      list.length
    );
    const lens = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.5, 0.3, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x2255ff, emissive: 0x1144ff, emissiveIntensity: 2.2 }),
      list.length
    );
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const axisY = new THREE.Vector3(0, 1, 0);
    const p = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    list.forEach((t, idx) => {
      const yaw = t.axis === 'x' ? 0 : Math.PI / 2;
      q.setFromAxisAngle(axisY, yaw);
      p.set(t.x, 2.3, t.z);
      m.compose(p, q, one);
      pole.setMatrixAt(idx, m);
      p.set(t.x, 4.6, t.z);
      m.compose(p, q, one);
      cam.setMatrixAt(idx, m);
      p.set(t.x + Math.sin(yaw) * 0.62, 4.6, t.z + Math.cos(yaw) * 0.62);
      m.compose(p, q, one);
      lens.setMatrixAt(idx, m);
    });
    for (const mesh of [pole, cam, lens]) {
      mesh.castShadow = true;
      mesh.instanceMatrix.needsUpdate = true;
      this.scene.add(mesh);
    }
    this.trapMeshes = { pole, cam, lens };
  }

  addBlock(x, z, axis, streetWidth, dynamic) {
    const seg = this.world.segmentAt(x, z, axis);
    this.world.blockSegment(seg.axis, seg.i, seg.j);
    const block = { x, z, axis, seg, barriers: [], dynamic, life: dynamic ? 26 : Infinity };
    const span = Math.min(streetWidth * 0.9, 20);
    const n = Math.max(2, Math.round(span / 3.6));
    for (let k = 0; k < n; k++) {
      const t = (k - (n - 1) / 2) * 3.6;
      const bx = axis === 'x' ? x : x + t;
      const bz = axis === 'x' ? z + t : z;
      const group = new THREE.Group();
      const bar = new THREE.Mesh(this.barrierGeo, this.barrierMat);
      bar.position.y = 1.0;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.06, 0.44), this.stripeMat);
      stripe.position.y = 1.0;
      group.add(bar, stripe);
      for (const sx of [-1.4, 1.4]) {
        const leg = new THREE.Mesh(this.legGeo, this.legMat);
        leg.position.set(sx, 0.45, 0);
        group.add(leg);
      }
      group.position.set(bx, 0, bz);
      group.rotation.y = axis === 'x' ? Math.PI / 2 : 0;
      group.traverse(o => { if (o.isMesh) o.castShadow = true; });
      this.scene.add(group);

      const halfW = axis === 'x' ? 0.6 : 1.7;
      const halfD = axis === 'x' ? 1.7 : 0.6;
      const building = {
        minX: bx - halfW, maxX: bx + halfW,
        minZ: bz - halfD, maxZ: bz + halfD,
        height: 1.1, barrier: true
      };
      this.world.addBuilding(building);
      block.barriers.push({ group, building, x: bx, z: bz });
    }
    this.blocks.push(block);
    if (dynamic) this.dynamic.push(block);
    return block;
  }

  smash(block, barrier) {
    this.scene.remove(barrier.group);
    barrier.group.traverse(o => {
      if (o.isMesh && o.geometry !== this.barrierGeo && o.geometry !== this.legGeo) o.geometry.dispose();
    });
    this.world.removeBuilding(barrier.building);
    block.barriers = block.barriers.filter(b => b !== barrier);
  }

  removeBlock(block) {
    for (const b of [...block.barriers]) this.smash(block, b);
    this.world.unblockSegment(block.seg.axis, block.seg.i, block.seg.j);
    this.blocks = this.blocks.filter(b => b !== block);
    this.dynamic = this.dynamic.filter(b => b !== block);
  }

  spawnAhead(player, streetWidthFallback = 16) {
    const w = this.world;
    if (this.dynamic.length >= HAZARD.dynamicBlocks) return null;
    const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
    for (const dist of [130, 100, 165, 80]) {
      const tx = player.pos.x + fx * dist;
      const tz = player.pos.z + fz * dist;
      const p = w.nearestStreetPoint(tx, tz);
      if (w.wetPoint(p.x, p.z) || w.floorAt(p.x, p.z) > 0.05) continue;
      if (this.blocks.some(b => Math.hypot(b.x - p.x, b.z - p.z) < 55)) continue;
      return this.addBlock(p.x, p.z, p.axis, p.width || streetWidthFallback, true);
    }
    return null;
  }

  update(dt, player, api) {
    for (const block of [...this.dynamic]) {
      block.life -= dt;
      const far = Math.hypot(block.x - player.pos.x, block.z - player.pos.z) > 340;
      if (block.life <= 0 || far || !block.barriers.length) this.removeBlock(block);
    }

    let smashed = 0;
    for (const block of [...this.blocks]) {
      if (Math.hypot(block.x - player.pos.x, block.z - player.pos.z) > 40) continue;
      for (const barrier of [...block.barriers]) {
        const d = Math.hypot(barrier.x - player.pos.x, barrier.z - player.pos.z);
        if (d < player.radius + 2.1 && player.pos.y < 2.2 && player.speed > 8) {
          this.smash(block, barrier);
          smashed++;
        }
      }
      if (!block.barriers.length) this.world.unblockSegment(block.seg.axis, block.seg.i, block.seg.j);
    }
    if (smashed) api.onSmash(smashed);

    for (const trap of this.traps) {
      trap.cooldown = Math.max(0, trap.cooldown - dt);
      if (trap.cooldown > 0) continue;
      const d = Math.hypot(trap.x - player.pos.x, trap.z - player.pos.z);
      if (d < HAZARD.trapRadius && player.speed > HAZARD.trapSpeed && player.pos.y < 6) {
        trap.cooldown = 22;
        api.onTrap(trap);
      }
    }
  }
}
