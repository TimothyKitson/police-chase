import * as THREE from '../vendor/three.module.js';
import { bodyMetrics } from './carmesh.js';

const WHEEL_LOCK = 2.6;
const WHEEL_TILT = -0.34;
const SHIFT_TIME = 0.55;

export class Cockpit {
  constructor(spec) {
    this.spec = spec;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.disposables = [];
    this.shiftClock = 0;
    this.gear = 1;
    this.handT = 0;

    const L = spec.length;
    const W = spec.width;
    const met = bodyMetrics(spec);
    const truck = met.truck;
    const top = met.bodyTop;
    const tubY = top + 0.02;
    const dashTopY = top + 0.11;
    const eyeY = top + 0.31;
    const headerY = met.cabinTop + 0.02;
    const seatX = W * 0.23;
    const dashZ = met.cabinFrontZ - 0.06;
    const wheelZ = dashZ - (truck ? 0.34 : 0.42);
    const wheelY = top + 0.06;

    this.eye = new THREE.Vector3(seatX, eyeY, wheelZ - (truck ? 0.68 : 0.62));
    this.aim = new THREE.Vector3(seatX, eyeY - 0.055, this.eye.z + 30);

    const mk = (mat) => { this.disposables.push(mat); return mat; };
    const geo = (g) => { this.disposables.push(g); return g; };

    const trimMat = mk(new THREE.MeshStandardMaterial({ color: 0x1e232a, roughness: 0.82, metalness: 0.12 }));
    const dashMat = mk(new THREE.MeshStandardMaterial({ color: 0x252b33, roughness: 0.9 }));
    const softMat = mk(new THREE.MeshStandardMaterial({ color: 0x2b313a, roughness: 0.95 }));
    const carpetMat = mk(new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 1 }));
    const wheelMat = mk(new THREE.MeshStandardMaterial({ color: 0x24282f, roughness: 0.5, metalness: 0.35 }));
    const chrome = mk(new THREE.MeshStandardMaterial({ color: 0x9aa4b0, metalness: 0.85, roughness: 0.3 }));
    const skinMat = mk(new THREE.MeshStandardMaterial({ color: 0xd39a72, roughness: 0.7 }));
    const sleeveMat = mk(new THREE.MeshStandardMaterial({ color: 0x2a3a52, roughness: 0.9 }));
    const dialMat = mk(new THREE.MeshStandardMaterial({
      color: 0x0a1a24, emissive: 0x1d6f8f, emissiveIntensity: 1.3, roughness: 0.5
    }));

    const cabinLen = Math.abs(met.cabinFrontZ - met.cabinRearZ);
    const tubZ = (met.cabinFrontZ + met.cabinRearZ) / 2;

    const tub = new THREE.Mesh(geo(new THREE.BoxGeometry(W * 1.2, 0.16, cabinLen * 1.9)), carpetMat);
    tub.position.set(0, tubY - 0.06, tubZ - cabinLen * 0.2);
    this.group.add(tub);

    for (const sx of [-1, 1]) {
      const sill = new THREE.Mesh(geo(new THREE.BoxGeometry(0.13, 0.4, cabinLen * 1.7)), softMat);
      sill.position.set(sx * W * 0.56, tubY + 0.18, tubZ - cabinLen * 0.16);
      this.group.add(sill);
    }

    const bulkhead = new THREE.Mesh(geo(new THREE.BoxGeometry(W * 0.92, 0.42, 0.07)), softMat);
    bulkhead.position.set(0, tubY + 0.2, this.eye.z - 0.44);
    this.group.add(bulkhead);

    const dash = new THREE.Mesh(geo(new THREE.BoxGeometry(W * 0.94, dashTopY - tubY, 0.4)), dashMat);
    dash.position.set(0, (tubY + dashTopY) / 2, dashZ);
    this.group.add(dash);

    const cowl = new THREE.Mesh(geo(new THREE.BoxGeometry(W * 0.94, 0.05, 0.46)), trimMat);
    cowl.position.set(0, dashTopY + 0.01, dashZ - 0.04);
    cowl.rotation.x = 0.14;
    this.group.add(cowl);

    const binnacle = new THREE.Mesh(geo(new THREE.BoxGeometry(0.5, 0.16, 0.28)), trimMat);
    binnacle.position.set(seatX, dashTopY - 0.03, dashZ - 0.2);
    this.group.add(binnacle);
    for (const dx of [-0.12, 0.12]) {
      const dial = new THREE.Mesh(geo(new THREE.CircleGeometry(0.08, 20)), dialMat);
      dial.position.set(seatX + dx, dashTopY - 0.02, dashZ - 0.34);
      dial.rotation.x = -0.22;
      this.group.add(dial);
    }

    const centre = new THREE.Mesh(geo(new THREE.BoxGeometry(0.3, 0.2, 0.05)), dialMat);
    centre.position.set(-W * 0.08, dashTopY - 0.1, dashZ - 0.2);
    centre.rotation.x = -0.2;
    this.group.add(centre);

    for (const sx of [-1, 1]) {
      const pillar = new THREE.Mesh(geo(new THREE.BoxGeometry(0.11, headerY - dashTopY + 0.2, 0.13)), trimMat);
      pillar.position.set(sx * W * 0.41, (dashTopY + headerY) / 2, dashZ - 0.24);
      pillar.rotation.x = -0.3;
      pillar.rotation.z = sx * 0.06;
      this.group.add(pillar);
    }

    const header = new THREE.Mesh(geo(new THREE.BoxGeometry(W * 0.86, 0.09, 0.22)), trimMat);
    header.position.set(0, headerY, dashZ - 0.46);
    this.group.add(header);

    const headliner = new THREE.Mesh(geo(new THREE.BoxGeometry(W * 0.84, 0.05, cabinLen * 0.9)), softMat);
    headliner.position.set(0, headerY + 0.02, tubZ - cabinLen * 0.25);
    this.group.add(headliner);

    const mirror = new THREE.Mesh(geo(new THREE.BoxGeometry(0.36, 0.09, 0.05)), trimMat);
    mirror.position.set(0, headerY - 0.1, dashZ - 0.5);
    this.group.add(mirror);
    const mirrorGlass = new THREE.Mesh(geo(new THREE.PlaneGeometry(0.32, 0.065)), mk(new THREE.MeshStandardMaterial({
      color: 0x2b4356, metalness: 0.9, roughness: 0.15
    })));
    mirrorGlass.position.set(0, headerY - 0.1, dashZ - 0.526);
    this.group.add(mirrorGlass);

    const column = new THREE.Mesh(geo(new THREE.BoxGeometry(0.09, 0.09, 0.3)), trimMat);
    column.position.set(seatX, wheelY - 0.04, wheelZ + 0.18);
    column.rotation.x = WHEEL_TILT;
    this.group.add(column);

    this.wheelPivot = new THREE.Group();
    this.wheelPivot.position.set(seatX, wheelY, wheelZ);
    this.wheelPivot.rotation.x = WHEEL_TILT;
    this.group.add(this.wheelPivot);

    this.wheelRadius = truck ? 0.21 : 0.185;
    this.wheel = new THREE.Group();
    this.wheelPivot.add(this.wheel);

    const rim = new THREE.Mesh(geo(new THREE.TorusGeometry(this.wheelRadius, 0.023, 10, 28)), wheelMat);
    this.wheel.add(rim);
    const hub = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 14)), trimMat);
    hub.rotation.x = Math.PI / 2;
    this.wheel.add(hub);
    const badge = new THREE.Mesh(geo(new THREE.CircleGeometry(0.028, 12)), chrome);
    badge.position.z = -0.03;
    badge.rotation.y = Math.PI;
    this.wheel.add(badge);
    for (const a of [Math.PI * 0.5, Math.PI * 1.17, Math.PI * 1.83]) {
      const spoke = new THREE.Mesh(geo(new THREE.BoxGeometry(0.035, this.wheelRadius, 0.02)), wheelMat);
      spoke.position.set(Math.cos(a - Math.PI / 2) * this.wheelRadius * 0.5, Math.sin(a - Math.PI / 2) * this.wheelRadius * 0.5, 0);
      spoke.rotation.z = a;
      this.wheel.add(spoke);
    }

    const makeHand = () => {
      const hand = new THREE.Group();
      hand.scale.setScalar(0.78);
      const fist = new THREE.Mesh(geo(new THREE.BoxGeometry(0.085, 0.075, 0.11)), skinMat);
      hand.add(fist);
      const thumb = new THREE.Mesh(geo(new THREE.BoxGeometry(0.03, 0.055, 0.035)), skinMat);
      thumb.position.set(0, 0.05, 0.035);
      hand.add(thumb);
      const wrist = new THREE.Mesh(geo(new THREE.BoxGeometry(0.068, 0.068, 0.08)), skinMat);
      wrist.position.z = 0.095;
      hand.add(wrist);
      const sleeve = new THREE.Mesh(geo(new THREE.BoxGeometry(0.09, 0.09, 0.17)), sleeveMat);
      sleeve.position.set(0, -0.03, 0.2);
      sleeve.rotation.x = 0.3;
      hand.add(sleeve);
      return hand;
    };

    this.leftHand = makeHand();
    this.leftHand.position.set(this.wheelRadius, 0.012, 0);
    this.leftHand.rotation.z = -0.35;
    this.wheel.add(this.leftHand);

    this.rightHand = makeHand();
    this.group.add(this.rightHand);

    this.lever = new THREE.Group();
    this.lever.position.set(seatX - (truck ? 0.5 : 0.44), tubY + 0.02, wheelZ - 0.52);
    this.group.add(this.lever);
    const stick = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.016, 0.022, 0.26, 10)), chrome);
    stick.position.y = 0.13;
    this.lever.add(stick);
    const knob = new THREE.Mesh(geo(new THREE.SphereGeometry(0.045, 14, 10)), wheelMat);
    knob.position.y = 0.28;
    this.lever.add(knob);
    const boot = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.07, 0.1, 0.09, 12)), softMat);
    boot.position.y = 0.03;
    this.lever.add(boot);
    const console_ = new THREE.Mesh(geo(new THREE.BoxGeometry(0.26, 0.16, 0.46)), trimMat);
    console_.position.set(this.lever.position.x, tubY + 0.07, this.lever.position.z - 0.06);
    this.group.add(console_);

    this.leverKnobWorld = new THREE.Vector3(
      this.lever.position.x, this.lever.position.y + 0.3, this.lever.position.z
    );
    this.gripLocal = new THREE.Vector3();
    this.tmp = new THREE.Vector3();

    const lamp = new THREE.PointLight(0xffd2a0, 1.15, 3.6, 2);
    lamp.position.set(0, headerY - 0.06, tubZ);
    this.group.add(lamp);
    const glowLamp = new THREE.PointLight(0x7fd4ff, 0.55, 1.5, 2);
    glowLamp.position.set(seatX, dashTopY + 0.04, dashZ - 0.3);
    this.group.add(glowLamp);

    this.group.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  }

  wheelGrip(out) {
    const angle = this.wheel.rotation.z + Math.PI;
    const x = Math.cos(angle) * this.wheelRadius;
    const y = Math.sin(angle) * this.wheelRadius;
    out.set(x, y + 0.012, 0);
    this.wheelPivot.updateMatrix();
    return out.applyMatrix4(this.wheelPivot.matrix);
  }

  update(dt, state) {
    if (!this.group.visible) return;

    this.wheel.rotation.z = -state.steer * WHEEL_LOCK;

    if (state.gear !== this.gear) {
      this.gear = state.gear;
      if (state.moving) this.shiftClock = SHIFT_TIME;
    }
    if (this.shiftClock > 0) this.shiftClock = Math.max(0, this.shiftClock - dt);

    const phase = this.shiftClock / SHIFT_TIME;
    const target = phase > 0 ? Math.sin(Math.min(1, phase * 1.6) * Math.PI) : 0;
    this.handT += (target - this.handT) * Math.min(1, dt * 14);

    const grip = this.wheelGrip(this.gripLocal);
    const t = this.handT;
    const knob = this.leverKnobWorld;
    this.rightHand.position.set(
      grip.x + (knob.x - grip.x) * t,
      grip.y + (knob.y - grip.y) * t + Math.sin(t * Math.PI) * 0.04,
      grip.z + (knob.z - grip.z) * t
    );
    this.rightHand.rotation.set(
      -t * 0.75,
      0,
      (1 - t) * (-this.wheel.rotation.z + 0.35) + t * 0.15
    );
    this.lever.rotation.x = t * (state.gear > this.lastGearDir ? 0.22 : -0.22);
    this.lastGearDir = state.gear;
  }

  setVisible(v) {
    this.group.visible = v;
    if (v) {
      this.handT = 0;
      this.shiftClock = 0;
    }
  }

  dispose() {
    for (const d of this.disposables) d.dispose();
    this.group.clear();
  }
}
