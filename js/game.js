import * as THREE from '../vendor/three.module.js';
import { CHEAT_COINS, resolveSpec } from './config.js';
import { store } from './state.js';
import { input } from './input.js';
import { World } from './world.js';
import { Vehicle } from './vehicle.js';
import { PoliceForce } from './police.js';
import { Hud } from './hud.js';
import { Minimap } from './minimap.js';
import { UI } from './ui.js';
import { sfx } from './audio.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const CAM_MODES = ['chase', 'far', 'hood'];

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.5, 1400);
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.camMode = 0;
    this.shake = 0;

    this.scene.add(new THREE.HemisphereLight(0xa8c8ff, 0x252a33, 0.9));
    const sun = new THREE.DirectionalLight(0xffd9b0, 2.15);
    sun.position.set(60, 90, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const d = 130;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 400;
    sun.shadow.bias = -0.0012;
    this.sun = sun;
    this.sunTarget = new THREE.Object3D();
    this.scene.add(sun, this.sunTarget);
    sun.target = this.sunTarget;

    this.world = new World(this.scene);
    this.police = new PoliceForce(this.scene, this.world);
    this.hud = new Hud();
    this.minimap = new Minimap(document.getElementById('minimap'), this.world);

    this.player = null;
    this.mode = 'menu';
    this.heat = 0;
    this.bust = 0;
    this.runCoins = 0;
    this.maxStars = 0;
    this.escapeTimer = 0;
    this.bountyTimer = 0;
    this.driftTime = 0;
    this.driftCash = 0;
    this.impactCd = 0;
    this.ramCd = 0;
    this.noHitTimer = 0;
    this.driftGrace = 0;
    this.orbit = 0;
    this.lastTime = performance.now();
    this.pixelRatio = Math.min(devicePixelRatio, 1.75);
    this.frameAvg = 1 / 60;
    this.perfTimer = 0;

    this.ui = new UI({
      play: () => this.startRun(),
      resume: () => this.resume(),
      quitToMenu: () => this.toMenu(),
      respawn: () => this.respawn(),
      cheat: () => this.cheatCoins(),
      notify: (t, k) => this.hud.toast(t, k || '')
    });

    this.setPlayerCar();
    this.parkForMenu();
    this.bindKeys();
    window.addEventListener('resize', () => this.resize());
    this.resize();
    sfx.setMuted(store.muted);
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  bindKeys() {
    input.onPress('KeyE', () => this.toggleFly());
    input.onPress('KeyR', () => this.cheatCoins());
    input.onPress('KeyF', () => this.unstick());
    input.onPress('KeyC', () => {
      this.camMode = (this.camMode + 1) % CAM_MODES.length;
      this.hud.toast('camera · ' + CAM_MODES[this.camMode]);
    });
    input.onPress('KeyM', () => {
      store.muted = !store.muted;
      sfx.setMuted(store.muted);
      this.hud.toast(store.muted ? 'sound off' : 'sound on');
    });
    input.onPress('Escape', () => {
      if (this.mode === 'playing') this.pause();
      else if (this.mode === 'paused') this.resume();
    });
    input.onPress('Enter', () => {
      if (this.mode === 'down') this.respawn();
      else if (this.mode === 'menu' && this.ui.current === 'menu') this.startRun();
    });
    const wake = () => { sfx.init(); };
    window.addEventListener('pointerdown', wake, { once: false });
    window.addEventListener('keydown', wake, { once: false });
  }

  setPlayerCar() {
    const spec = resolveSpec(store.selectedCar, store.admin);
    if (this.player) {
      this.scene.remove(this.player.group);
      this.player.dispose();
    }
    this.player = new Vehicle(spec, {});
    this.scene.add(this.player.group);
    return this.player;
  }

  parkForMenu() {
    const p = this.world.randomRoadPoint();
    this.player.placeAt(p.x, p.z, p.yaw);
    this.orbit = Math.random() * Math.PI * 2;
    this.camera.position.set(p.x + 12, 6, p.z + 12);
  }

  snapCamera() {
    const f = this.player.forward(new THREE.Vector3());
    this.camera.position.set(
      this.player.pos.x - f.x * (9 + this.player.spec.length * 0.5),
      this.player.pos.y + 3.6,
      this.player.pos.z - f.z * (9 + this.player.spec.length * 0.5)
    );
    this.camera.lookAt(this.player.pos.x + f.x * 9, this.player.pos.y + 1.5, this.player.pos.z + f.z * 9);
    this.shake = 0;
  }

  cheatCoins() {
    store.cheatCoins();
    this.hud.toast('+' + CHEAT_COINS.toLocaleString() + ' coins · MOD', 'mod');
    sfx.cash();
  }

  toggleFly() {
    if (this.mode !== 'playing') {
      this.hud.toast('fly mode needs a run', 'bad');
      return;
    }
    const on = !this.player.flying;
    this.player.setFlying(on);
    this.hud.toast(on ? 'fly mode on · MOD' : 'fly mode off', 'mod');
    sfx.whoosh();
  }

  unstick() {
    if (this.mode !== 'playing') return;
    const p = this.world.randomRoadPoint(this.player.pos, 0);
    const near = this.nearestRoad(this.player.pos.x, this.player.pos.z);
    this.player.placeAt(near.x ?? p.x, near.z ?? p.z, this.player.yaw);
    this.snapCamera();
    this.hud.toast('car reset');
  }

  nearestRoad(x, z) {
    const { B, half } = this.world;
    const ix = Math.round((x + half) / B) * B - half;
    const iz = Math.round((z + half) / B) * B - half;
    return Math.abs(x - ix) < Math.abs(z - iz) ? { x: ix, z } : { x, z: iz };
  }

  startRun() {
    sfx.init();
    this.setPlayerCar();
    this.police.clear();
    const p = this.world.randomRoadPoint();
    this.player.placeAt(p.x, p.z, p.yaw);
    this.player.damage = 0;
    this.player.distance = 0;
    this.player.boostFuel = 1;
    this.heat = this.player.spec.noPolice ? 0 : 1;
    this.bust = 0;
    this.runCoins = 0;
    this.maxStars = 0;
    this.escapeTimer = 0;
    this.bountyTimer = 0;
    this.driftTime = 0;
    this.driftCash = 0;
    this.impactCd = 0;
    this.ramCd = 0;
    this.noHitTimer = 0;
    this.mode = 'playing';
    sfx.engineOn = true;
    this.snapCamera();
    this.ui.hideAll();
    this.hud.show();
    this.hud.clearCombo();
    this.hud.toast('go · ' + this.player.spec.name.toLowerCase(), 'mod');
  }

  pause() {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    sfx.engineOn = false;
    input.releaseAll();
    this.ui.show('pause');
  }

  resume() {
    if (this.mode !== 'paused') return;
    this.mode = 'playing';
    sfx.engineOn = true;
    this.ui.hideAll();
    this.hud.show();
  }

  toMenu() {
    this.mode = 'menu';
    sfx.engineOn = false;
    this.police.clear();
    this.hud.hide();
    this.hud.clearCombo();
    this.setPlayerCar();
    this.parkForMenu();
    this.ui.show('menu');
  }

  goDown(kind) {
    this.mode = 'down';
    sfx.engineOn = false;
    input.releaseAll();
    store.recordRun({ distance: this.player.distance, coins: this.runCoins, heat: this.maxStars });
    this.hud.clearCombo();
    this.ui.showDown({
      title: kind === 'busted' ? 'BUSTED' : 'WRECKED',
      sub: kind === 'busted'
        ? 'They boxed you in. No paperwork today — the mod pays your bail.'
        : 'Chassis folded. Free rebuild, courtesy of the mod.',
      runCoins: this.runCoins,
      distance: this.player.distance,
      stars: this.maxStars
    });
  }

  respawn() {
    this.police.clear();
    const p = this.world.randomRoadPoint();
    this.player.placeAt(p.x, p.z, p.yaw);
    this.player.damage = 0;
    this.player.boostFuel = 1;
    this.bust = 0;
    this.heat = this.player.spec.noPolice ? 0 : Math.max(1, this.heat - 2);
    this.escapeTimer = 0;
    this.impactCd = 0;
    this.ramCd = 0;
    this.noHitTimer = 0;
    this.mode = 'playing';
    sfx.engineOn = true;
    this.snapCamera();
    this.ui.hideAll();
    this.hud.show();
    this.hud.toast('respawned free · no ad', 'mod');
  }

  controls() {
    return {
      throttle: input.throttle,
      brake: input.brake,
      steer: input.steer,
      handbrake: input.handbrake && !this.player.flying,
      boost: input.boost,
      climb: this.player.flying ? input.state.handbrake && !input.state.boost : 0,
      sink: this.player.flying ? (input.state.descend || (input.state.handbrake && input.state.boost)) : 0
    };
  }

  step(dt) {
    const player = this.player;
    const spec = player.spec;

    player.update(dt, this.controls(), {});
    this.impactCd = Math.max(0, this.impactCd - dt);
    this.ramCd = Math.max(0, this.ramCd - dt);
    this.noHitTimer += dt;

    const hit = this.world.collide(player);
    if (hit.impact > 6 && this.impactCd <= 0) {
      const strength = clamp(hit.impact / 40, 0, 1);
      player.takeDamage(Math.min(34, hit.impact * 0.55));
      this.shake = Math.max(this.shake, strength * 0.7);
      sfx.crash(strength);
      if (!spec.noPolice) this.heat = Math.min(5.99, this.heat + strength * 0.28);
      this.impactCd = 0.4;
      this.noHitTimer = 0;
    }
    if (player.lastImpact > 0) {
      if (this.impactCd <= 0) {
        player.takeDamage(player.lastImpact * 16);
        this.shake = Math.max(this.shake, player.lastImpact * 0.6);
        sfx.crash(player.lastImpact);
        this.impactCd = 0.4;
        this.noHitTimer = 0;
      }
      player.lastImpact = 0;
    }

    const pol = this.police.update(dt, player, this.heat, { noPolice: spec.noPolice });
    if (pol.ramImpact > 3 && this.ramCd <= 0) {
      player.takeDamage(Math.min(22, pol.ramImpact * 0.9));
      this.shake = Math.max(this.shake, clamp(pol.ramImpact / 30, 0, 0.6));
      sfx.crash(clamp(pol.ramImpact / 25, 0.2, 1));
      this.heat = Math.min(5.99, this.heat + 0.14);
      this.ramCd = 0.5;
      this.noHitTimer = 0;
    }
    if (this.noHitTimer > 5 && player.damage > 0) {
      player.damage = Math.max(0, player.damage - dt * 2.5);
    }

    const gained = this.world.collectCoins(player.pos, player.radius);
    if (gained > 0) {
      store.addCoins(gained);
      this.runCoins += gained;
      sfx.coin();
    }
    this.world.update(dt);

    if (!spec.noPolice) {
      const hidden = player.pos.y > 16 || pol.nearest > 165;
      if (hidden) {
        this.escapeTimer += dt;
        if (this.escapeTimer > 6) this.heat = Math.max(0, this.heat - dt * 0.55);
      } else {
        this.escapeTimer = 0;
        if (pol.nearest < 130) this.heat = Math.min(5.99, this.heat + dt * 0.05);
        if (player.speed > spec.maxSpeed * 0.7) this.heat = Math.min(5.99, this.heat + dt * 0.035);
      }
      this.heat = Math.max(this.heat, 0.9);
      this.maxStars = Math.max(this.maxStars, Math.floor(this.heat));

      const boxed = pol.contact && player.speed < 9 && player.onGround;
      this.bust = clamp(this.bust + (boxed ? dt * 34 : -dt * 22), 0, 100);

      this.bountyTimer += dt;
      if (this.bountyTimer >= 10) {
        this.bountyTimer = 0;
        const pay = Math.floor(60 * Math.max(1, Math.floor(this.heat)));
        store.addCoins(pay);
        this.runCoins += pay;
        this.hud.toast('heat bounty +' + pay, 'gold');
        sfx.cash();
      }
    } else {
      this.heat = 0;
      this.bust = 0;
    }

    const sliding = player.drifting && player.speed > 9;
    if (sliding) {
      this.driftGrace = 0.55;
      this.driftTime += dt;
      this.driftCash += dt * 24 * (1 + Math.min(2.5, this.driftTime * 0.28));
      this.hud.setCombo(this.driftTime > 3.5 ? 'BIG DRIFT' : 'DRIFT', this.driftCash);
    } else if (this.driftGrace > 0) {
      this.driftGrace = Math.max(0, this.driftGrace - dt);
    } else if (this.driftTime > 0) {
      if (this.driftCash > 12) {
        const pay = Math.floor(this.driftCash);
        store.addCoins(pay);
        this.runCoins += pay;
        this.hud.toast('drift +' + pay, 'gold');
        sfx.cash();
      }
      this.driftTime = 0;
      this.driftCash = 0;
      this.hud.clearCombo();
    }

    if (player.damage >= 100) { this.goDown('wrecked'); return; }
    if (this.bust >= 100) { this.goDown('busted'); return; }

    sfx.engine(clamp(player.speed / Math.max(10, spec.maxSpeed), 0, 1), input.throttle, player.flying);
    sfx.sirenLevel(pol.nearest, dt);

    this.hud.update({
      coins: store.coins,
      heat: this.heat,
      damage: player.damage,
      bust: this.bust,
      boost: player.boostFuel,
      speedKmh: player.speedKmh,
      maxKmh: (player.flying ? spec.flySpeed : spec.maxSpeed) * 3.6,
      flying: player.flying,
      drifting: player.drifting,
      boosting: player.boosting,
      reverse: player.fwdSpeed < -0.5,
      carName: store.selectedCar.name
    });
    this.minimap.draw(player, this.police.units);
  }

  updateCamera(dt) {
    const player = this.player;
    if (this.mode === 'menu') {
      this.orbit += dt * 0.16;
      const r = 16;
      this.camera.position.set(
        player.pos.x + Math.cos(this.orbit) * r,
        5.6 + Math.sin(this.orbit * 0.7) * 1.4,
        player.pos.z + Math.sin(this.orbit) * r
      );
      this.camera.lookAt(player.pos.x, player.pos.y + 1.1, player.pos.z);
      this.camera.fov += (52 - this.camera.fov) * 0.05;
      this.camera.updateProjectionMatrix();
      return;
    }

    const f = player.forward(new THREE.Vector3());
    const mode = CAM_MODES[this.camMode];
    const spd = clamp(player.speed / Math.max(12, player.spec.maxSpeed), 0, 1);
    let back = 8.5 + player.spec.length * 0.5 + spd * 5;
    let up = 3.3 + spd * 0.8;
    if (mode === 'far') { back *= 1.9; up *= 2.1; }
    if (mode === 'hood') { back = -player.spec.length * 0.18; up = 1.5; }
    if (player.flying) { back += 4; up += 2.4; }

    this.camPos.set(
      player.pos.x - f.x * back,
      player.pos.y + up,
      player.pos.z - f.z * back
    );
    if (mode !== 'hood') this.camPos.y = Math.max(this.camPos.y, player.pos.y + 1.4);

    const lerp = mode === 'hood' ? 0.5 : 1 - Math.exp(-7.5 * dt);
    this.camera.position.lerp(this.camPos, lerp);

    this.camLook.set(
      player.pos.x + f.x * 9,
      player.pos.y + 1.5 + (player.flying ? player.vy * 0.06 : 0),
      player.pos.z + f.z * 9
    );
    this.camera.lookAt(this.camLook);

    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.6;
      this.camera.position.z += (Math.random() - 0.5) * this.shake;
      this.shake *= Math.pow(0.0025, dt);
    }

    const targetFov = 62 + spd * 12 + (player.boosting ? 5 : 0);
    this.camera.fov += (targetFov - this.camera.fov) * (1 - Math.exp(-4 * dt));
    this.camera.updateProjectionMatrix();

    this.sun.position.set(player.pos.x + 60, 95, player.pos.z + 45);
    this.sunTarget.position.copy(player.pos);
  }

  autoResolution(dt) {
    this.frameAvg += (dt - this.frameAvg) * 0.05;
    this.perfTimer += dt;
    if (this.perfTimer < 1.5) return;
    this.perfTimer = 0;
    const cap = Math.min(devicePixelRatio, 1.75);
    let next = this.pixelRatio;
    if (this.frameAvg > 1 / 45 && this.pixelRatio > 0.7) next = Math.max(0.7, this.pixelRatio - 0.25);
    else if (this.frameAvg < 1 / 58 && this.pixelRatio < cap) next = Math.min(cap, this.pixelRatio + 0.25);
    if (next !== this.pixelRatio) {
      this.pixelRatio = next;
      this.resize();
    }
  }

  loop(now) {
    const raw = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(0.05, Math.max(0.0005, raw));

    this.autoResolution(dt);

    if (this.mode === 'playing') this.step(dt);
    else if (this.mode === 'menu') this.world.update(dt);

    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  }
}
