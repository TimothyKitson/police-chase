import * as THREE from '../vendor/three.module.js';
import { BASE_CAR, POLICE_SPEC } from './config.js';
import { Vehicle } from './vehicle.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

class Unit {
  constructor(spec, world) {
    this.vehicle = new Vehicle(spec, { police: true });
    this.world = world;
    this.reverseTimer = 0;
    this.flash = Math.random() * 6;
    this.spawnGrace = 1;
  }

  update(dt, player, aggression) {
    const v = this.vehicle;
    const dx = player.pos.x - v.pos.x;
    const dz = player.pos.z - v.pos.z;
    const dist = Math.hypot(dx, dz);
    const lead = clamp(dist / 60, 0, 1) * 0.8;
    const tx = player.pos.x + player.vel.x * lead;
    const tz = player.pos.z + player.vel.z * lead;
    const want = Math.atan2(tx - v.pos.x, tz - v.pos.z);
    const diff = angleDiff(want, v.yaw);

    this.spawnGrace = Math.max(0, this.spawnGrace - dt);
    if (v.stuckTimer > 1.1) { this.reverseTimer = 0.9; v.stuckTimer = 0; }

    const c = { throttle: 0, brake: 0, steer: 0, handbrake: false, boost: false, climb: 0, sink: 0 };
    if (this.reverseTimer > 0) {
      this.reverseTimer -= dt;
      c.brake = 1;
      c.steer = diff > 0 ? -1 : 1;
    } else {
      c.throttle = 1;
      c.steer = clamp(diff * 2.1, -1, 1);
      if (Math.abs(diff) > 2.2 && v.speed > 18) c.handbrake = true;
      if (dist > 55 && Math.abs(diff) < 0.5) c.boost = true;
      if (player.pos.y > 14) c.throttle = dist > 40 ? 1 : 0;
    }

    v.spec.maxSpeed = POLICE_SPEC.maxSpeed * (1 + aggression * 0.16);
    v.update(dt, c, {});
    this.world.collide(v);

    this.flash += dt * 7;
    if (v.view.lightbar) {
      const on = Math.sin(this.flash) > 0;
      v.view.lightbar.redMat.emissiveIntensity = on ? 3.2 : 0.15;
      v.view.lightbar.blueMat.emissiveIntensity = on ? 0.15 : 3.2;
    }
    return dist;
  }
}

export class PoliceForce {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.units = [];
    this.spawnCooldown = 0;
  }

  get count() { return this.units.length; }

  spawn(player) {
    const spec = { ...BASE_CAR, ...POLICE_SPEC };
    const unit = new Unit(spec, this.world);
    let p = null;
    for (let i = 0; i < 60; i++) {
      const cand = this.world.randomRoadPoint();
      const d = Math.hypot(cand.x - player.pos.x, cand.z - player.pos.z);
      if (d > 68 && d < 210) { p = cand; break; }
    }
    if (!p) p = this.world.randomRoadPoint();
    unit.vehicle.placeAt(p.x, p.z, Math.atan2(player.pos.x - p.x, player.pos.z - p.z));
    this.scene.add(unit.vehicle.group);
    this.units.push(unit);
    return unit;
  }

  clear() {
    for (const u of this.units) {
      this.scene.remove(u.vehicle.group);
      u.vehicle.dispose();
    }
    this.units.length = 0;
  }

  update(dt, player, heat, opts = {}) {
    const result = { nearest: Infinity, contact: false, ramImpact: 0 };
    const target = opts.noPolice ? 0 : clamp(1 + Math.floor(heat), 1, 8);

    this.spawnCooldown -= dt;
    if (this.units.length < target && this.spawnCooldown <= 0) {
      this.spawn(player);
      this.spawnCooldown = 1.6;
    }
    while (this.units.length > target) {
      const u = this.units.pop();
      this.scene.remove(u.vehicle.group);
      u.vehicle.dispose();
    }

    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      const dist = u.update(dt, player, heat);
      result.nearest = Math.min(result.nearest, dist);

      if (dist > 340) {
        this.scene.remove(u.vehicle.group);
        u.vehicle.dispose();
        this.units.splice(i, 1);
        continue;
      }

      const pv = u.vehicle;
      const rSum = pv.radius + player.radius;
      if (dist < rSum && Math.abs(pv.pos.y - player.pos.y) < 2.4) {
        const ux = (player.pos.x - pv.pos.x) / (dist || 1);
        const uz = (player.pos.z - pv.pos.z) / (dist || 1);
        const overlap = rSum - dist;
        player.pos.x += ux * overlap * 0.6;
        player.pos.z += uz * overlap * 0.6;
        pv.pos.x -= ux * overlap * 0.4;
        pv.pos.z -= uz * overlap * 0.4;
        const rvx = pv.vel.x - player.vel.x;
        const rvz = pv.vel.z - player.vel.z;
        const closing = rvx * ux + rvz * uz;
        result.contact = true;
        if (closing > 2 && u.spawnGrace <= 0) {
          result.ramImpact = Math.max(result.ramImpact, closing);
          player.addImpulse(ux * closing * 0.55, uz * closing * 0.55);
          pv.addImpulse(-ux * closing * 0.5, -uz * closing * 0.5);
        }
      }

      for (let j = i - 1; j >= 0; j--) {
        const o = this.units[j].vehicle;
        const d2 = Math.hypot(o.pos.x - pv.pos.x, o.pos.z - pv.pos.z);
        const rs = o.radius + pv.radius;
        if (d2 < rs && d2 > 0.001) {
          const ux = (pv.pos.x - o.pos.x) / d2;
          const uz = (pv.pos.z - o.pos.z) / d2;
          const push = (rs - d2) * 0.5;
          pv.pos.x += ux * push; pv.pos.z += uz * push;
          o.pos.x -= ux * push; o.pos.z -= uz * push;
        }
      }
    }
    return result;
  }
}
