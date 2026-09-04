import * as THREE from '../vendor/three.module.js';
import { buildCar } from './carmesh.js';

export class CarPreview {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.canvas = this.renderer.domElement;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.camera.position.set(7.4, 4.2, 9.6);
    this.camera.lookAt(0, 0.85, 0);

    this.scene.add(new THREE.HemisphereLight(0x8fb6ff, 0x14181f, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(5, 8, 6);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x37e6ff, 0.75);
    fill.position.set(-6, 3, -5);
    this.scene.add(fill);
    const rim = new THREE.PointLight(0xff3ea5, 11, 16);
    rim.position.set(-3, 2.2, -4);
    this.scene.add(rim);

    const floorGeo = new THREE.CircleGeometry(7.5, 48);
    floorGeo.rotateX(-Math.PI / 2);
    this.floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({
      color: 0x0e131b, roughness: 0.55, metalness: 0.35
    }));
    this.scene.add(this.floor);

    const ringGeo = new THREE.RingGeometry(7.2, 7.5, 64);
    ringGeo.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x37e6ff, transparent: true, opacity: 0.6 }));
    this.ring.position.y = 0.01;
    this.scene.add(this.ring);

    this.turn = new THREE.Group();
    this.scene.add(this.turn);

    this.car = null;
    this.sig = '';
    this.running = false;
    this.mountEl = null;
    this.spin = 0.6;
    this.loop = this.loop.bind(this);
  }

  mount(el) {
    if (this.mountEl === el) return;
    this.mountEl = el;
    el.appendChild(this.canvas);
    this.resize();
  }

  resize() {
    if (!this.mountEl) return;
    const w = this.mountEl.clientWidth || 320;
    const h = this.mountEl.clientHeight || 240;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  signature(spec) {
    return [spec.length, spec.width, spec.wheelSize, !!spec.spoiler, !!spec.glow].join('|');
  }

  setSpec(spec) {
    const sig = this.signature(spec);
    if (this.car && sig === this.sig) {
      this.car.materials.bodyMat.color.set(spec.color);
      this.car.materials.trimMat.color.set(spec.accentColor);
      this.car.materials.rimMat.color.set(spec.wheelColor ?? 0x151a21);
      if (this.car.glowMesh) this.car.glowMesh.material.color.set(spec.glowColor ?? 0x37e6ff);
      this.ring.material.color.set(spec.glow ? (spec.glowColor ?? 0x37e6ff) : 0x37e6ff);
      return;
    }
    if (this.car) {
      this.turn.remove(this.car.group);
      this.car.dispose();
    }
    this.car = buildCar(spec, {});
    this.car.group.traverse(o => { if (o.isMesh) o.castShadow = false; });
    if (this.car.glowMesh) this.car.glowMesh.material.opacity = 0.32;
    this.turn.add(this.car.group);
    this.sig = sig;
    this.ring.material.color.set(spec.glow ? (spec.glowColor ?? 0x37e6ff) : 0x37e6ff);
    const scale = Math.min(1, 4.3 / Math.max(spec.length, spec.width * 2.1));
    this.turn.scale.setScalar(scale);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.loop);
  }

  stop() { this.running = false; }

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.turn.rotation.y += dt * this.spin;
    if (this.car) {
      for (const w of this.car.wheels) w.spin.rotation.x -= dt * 1.6;
    }
    this.resize();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  }
}
