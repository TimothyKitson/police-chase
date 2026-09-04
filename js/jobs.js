import * as THREE from '../vendor/three.module.js';
import { JOBS } from './config.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

export class Jobs {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.banks = [];
    this.safehouses = [];
    this.state = 'idle';
    this.target = null;
    this.crew = 0;
    this.streak = 0;
    this.delivered = 0;
    this.failed = 0;
    this.elapsed = 0;
    this.pulse = 0;
    this.pickSites();
    this.buildProps();
    this.buildBeam();
  }

  pickSites() {
    const w = this.world;
    const rnd = w.rng;
    const far = (list, p, min) => list.every(q => Math.hypot(q.x - p.x, q.z - p.z) > min);
    for (let guard = 0; guard < 900 && this.banks.length < JOBS.banks; guard++) {
      const p = w.dryRoadPoint(null, 0, rnd);
      if (w.floorAt(p.x, p.z) > 0.05) continue;
      if (!far(this.banks, p, JOBS.minSeparation)) continue;
      this.banks.push({ x: p.x, z: p.z, kind: 'bank' });
    }
    for (let guard = 0; guard < 900 && this.safehouses.length < JOBS.safehouses; guard++) {
      const p = w.dryRoadPoint(null, 0, rnd);
      if (w.floorAt(p.x, p.z) > 0.05) continue;
      if (!far(this.safehouses, p, JOBS.minSeparation)) continue;
      if (!far(this.banks, p, 90)) continue;
      this.safehouses.push({ x: p.x, z: p.z, kind: 'safehouse' });
    }
  }

  buildProps() {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const pos = new THREE.Vector3();
    const all = [...this.banks, ...this.safehouses];

    const post = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.34, 5, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x2b323d, roughness: 0.7, metalness: 0.4 }),
      all.length
    );
    const signGeo = new THREE.BoxGeometry(2.5, 1.1, 0.22);
    const bankSign = new THREE.InstancedMesh(
      signGeo,
      new THREE.MeshStandardMaterial({ color: 0xffcc3d, emissive: 0xffa300, emissiveIntensity: 1.9, roughness: 0.5 }),
      this.banks.length
    );
    const safeSign = new THREE.InstancedMesh(
      signGeo,
      new THREE.MeshStandardMaterial({ color: 0x3ddc84, emissive: 0x18a758, emissiveIntensity: 1.9, roughness: 0.5 }),
      this.safehouses.length
    );

    all.forEach((site, i) => {
      pos.set(site.x, 2.5, site.z);
      m.compose(pos, q, one);
      post.setMatrixAt(i, m);
    });
    this.banks.forEach((site, i) => {
      pos.set(site.x, 5.4, site.z);
      m.compose(pos, q, one);
      bankSign.setMatrixAt(i, m);
    });
    this.safehouses.forEach((site, i) => {
      pos.set(site.x, 5.4, site.z);
      m.compose(pos, q, one);
      safeSign.setMatrixAt(i, m);
    });

    for (const mesh of [post, bankSign, safeSign]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      this.scene.add(mesh);
    }
  }

  buildBeam() {
    const geo = new THREE.CylinderGeometry(3.1, 3.1, 46, 18, 1, true);
    this.beamMat = new THREE.MeshBasicMaterial({
      color: 0xffcc3d, transparent: true, opacity: 0.22,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.beam = new THREE.Mesh(geo, this.beamMat);
    this.beam.position.y = 23;
    this.beam.visible = false;
    this.scene.add(this.beam);

    const ringGeo = new THREE.RingGeometry(3.2, 4.4, 32);
    ringGeo.rotateX(-Math.PI / 2);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0xffcc3d, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false
    });
    this.ring = new THREE.Mesh(ringGeo, this.ringMat);
    this.ring.visible = false;
    this.scene.add(this.ring);
  }

  reset() {
    this.state = 'idle';
    this.target = null;
    this.crew = 0;
    this.streak = 0;
    this.elapsed = 0;
    this.beam.visible = false;
    this.ring.visible = false;
  }

  nearestFrom(list, pos, minDist) {
    let best = null;
    let bestScore = Infinity;
    for (const site of list) {
      const d = Math.hypot(site.x - pos.x, site.z - pos.z);
      if (d < minDist) continue;
      if (d < bestScore) { bestScore = d; best = site; }
    }
    return best || list[Math.floor(Math.random() * list.length)];
  }

  offer(playerPos) {
    this.target = this.nearestFrom(this.banks, playerPos, 110);
    this.state = 'toPickup';
    this.crew = 0;
    this.elapsed = 0;
    this.showMarker(0xffcc3d);
    return this.target;
  }

  showMarker(color) {
    if (!this.target) {
      this.beam.visible = false;
      this.ring.visible = false;
      return;
    }
    this.beamMat.color.setHex(color);
    this.ringMat.color.setHex(color);
    this.beam.position.set(this.target.x, 23, this.target.z);
    this.ring.position.set(this.target.x, 0.12, this.target.z);
    this.beam.visible = true;
    this.ring.visible = true;
  }

  distanceTo(pos) {
    if (!this.target) return 0;
    return Math.hypot(this.target.x - pos.x, this.target.z - pos.z);
  }

  fail() {
    if (this.state === 'idle') return false;
    const lost = this.crew > 0;
    this.crew = 0;
    this.streak = 0;
    this.failed += lost ? 1 : 0;
    this.state = 'idle';
    this.target = null;
    this.beam.visible = false;
    this.ring.visible = false;
    return lost;
  }

  payout(spec, heat, damage) {
    const crew = this.crew || 1;
    const stars = Math.max(1, Math.floor(heat));
    const time = clamp(1 - this.elapsed / JOBS.parTime, 0, 1);
    const streakMul = 1 + JOBS.streakStep * Math.min(this.streak, JOBS.streakCap);
    const base = (JOBS.basePay + JOBS.perStar * stars) * (0.5 + crew * 0.25);
    const bonus = JOBS.timeBonus * time;
    const condition = 1 - clamp(damage / 100, 0, 1) * 0.35;
    return {
      total: Math.round((base + bonus) * streakMul * condition),
      crew, stars, streakMul: +streakMul.toFixed(2),
      timePct: Math.round(time * 100)
    };
  }

  update(dt, player, api) {
    this.pulse += dt;
    if (this.state !== 'idle') this.elapsed += dt;

    const bob = 1 + Math.sin(this.pulse * 2.6) * 0.06;
    this.ring.scale.set(bob, 1, bob);
    this.beamMat.opacity = 0.16 + Math.abs(Math.sin(this.pulse * 1.7)) * 0.14;

    if (this.state === 'idle') {
      if (api.autoOffer) {
        const site = this.offer(player.pos);
        api.onOffer(site);
      }
      return;
    }

    const d = this.distanceTo(player.pos);
    const slow = player.speed < JOBS.loadSpeed;
    const grounded = player.pos.y < 4 && !player.flying;

    if (this.state === 'toPickup') {
      if (d < JOBS.pickupRadius && slow && grounded) {
        this.crew = player.spec.crew || 2;
        this.state = 'toDrop';
        this.target = this.nearestFrom(this.safehouses, player.pos, 140);
        this.showMarker(0x3ddc84);
        api.onPickup(this.crew);
      }
    } else if (this.state === 'toDrop') {
      if (d < JOBS.dropRadius && slow && grounded) {
        const pay = this.payout(player.spec, api.heat, player.damage);
        this.streak++;
        this.delivered++;
        this.crew = 0;
        this.state = 'idle';
        this.target = null;
        this.beam.visible = false;
        this.ring.visible = false;
        api.onDeliver(pay);
      }
    }
  }

  get label() {
    if (this.state === 'toPickup') return 'PICK UP THE CREW';
    if (this.state === 'toDrop') return 'GET TO THE SAFEHOUSE';
    return 'WAITING ON A JOB';
  }
}
