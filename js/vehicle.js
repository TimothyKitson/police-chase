import * as THREE from '../vendor/three.module.js';
import { buildCar } from './carmesh.js';

const tmpF = new THREE.Vector3();
const tmpR = new THREE.Vector3();
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const damp = (rate, dt) => 1 - Math.exp(-rate * dt);

export class Vehicle {
  constructor(spec, opts = {}) {
    this.spec = spec;
    this.police = !!opts.police;
    this.view = buildCar(spec, opts);
    this.group = this.view.group;
    this.radius = this.view.radius;

    this.pos = new THREE.Vector3(0, 0, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.vy = 0;
    this.onGround = true;
    this.flying = false;
    this.fwdSpeed = 0;
    this.latSpeed = 0;
    this.damage = 0;
    this.boostFuel = 1;
    this.boosting = false;
    this.drifting = false;
    this.airTime = 0;
    this.lastImpact = 0;
    this.roll = 0;
    this.pitch = 0;
    this.wheelSpin = 0;
    this.steerVisual = 0;
    this.lastFloor = 0;
    this.lastAirTime = 0;
    this.distance = 0;
    this.stuckTimer = 0;
  }

  get speed() { return Math.hypot(this.vel.x, this.vel.z); }
  get speedKmh() { return this.speed * 3.6; }
  get maxSpeed() { return this.spec.maxSpeed; }

  forward(out = tmpF) { return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  right(out = tmpR) { return out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); }

  placeAt(x, z, yaw = 0, y = 0) {
    this.pos.set(x, y, z);
    this.lastFloor = y;
    this.lastAirTime = 0;
    this.yaw = yaw;
    this.vel.set(0, 0, 0);
    this.vy = 0;
    this.fwdSpeed = 0;
    this.latSpeed = 0;
    this.flying = false;
    this.roll = 0;
    this.pitch = 0;
    this.sync();
  }

  setFlying(on) {
    this.flying = on;
    if (on) {
      this.vy = Math.max(this.vy, 4);
      this.pos.y = Math.max(this.pos.y, 0.6);
    }
  }

  update(dt, c, opts = {}) {
    const s = this.spec;
    const massFactor = 1 / Math.max(0.2, s.mass);
    const wantBoost = !!c.boost && this.boostFuel > 0.02;

    if (wantBoost) this.boostFuel = clamp(this.boostFuel - dt * 0.32, 0, 1);
    else this.boostFuel = clamp(this.boostFuel + dt * 0.19, 0, 1);
    this.boosting = wantBoost && (!!c.throttle || this.flying);

    const boostMul = this.boosting ? s.boost : 1;

    this.forward(tmpF);
    this.right(tmpR);
    let fs = this.vel.dot(tmpF);
    let ls = this.vel.dot(tmpR);

    let yawDelta = 0;

    if (this.flying) {
      const maxS = s.flySpeed * boostMul;
      if (c.throttle) fs += s.accel * 1.15 * massFactor * dt;
      if (c.brake) fs -= s.brake * 0.9 * dt;
      fs -= fs * 0.7 * dt;
      fs = clamp(fs, -maxS * 0.5, maxS);
      ls -= ls * damp(9, dt);

      yawDelta = c.steer * s.steerRate * 0.9 * dt;

      const targetVy = ((c.climb ? 1 : 0) - (c.sink ? 1 : 0)) * s.flyLift;
      this.vy += (targetVy - this.vy) * damp(5.5, dt);
      this.drifting = false;
      this.stuckTimer = 0;
    } else {
      const maxS = s.maxSpeed * boostMul;
      if (c.throttle) {
        fs += s.accel * massFactor * dt * (fs < 0 ? 1.8 : 1);
      }
      if (c.brake) {
        if (fs > 0.4) fs -= s.brake * dt;
        else fs -= s.reverseAccel * massFactor * dt;
      }
      if (!c.throttle && !c.brake) fs -= fs * 0.55 * dt;
      fs -= fs * s.drag * dt;
      fs = clamp(fs, -maxS * 0.42, maxS);

      const gripNow = c.handbrake ? s.driftGrip : s.grip;
      ls -= ls * damp(this.onGround ? gripNow : 0.6, dt);
      if (c.handbrake && this.onGround) fs -= fs * 0.3 * dt;

      const absF = Math.abs(fs);
      const speedFactor = clamp(absF / 9, 0, 1) * (1 - 0.32 * clamp(absF / Math.max(8, maxS), 0, 1));
      const steerBoost = c.handbrake ? 1.35 : 1;
      const dir = fs < -0.3 ? -1 : 1;
      yawDelta = this.onGround
        ? c.steer * s.steerRate * steerBoost * speedFactor * dir * dt
        : c.steer * s.steerRate * 0.35 * dt;

      this.vy -= s.gravity * dt;
      this.drifting = this.onGround && Math.abs(ls) > 4.5 && absF > 6;
      if (absF < 1.6 && (c.throttle || c.brake)) this.stuckTimer += dt;
      else this.stuckTimer = 0;
    }

    this.fwdSpeed = fs;
    this.latSpeed = ls;
    this.vel.copy(tmpF).multiplyScalar(fs).addScaledVector(tmpR, ls);
    this.yaw += yawDelta;

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.pos.y += this.vy * dt;
    this.distance += Math.hypot(this.vel.x, this.vel.z) * dt;

    const floor = opts.floor ?? 0;
    if (this.flying) {
      if (this.pos.y < floor + 0.5) { this.pos.y = floor + 0.5; if (this.vy < 0) this.vy = 0; }
      if (this.pos.y > 420) { this.pos.y = 420; this.vy = Math.min(this.vy, 0); }
      this.onGround = false;
      this.airTime = 0;
    } else if (this.pos.y <= floor + 0.001) {
      const climb = dt > 0 ? (floor - this.lastFloor) / dt : 0;
      this.pos.y = floor;
      if (this.vy < -9 && this.airTime > 0.25) this.lastImpact = Math.min(1, -this.vy / 40);
      if (this.airTime > 0.2) this.lastAirTime = this.airTime;
      this.vy = climb > 1 && climb < 40 ? Math.min(climb * 1.25, 28) : 0;
      this.onGround = true;
      this.airTime = 0;
    } else {
      this.onGround = false;
      this.airTime += dt;
    }
    this.lastFloor = floor;

    const rollTarget = this.flying
      ? clamp(-c.steer * 0.55, -0.6, 0.6)
      : clamp(-this.latSpeed * 0.02 - c.steer * Math.min(0.16, Math.abs(fs) / 260), -0.32, 0.32);
    const pitchTarget = this.flying
      ? clamp(-this.vy * 0.012 - (c.throttle ? 0.06 : 0), -0.35, 0.35)
      : clamp((c.brake ? 0.045 : 0) - (c.throttle ? 0.03 : 0) - clamp(this.vy * 0.012, -0.22, 0.22), -0.3, 0.3);
    this.roll += (rollTarget - this.roll) * damp(7, dt);
    this.pitch += (pitchTarget - this.pitch) * damp(6, dt);

    this.wheelSpin += (fs / Math.max(0.2, this.spec.wheelSize)) * dt;
    this.steerVisual += (c.steer * 0.42 - this.steerVisual) * damp(12, dt);

    this.sync();
  }

  sync() {
    this.group.position.copy(this.pos);
    this.group.rotation.set(this.pitch, this.yaw, this.roll, 'YXZ');
    for (const w of this.view.wheels) {
      w.spin.rotation.x = this.wheelSpin;
      w.holder.rotation.y = w.front ? this.steerVisual : 0;
    }
    if (this.view.glowMesh) {
      const g = this.view.glowMesh;
      g.material.opacity = 0.32 + 0.3 * Math.abs(Math.sin(performance.now() * 0.002)) + (this.boosting ? 0.25 : 0);
    }
  }

  addImpulse(x, z, ySpeed = 0) {
    this.vel.x += x;
    this.vel.z += z;
    if (ySpeed) this.vy += ySpeed;
  }

  takeDamage(amount) {
    if (this.spec.invincible) return 0;
    this.damage = clamp(this.damage + amount, 0, 100);
    return amount;
  }

  dispose() { this.view.dispose(); }
}
