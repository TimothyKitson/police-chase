import * as THREE from '../vendor/three.module.js';
import { hasModel, instantiate, paintModel, wheelNodes } from './models.js';

const boxCache = new Map();
function box(w, h, d) {
  const key = w.toFixed(3) + '|' + h.toFixed(3) + '|' + d.toFixed(3);
  let g = boxCache.get(key);
  if (!g) { g = new THREE.BoxGeometry(w, h, d); boxCache.set(key, g); }
  return g;
}

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,255,255,.95)');
  g.addColorStop(0.45, 'rgba(255,255,255,.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

const wheelGeoCache = new Map();
function wheelGeo(r, w) {
  const key = r.toFixed(3) + '|' + w.toFixed(3);
  let g = wheelGeoCache.get(key);
  if (!g) {
    g = new THREE.CylinderGeometry(r, r, w, 18);
    g.rotateZ(Math.PI / 2);
    wheelGeoCache.set(key, g);
  }
  return g;
}

function hull(sections, halfWidth, length) {
  const pos = [];
  const push = (a, b, c) => {
    pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  };
  const quad = (a, b, c, d) => { push(a, c, b); push(a, d, c); };

  const pts = sections.map(s => ({
    z: s[0] * length,
    w: s[1] * halfWidth,
    y0: s[2],
    y1: s[3]
  }));

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    quad([-a.w, a.y1, a.z], [a.w, a.y1, a.z], [b.w, b.y1, b.z], [-b.w, b.y1, b.z]);
    quad([-a.w, a.y0, a.z], [-b.w, b.y0, b.z], [b.w, b.y0, b.z], [a.w, a.y0, a.z]);
    quad([a.w, a.y0, a.z], [b.w, b.y0, b.z], [b.w, b.y1, b.z], [a.w, a.y1, a.z]);
    quad([-a.w, a.y0, a.z], [-a.w, a.y1, a.z], [-b.w, b.y1, b.z], [-b.w, b.y0, b.z]);
  }
  const f = pts[pts.length - 1], r = pts[0];
  quad([-f.w, f.y0, f.z], [f.w, f.y0, f.z], [f.w, f.y1, f.z], [-f.w, f.y1, f.z]);
  quad([-r.w, r.y0, r.z], [-r.w, r.y1, r.z], [r.w, r.y1, r.z], [r.w, r.y0, r.z]);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

const BODY = [
  [-0.500, 0.84, 0.26, 0.72],
  [-0.455, 0.96, 0.20, 0.84],
  [-0.330, 1.00, 0.18, 0.90],
  [-0.120, 1.00, 0.18, 0.92],
  [0.090, 1.00, 0.18, 0.92],
  [0.290, 0.99, 0.19, 0.86],
  [0.420, 0.94, 0.22, 0.76],
  [0.480, 0.86, 0.26, 0.68],
  [0.500, 0.76, 0.31, 0.60]
];

const CABIN = [
  [-0.330, 0.80, 0.88, 1.00],
  [-0.270, 0.86, 0.88, 1.24],
  [-0.140, 0.88, 0.88, 1.34],
  [0.040, 0.88, 0.88, 1.34],
  [0.140, 0.84, 0.88, 1.18],
  [0.215, 0.78, 0.88, 0.98]
];

const TRUCK_BODY = [
  [-0.500, 0.94, 0.34, 2.10],
  [-0.470, 1.00, 0.30, 2.16],
  [-0.100, 1.00, 0.28, 2.18],
  [0.140, 1.00, 0.28, 2.18],
  [0.155, 0.96, 0.28, 1.22],
  [0.330, 0.96, 0.26, 1.16],
  [0.450, 0.90, 0.28, 1.06],
  [0.500, 0.80, 0.34, 0.96]
];

const TRUCK_CABIN = [
  [0.150, 0.90, 1.14, 1.30],
  [0.210, 0.92, 1.14, 1.62],
  [0.360, 0.92, 1.14, 1.60],
  [0.470, 0.84, 1.14, 1.34],
  [0.500, 0.76, 1.14, 1.16]
];

function buildFromModel(spec, slot, opts) {
  const holder = instantiate(slot, { targetLength: spec.length });
  if (!holder) return null;
  const group = new THREE.Group();
  group.add(holder);
  const disposables = [];
  const geometries = [];

  paintModel(holder, spec.color);

  const wheelSet = wheelNodes(holder);
  const wheels = [];
  if (wheelSet) {
    const order = [['fl', true], ['fr', true], ['rl', false], ['rr', false]];
    for (const [key, front] of order) {
      const node = wheelSet[key];
      if (!node) continue;
      const holderGroup = new THREE.Group();
      const spin = new THREE.Group();
      node.parent.add(holderGroup);
      holderGroup.position.copy(node.position);
      node.position.set(0, 0, 0);
      holderGroup.add(spin);
      spin.add(node);
      wheels.push({ holder: holderGroup, spin, front });
    }
  } else {
    const R = spec.wheelSize;
    const W = spec.width;
    const L = spec.length;
    const wheelWidth = Math.max(0.24, R * 0.6);
    const tyreMat = new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.95 });
    const rimMat = new THREE.MeshStandardMaterial({
      color: spec.wheelColor ?? 0x151a21, metalness: 0.8, roughness: 0.3
    });
    disposables.push(tyreMat, rimMat);
    const tyre = wheelGeo(R, wheelWidth);
    const rim = wheelGeo(R * 0.6, wheelWidth * 1.06);
    for (const [sx, sz, front] of [[-1, 1, true], [1, 1, true], [-1, -1, false], [1, -1, false]]) {
      const holderGroup = new THREE.Group();
      holderGroup.position.set(sx * (W * 0.5 - wheelWidth * 0.18), R, sz * L * 0.33);
      const spin = new THREE.Group();
      spin.add(new THREE.Mesh(tyre, tyreMat));
      spin.add(new THREE.Mesh(rim, rimMat));
      holderGroup.add(spin);
      group.add(holderGroup);
      wheels.push({ holder: holderGroup, spin, front });
    }
  }

  let lightbar = null;
  if (opts.police) {
    const met = bodyMetrics(spec);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 2 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x2255ff, emissive: 0x0033ff, emissiveIntensity: 2 });
    disposables.push(redMat, blueMat);
    const domeGeo = box(spec.width * 0.28, 0.13, 0.22);
    const top = (holder.userData.size?.y ?? met.cabinTop) + 0.07;
    const rr = new THREE.Mesh(domeGeo, redMat);
    rr.position.set(-spec.width * 0.17, top, -spec.length * 0.03);
    const bb = new THREE.Mesh(domeGeo, blueMat);
    bb.position.set(spec.width * 0.17, top, -spec.length * 0.03);
    group.add(rr, bb);
    lightbar = { redMat, blueMat };
  }

  let glowMesh = null;
  if (spec.glow) {
    const glowMat = new THREE.MeshBasicMaterial({
      color: spec.glowColor ?? 0x37e6ff, map: glowTexture(), transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    const plane = new THREE.PlaneGeometry(spec.width * 2.6, spec.length * 1.9);
    plane.rotateX(-Math.PI / 2);
    disposables.push(glowMat);
    geometries.push(plane);
    glowMesh = new THREE.Mesh(plane, glowMat);
    glowMesh.position.y = 0.04;
    group.add(glowMesh);
  }

  const bodyMat = new THREE.MeshStandardMaterial({ color: spec.color, metalness: 0.55, roughness: 0.3 });
  const trimMat = new THREE.MeshStandardMaterial({ color: spec.accentColor });
  const rimMat2 = new THREE.MeshStandardMaterial({ color: spec.wheelColor ?? 0x151a21 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a1420, transparent: true, opacity: 0.72 });
  disposables.push(bodyMat, trimMat, rimMat2, glassMat);

  return {
    group,
    wheels,
    lightbar,
    glowMesh,
    cabin: null,
    fromModel: true,
    height: holder.userData.size?.y ?? bodyMetrics(spec).cabinTop,
    materials: { bodyMat, trimMat, rimMat: rimMat2, glassMat },
    radius: Math.max(spec.length, spec.width) * 0.42,
    dispose() {
      disposables.forEach(m => m.dispose());
      geometries.forEach(g => g.dispose());
      holder.traverse(o => {
        if (o.isMesh) {
          o.geometry?.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(m => m?.dispose());
        }
      });
      group.clear();
    }
  };
}

export function bodyMetrics(spec) {
  const truck = !!spec.truck;
  const body = truck ? TRUCK_BODY : BODY;
  const cabin = truck ? TRUCK_CABIN : CABIN;
  const lift = spec.wheelSize * 0.42;
  return {
    lift,
    truck,
    bodyTop: lift + body.reduce((m, s) => Math.max(m, s[3]), 0),
    cabinTop: lift + cabin.reduce((m, s) => Math.max(m, s[3]), 0),
    noseTop: lift + body[body.length - 1][3],
    cabinFrontZ: cabin[cabin.length - 1][0] * spec.length,
    cabinRearZ: cabin[0][0] * spec.length
  };
}

export function buildCar(spec, opts = {}) {
  const police = !!opts.police;
  const slot = opts.slot || (police ? 'car_police' : 'car_' + (spec.id || 'cruiser'));
  if (hasModel(slot)) {
    const built = buildFromModel(spec, slot, opts);
    if (built) return built;
  }
  const L = spec.length, W = spec.width, R = spec.wheelSize;
  const group = new THREE.Group();
  const disposables = [];
  const geometries = [];
  const mk = (mat) => { disposables.push(mat); return mat; };
  const gk = (g) => { geometries.push(g); return g; };

  const bodyMat = mk(new THREE.MeshStandardMaterial({
    color: spec.color, metalness: 0.55, roughness: 0.3, flatShading: true
  }));
  const trimMat = mk(new THREE.MeshStandardMaterial({
    color: spec.accentColor, metalness: 0.35, roughness: 0.55
  }));
  const glassMat = mk(new THREE.MeshStandardMaterial({
    color: 0x0a1420, metalness: 0.9, roughness: 0.08, transparent: true, opacity: 0.72,
    flatShading: true
  }));
  const rimMat = mk(new THREE.MeshStandardMaterial({
    color: spec.wheelColor ?? 0x151a21, metalness: 0.8, roughness: 0.3
  }));
  const tyreMat = mk(new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.95 }));
  const chromeMat = mk(new THREE.MeshStandardMaterial({ color: 0x9aa4b0, metalness: 0.9, roughness: 0.25 }));

  const truck = !!spec.truck;
  const bodyProfile = truck ? TRUCK_BODY : BODY;
  const cabinProfile = truck ? TRUCK_CABIN : CABIN;
  const bodyTop = bodyProfile.reduce((m, s) => Math.max(m, s[3]), 0);
  const cabinTop = cabinProfile.reduce((m, s) => Math.max(m, s[3]), 0);
  const noseY = bodyProfile[bodyProfile.length - 1][3];
  const tailY = bodyProfile[0][3];

  const lift = R * 0.42;
  const bodyGeo = gk(hull(bodyProfile, W / 2, L));
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = lift;
  group.add(body);

  const cabinGeo = gk(hull(cabinProfile, W / 2, L));
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.y = lift;
  group.add(cabin);

  const roof = new THREE.Mesh(
    box(W * (truck ? 0.86 : 0.70), 0.06, L * (truck ? 0.14 : 0.20)),
    bodyMat
  );
  roof.position.set(0, lift + cabinTop + 0.03, truck ? L * 0.28 : -L * 0.05);
  group.add(roof);

  if (truck) {
    const boxTop = new THREE.Mesh(box(W * 0.98, 0.08, L * 0.6), trimMat);
    boxTop.position.set(0, lift + bodyTop + 0.04, -L * 0.16);
    group.add(boxTop);
    for (const sx of [-1, 1]) {
      const rib = new THREE.Mesh(box(0.06, bodyTop - 0.5, L * 0.56), trimMat);
      rib.position.set(sx * (W * 0.5 + 0.02), lift + bodyTop * 0.6, -L * 0.18);
      group.add(rib);
    }
    const doors = new THREE.Mesh(box(W * 0.82, bodyTop - 0.75, 0.05), trimMat);
    doors.position.set(0, lift + bodyTop * 0.6, -L * 0.5 - 0.02);
    group.add(doors);
  }

  const skirt = new THREE.Mesh(box(W * 1.01, 0.14, L * 0.72), trimMat);
  skirt.position.y = lift + 0.25;
  group.add(skirt);

  const grille = new THREE.Mesh(box(W * 0.5, 0.14, 0.1), trimMat);
  grille.position.set(0, lift + Math.min(0.5, noseY * 0.55), L * 0.5);
  group.add(grille);

  const headMat = mk(new THREE.MeshStandardMaterial({
    color: 0xfff4d6, emissive: 0xfff0c0, emissiveIntensity: 1.8, roughness: 0.35
  }));
  const tailMat = mk(new THREE.MeshStandardMaterial({
    color: 0xff2b2b, emissive: 0xff1a1a, emissiveIntensity: 1.3, roughness: 0.4
  }));
  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(box(W * 0.22, 0.12, 0.08), headMat);
    hl.position.set(sx * W * 0.28, lift + Math.min(0.62, noseY * 0.66), L * 0.495);
    group.add(hl);
    const tl = new THREE.Mesh(box(W * 0.24, 0.1, 0.07), tailMat);
    tl.position.set(sx * W * 0.27, lift + Math.min(0.66, tailY * 0.72), -L * 0.5);
    group.add(tl);
    const mirror = new THREE.Mesh(box(0.2, 0.1, 0.08), trimMat);
    mirror.position.set(sx * W * 0.52, lift + (truck ? 1.3 : 1.02), L * (truck ? 0.36 : 0.14));
    group.add(mirror);
  }

  const exhaust = new THREE.Mesh(box(W * 0.3, 0.09, 0.1), chromeMat);
  exhaust.position.set(-W * 0.22, lift + 0.31, -L * 0.5);
  group.add(exhaust);

  const wheels = [];
  const wheelWidth = Math.max(0.24, R * 0.6);
  const tyre = wheelGeo(R, wheelWidth);
  const rim = wheelGeo(R * 0.6, wheelWidth * 1.06);
  const hubGeo = box(R * 0.3, R * 0.3, wheelWidth * 1.1);
  for (const [sx, sz, front] of [[-1, 1, true], [1, 1, true], [-1, -1, false], [1, -1, false]]) {
    const holder = new THREE.Group();
    holder.position.set(sx * (W * 0.5 - wheelWidth * 0.18), R, sz * L * 0.33);
    const spin = new THREE.Group();
    spin.add(new THREE.Mesh(tyre, tyreMat));
    spin.add(new THREE.Mesh(rim, rimMat));
    const hub = new THREE.Mesh(hubGeo, chromeMat);
    spin.add(hub);
    holder.add(spin);
    group.add(holder);
    wheels.push({ holder, spin, front });
  }

  if (spec.spoiler && !truck) {
    const wing = new THREE.Mesh(box(W * 0.86, 0.07, L * 0.13), trimMat);
    wing.position.set(0, lift + 1.12, -L * 0.47);
    group.add(wing);
    for (const sx of [-1, 1]) {
      const strut = new THREE.Mesh(box(0.08, 0.3, 0.09), trimMat);
      strut.position.set(sx * W * 0.32, lift + 0.96, -L * 0.47);
      group.add(strut);
    }
  }

  let glowMesh = null;
  if (spec.glow) {
    const glowMat = mk(new THREE.MeshBasicMaterial({
      color: spec.glowColor ?? 0x37e6ff, map: glowTexture(), transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    }));
    const plane = gk(new THREE.PlaneGeometry(W * 2.6, L * 1.9));
    plane.rotateX(-Math.PI / 2);
    glowMesh = new THREE.Mesh(plane, glowMat);
    glowMesh.position.y = 0.04;
    group.add(glowMesh);
  }

  let lightbar = null;
  if (police) {
    const liveryMat = mk(new THREE.MeshStandardMaterial({ color: 0x10254f, roughness: 0.55, metalness: 0.3 }));
    const hoodPanel = new THREE.Mesh(box(W * 0.62, 0.03, L * 0.24), liveryMat);
    hoodPanel.position.set(0, lift + Math.min(0.9, noseY * 0.95), L * 0.28);
    group.add(hoodPanel);
    for (const sx of [-1, 1]) {
      const doorPanel = new THREE.Mesh(box(0.03, 0.3, L * 0.4), liveryMat);
      doorPanel.position.set(sx * (W * 0.5 + 0.005), lift + 0.62, -L * 0.02);
      group.add(doorPanel);
      const stripe = new THREE.Mesh(box(0.025, 0.09, L * 0.62), tailMat);
      stripe.position.set(sx * (W * 0.5 + 0.02), lift + 0.44, 0);
      group.add(stripe);
    }

    const barBase = new THREE.Mesh(box(W * 0.66, 0.07, 0.26), trimMat);
    barBase.position.set(0, lift + cabinTop + 0.08, -L * 0.03);
    group.add(barBase);
    const redMat = mk(new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 2 }));
    const blueMat = mk(new THREE.MeshStandardMaterial({ color: 0x2255ff, emissive: 0x0033ff, emissiveIntensity: 2 }));
    const domeGeo = box(W * 0.28, 0.13, 0.22);
    const rr = new THREE.Mesh(domeGeo, redMat);
    rr.position.set(-W * 0.17, lift + cabinTop + 0.17, -L * 0.03);
    const bb = new THREE.Mesh(domeGeo, blueMat);
    bb.position.set(W * 0.17, lift + cabinTop + 0.17, -L * 0.03);
    group.add(rr, bb);

    const pushBar = new THREE.Mesh(box(W * 0.82, 0.1, 0.1), chromeMat);
    pushBar.position.set(0, lift + 0.5, L * 0.53);
    group.add(pushBar);
    for (const sx of [-1, 1]) {
      const upright = new THREE.Mesh(box(0.1, 0.44, 0.1), chromeMat);
      upright.position.set(sx * W * 0.3, lift + 0.62, L * 0.53);
      group.add(upright);
    }
    const spot = new THREE.Mesh(box(0.16, 0.16, 0.18), chromeMat);
    spot.position.set(-W * 0.44, lift + cabinTop * 0.86, L * 0.2);
    group.add(spot);

    lightbar = { redMat, blueMat };
  }

  group.traverse(o => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; }
  });
  if (glowMesh) glowMesh.castShadow = false;

  return {
    group,
    wheels,
    cabin,
    height: lift + Math.max(bodyTop, cabinTop),
    lightbar,
    glowMesh,
    materials: { bodyMat, trimMat, rimMat, glassMat },
    radius: Math.max(L, W) * 0.42,
    dispose() {
      disposables.forEach(m => m.dispose());
      geometries.forEach(g => g.dispose());
      group.clear();
    }
  };
}
