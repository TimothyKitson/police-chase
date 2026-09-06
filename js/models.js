import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';

const BASE = './models/';
const MANIFEST = BASE + 'manifest.json';

export const MODEL_SLOTS = [
  'car_cruiser', 'car_van', 'car_muscle', 'car_interceptor',
  'car_bullion', 'car_admin', 'car_police', 'car_traffic', 'cockpit'
];

const cache = new Map();
let manifest = {};
let loaded = false;

function boundsOf(object) {
  const box = new THREE.Box3().setFromObject(object);
  return {
    box,
    size: box.getSize(new THREE.Vector3()),
    center: box.getCenter(new THREE.Vector3())
  };
}

function applyTweaks(root, tweak) {
  if (!tweak) return;
  if (tweak.rotate) {
    root.rotation.set(
      THREE.MathUtils.degToRad(tweak.rotate[0] || 0),
      THREE.MathUtils.degToRad(tweak.rotate[1] || 0),
      THREE.MathUtils.degToRad(tweak.rotate[2] || 0)
    );
  }
  if (tweak.scale) root.scale.multiplyScalar(tweak.scale);
  if (tweak.offset) {
    root.position.x += tweak.offset[0] || 0;
    root.position.y += tweak.offset[1] || 0;
    root.position.z += tweak.offset[2] || 0;
  }
}

export function normalise(scene, opts = {}) {
  const holder = new THREE.Group();
  const root = new THREE.Group();
  root.add(scene);
  holder.add(root);

  applyTweaks(root, opts.tweak);
  root.updateMatrixWorld(true);

  let { size, center } = boundsOf(root);
  if (opts.targetLength && size.z > 0.0001) {
    const k = opts.targetLength / size.z;
    root.scale.multiplyScalar(k);
    root.updateMatrixWorld(true);
    ({ size, center } = boundsOf(root));
  }

  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= center.y - size.y / 2;
  root.updateMatrixWorld(true);

  holder.userData.size = size.clone();
  return holder;
}

function findNodes(object, pattern) {
  const out = [];
  object.traverse(o => { if (pattern.test(o.name)) out.push(o); });
  return out;
}

export function wheelNodes(holder) {
  const found = findNodes(holder, /wheel|tyre|tire/i);
  if (!found.length) return null;
  const pick = (re) => found.find(o => re.test(o.name)) || null;
  const set = {
    fl: pick(/(fl|front[_-]?left|left[_-]?front)/i),
    fr: pick(/(fr|front[_-]?right|right[_-]?front)/i),
    rl: pick(/(rl|rear[_-]?left|left[_-]?rear|back[_-]?left)/i),
    rr: pick(/(rr|rear[_-]?right|right[_-]?rear|back[_-]?right)/i)
  };
  const named = Object.values(set).filter(Boolean).length;
  return named >= 3 ? set : null;
}

export function namedNode(holder, pattern) {
  return findNodes(holder, pattern)[0] || null;
}

export async function preloadModels(onProgress) {
  if (loaded) return cache;
  loaded = true;
  try {
    const res = await fetch(MANIFEST, { cache: 'no-cache' });
    if (res.ok) manifest = await res.json();
  } catch (e) { void e; }

  const auto = new URLSearchParams(location.search).get('models') === 'auto';
  const loader = new GLTFLoader();
  const jobs = MODEL_SLOTS.map(async (slot) => {
    const entry = manifest[slot];
    const opted = !!entry && (entry.enabled === true || typeof entry.file === 'string');
    if (!opted && !auto) return;
    const file = (entry && entry.file) || slot + '.glb';
    const url = BASE + file;
    if (auto && !opted) {
      try {
        const head = await fetch(url, { method: 'HEAD' });
        if (!head.ok) return;
      } catch (e) { return; }
    }
    try {
      const gltf = await new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
      cache.set(slot, { scene: gltf.scene, tweak: entry || null });
      if (onProgress) onProgress(slot);
    } catch (err) {
      console.warn('[models] failed to load ' + url, err);
    }
  });
  await Promise.all(jobs);
  return cache;
}

export function hasModel(slot) { return cache.has(slot); }

export function instantiate(slot, opts = {}) {
  const entry = cache.get(slot);
  if (!entry) return null;
  const clone = entry.scene.clone(true);
  clone.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
      if (Array.isArray(o.material)) o.material = o.material.map(m => m.clone());
      else if (o.material) o.material = o.material.clone();
    }
  });
  return normalise(clone, { ...opts, tweak: entry.tweak });
}

export function paintModel(holder, color, pattern = /body|paint|shell|chassis/i) {
  let painted = 0;
  holder.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const match = pattern.test(o.name) || pattern.test(o.material.name || '');
    if (!match) return;
    for (const m of mats) {
      if (m.color) { m.color.set(color); painted++; }
    }
  });
  return painted;
}
