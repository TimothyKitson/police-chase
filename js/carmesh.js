import * as THREE from '../vendor/three.module.js';

const boxCache = new Map();
function box(w, h, d) {
  const key = w.toFixed(3) + '|' + h.toFixed(3) + '|' + d.toFixed(3);
  let g = boxCache.get(key);
  if (!g) { g = new THREE.BoxGeometry(w, h, d); boxCache.set(key, g); }
  return g;
}

const wheelGeoCache = new Map();
function wheelGeo(r, w) {
  const key = r.toFixed(3) + '|' + w.toFixed(3);
  let g = wheelGeoCache.get(key);
  if (!g) {
    g = new THREE.CylinderGeometry(r, r, w, 16);
    g.rotateZ(Math.PI / 2);
    wheelGeoCache.set(key, g);
  }
  return g;
}

export function buildCar(spec, opts = {}) {
  const police = !!opts.police;
  const L = spec.length, W = spec.width, R = spec.wheelSize;
  const group = new THREE.Group();
  const disposables = [];

  const mk = (mat) => { disposables.push(mat); return mat; };

  const bodyMat = mk(new THREE.MeshStandardMaterial({
    color: spec.color, metalness: 0.6, roughness: 0.32
  }));
  const trimMat = mk(new THREE.MeshStandardMaterial({
    color: spec.accentColor, metalness: 0.4, roughness: 0.5
  }));
  const glassMat = mk(new THREE.MeshStandardMaterial({
    color: 0x0a1420, metalness: 0.9, roughness: 0.08, transparent: true, opacity: 0.82
  }));
  const rimMat = mk(new THREE.MeshStandardMaterial({
    color: spec.wheelColor ?? 0x151a21, metalness: 0.75, roughness: 0.35
  }));
  const tyreMat = mk(new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.95 }));

  const chassisY = R + 0.3 + Math.max(0, R - 0.5) * 0.95;
  const bodyH = 0.5 * (1 + (W - 2) * 0.06);

  const lower = new THREE.Mesh(box(W, bodyH, L), bodyMat);
  lower.position.y = chassisY;
  group.add(lower);

  const skirt = new THREE.Mesh(box(W * 1.01, 0.22, L * 0.86), trimMat);
  skirt.position.y = chassisY - bodyH * 0.5 - 0.04;
  group.add(skirt);

  const hood = new THREE.Mesh(box(W * 0.94, 0.2, L * 0.3), bodyMat);
  hood.position.set(0, chassisY + bodyH * 0.5 + 0.06, L * 0.3);
  group.add(hood);

  const cabinH = 0.52;
  const cabin = new THREE.Mesh(box(W * 0.84, cabinH, L * 0.42), glassMat);
  cabin.position.set(0, chassisY + bodyH * 0.5 + cabinH * 0.5, -L * 0.04);
  group.add(cabin);

  const roof = new THREE.Mesh(box(W * 0.8, 0.1, L * 0.36), bodyMat);
  roof.position.set(0, cabin.position.y + cabinH * 0.5 + 0.04, -L * 0.05);
  group.add(roof);

  const headMat = mk(new THREE.MeshStandardMaterial({
    color: 0xfff4d6, emissive: 0xfff0c0, emissiveIntensity: 1.6, roughness: 0.4
  }));
  const tailMat = mk(new THREE.MeshStandardMaterial({
    color: 0xff2b2b, emissive: 0xff1a1a, emissiveIntensity: 1.1, roughness: 0.4
  }));
  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(box(W * 0.24, 0.14, 0.1), headMat);
    hl.position.set(sx * W * 0.3, chassisY + 0.06, L * 0.5 + 0.02);
    group.add(hl);
    const tl = new THREE.Mesh(box(W * 0.26, 0.12, 0.08), tailMat);
    tl.position.set(sx * W * 0.29, chassisY + 0.1, -L * 0.5 - 0.02);
    group.add(tl);
  }

  const wheels = [];
  const wheelWidth = Math.max(0.24, R * 0.62);
  const tyre = wheelGeo(R, wheelWidth);
  const rim = wheelGeo(R * 0.58, wheelWidth * 1.04);
  for (const [sx, sz, front] of [[-1, 1, true], [1, 1, true], [-1, -1, false], [1, -1, false]]) {
    const holder = new THREE.Group();
    holder.position.set(sx * (W * 0.5 - wheelWidth * 0.28), R, sz * L * 0.32);
    const spin = new THREE.Group();
    const t = new THREE.Mesh(tyre, tyreMat);
    const r = new THREE.Mesh(rim, rimMat);
    spin.add(t, r);
    holder.add(spin);
    group.add(holder);
    wheels.push({ holder, spin, front });
  }

  if (spec.spoiler) {
    const wing = new THREE.Mesh(box(W * 0.9, 0.08, L * 0.14), trimMat);
    wing.position.set(0, chassisY + bodyH * 0.5 + 0.42, -L * 0.46);
    group.add(wing);
    for (const sx of [-1, 1]) {
      const strut = new THREE.Mesh(box(0.09, 0.36, 0.1), trimMat);
      strut.position.set(sx * W * 0.34, chassisY + bodyH * 0.5 + 0.2, -L * 0.46);
      group.add(strut);
    }
  }

  let glowMesh = null;
  if (spec.glow) {
    const glowMat = mk(new THREE.MeshBasicMaterial({
      color: spec.glowColor ?? 0x37e6ff, transparent: true, opacity: 0.45,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    }));
    const plane = new THREE.PlaneGeometry(W * 1.7, L * 1.3);
    plane.rotateX(-Math.PI / 2);
    glowMesh = new THREE.Mesh(plane, glowMat);
    glowMesh.position.y = 0.04;
    group.add(glowMesh);
  }

  let lightbar = null;
  if (police) {
    const barBase = new THREE.Mesh(box(W * 0.7, 0.08, 0.28), trimMat);
    barBase.position.set(0, roof.position.y + 0.1, -L * 0.02);
    group.add(barBase);
    const redMat = mk(new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 2 }));
    const blueMat = mk(new THREE.MeshStandardMaterial({ color: 0x2255ff, emissive: 0x0033ff, emissiveIntensity: 2 }));
    const rr = new THREE.Mesh(box(W * 0.3, 0.14, 0.24), redMat);
    rr.position.set(-W * 0.18, barBase.position.y + 0.1, -L * 0.02);
    const bb = new THREE.Mesh(box(W * 0.3, 0.14, 0.24), blueMat);
    bb.position.set(W * 0.18, barBase.position.y + 0.1, -L * 0.02);
    group.add(rr, bb);
    const stripeMat = mk(new THREE.MeshStandardMaterial({ color: 0x0b1a3a, roughness: 0.6 }));
    for (const sx of [-1, 1]) {
      const stripe = new THREE.Mesh(box(0.02, bodyH * 0.55, L * 0.6), stripeMat);
      stripe.position.set(sx * (W * 0.5 + 0.01), chassisY, 0);
      group.add(stripe);
    }
    lightbar = { redMat, blueMat };
  }

  group.traverse(o => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; }
  });
  if (glowMesh) glowMesh.castShadow = false;

  return {
    group,
    wheels,
    lightbar,
    glowMesh,
    materials: { bodyMat, trimMat, rimMat, glassMat },
    radius: Math.max(L, W) * 0.42,
    dispose() {
      disposables.forEach(m => m.dispose());
      group.clear();
    }
  };
}
