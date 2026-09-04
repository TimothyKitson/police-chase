export const MOD_BUILD = 'v1.0';

export const ADMIN_PRICE = 100000;
export const CHEAT_COINS = 1000;
export const COIN_VALUE = 25;

export const WORLD = {
  seed: 730421,
  streets: 14,
  minGap: 52,
  maxGap: 104,
  arterialEvery: 4,
  arterialWidth: 23,
  streetWidth: 15,
  narrowWidth: 12.5,
  alleyWidth: 7,
  alleyChance: 0.26,
  coinCount: 190,
  trafficCars: 130,
  staticRoadblocks: 7,
  policePosts: 9,
  minBuildingHeight: 6,
  maxBuildingHeight: 86
};

export const TRAFFIC = {
  minSpeed: 7,
  maxSpeed: 16,
  followGap: 14,
  junctionSlow: 0.4,
  simRadius: 200,
  spawnClear: 24,
  turnChance: 0.32
};

export const HAZARD = {
  trapSpeed: 19,
  trapRadius: 15,
  dynamicBlocks: 3
};

export const BASE_CAR = {
  maxSpeed: 44,
  accel: 24,
  reverseAccel: 12,
  grip: 7.2,
  driftGrip: 1.5,
  brake: 32,
  steerRate: 2.1,
  drag: 0.34,
  boost: 1.28,
  mass: 1,
  flySpeed: 38,
  flyLift: 22,
  gravity: 26,
  length: 4.3,
  width: 2,
  height: 1.15,
  wheelSize: 0.34,
  color: 0x3fa9f5,
  accentColor: 0x121821,
  wheelColor: 0x151a21,
  glow: false,
  glowColor: 0x37e6ff,
  spoiler: false,
  invincible: false,
  noPolice: false
};

export const CARS = [
  {
    id: 'cruiser',
    name: 'City Cruiser',
    price: 0,
    desc: 'Rental-lot hatchback. Cheap, grippy, and slower than every cruiser on the force.',
    color: 0x3fa9f5, accentColor: 0x121821,
    maxSpeed: 42, accel: 23, grip: 7.6, brake: 32, steerRate: 2.2, boost: 1.22,
    length: 3.9, width: 1.86, wheelSize: 0.33
  },
  {
    id: 'muscle',
    name: 'Blacktop V8',
    price: 6500,
    desc: 'Loud, tail-happy muscle. Break the rear loose on purpose and farm drift cash.',
    color: 0xf25c2a, accentColor: 0x1a1010,
    maxSpeed: 53, accel: 31, grip: 5.9, driftGrip: 1.1, brake: 30, steerRate: 2.05, boost: 1.32,
    length: 4.6, width: 2.02, wheelSize: 0.37, spoiler: true
  },
  {
    id: 'interceptor',
    name: 'Nightline GT',
    price: 24000,
    desc: 'Track-bred coupe. Enough top end to lose a five-star pursuit on a straight.',
    color: 0x9d5cff, accentColor: 0x140f22,
    maxSpeed: 63, accel: 37, grip: 8.4, brake: 40, steerRate: 2.15, boost: 1.4,
    length: 4.4, width: 1.96, wheelSize: 0.35, spoiler: true, glow: true, glowColor: 0x9d5cff
  },
  {
    id: 'admin',
    name: 'Admin Prototype',
    price: ADMIN_PRICE,
    admin: true,
    desc: 'Dev-only chassis with the tuning console wired straight to the physics. Set it up however you want before you spawn.',
    color: 0xff3ea5, accentColor: 0x14060f,
    maxSpeed: 92, accel: 62, grip: 9.4, brake: 52, steerRate: 2.5, boost: 1.7,
    flySpeed: 62, flyLift: 34,
    length: 4.5, width: 2.04, wheelSize: 0.36, spoiler: true, glow: true, glowColor: 0xff3ea5
  }
];

export const ADMIN_DEFAULTS = {
  maxSpeed: 92,
  accel: 62,
  grip: 9.4,
  driftGrip: 1.5,
  brake: 52,
  steerRate: 2.5,
  boost: 1.7,
  mass: 1,
  flySpeed: 62,
  flyLift: 34,
  gravity: 26,
  length: 4.5,
  width: 2.04,
  wheelSize: 0.36,
  color: 0xff3ea5,
  accentColor: 0x14060f,
  wheelColor: 0x151a21,
  glowColor: 0xff3ea5,
  glow: true,
  spoiler: true,
  invincible: false,
  noPolice: false
};

const kmh = v => Math.round(v * 3.6) + ' km/h';
const one = v => v.toFixed(1);
const pct = v => Math.round(v * 100) + '%';

export const ADMIN_SCHEMA = [
  { group: 'PERFORMANCE' },
  { key: 'maxSpeed', label: 'Max Speed', min: 15, max: 300, step: 1, fmt: kmh },
  { key: 'accel', label: 'Acceleration', min: 8, max: 260, step: 1, fmt: v => one(v) + ' m/s²' },
  { key: 'brake', label: 'Brake Force', min: 10, max: 160, step: 1, fmt: v => one(v) + ' m/s²' },
  { key: 'boost', label: 'Boost Multiplier', min: 1, max: 4, step: 0.02, fmt: v => '×' + v.toFixed(2) },

  { group: 'HANDLING' },
  { key: 'grip', label: 'Grip', min: 1.5, max: 26, step: 0.1, fmt: one },
  { key: 'driftGrip', label: 'Handbrake Grip', min: 0.2, max: 8, step: 0.1, fmt: one },
  { key: 'steerRate', label: 'Steering Rate', min: 0.6, max: 7, step: 0.05, fmt: v => v.toFixed(2) + ' rad/s' },
  { key: 'mass', label: 'Weight', min: 0.3, max: 4, step: 0.05, fmt: v => Math.round(v * 1400) + ' kg' },

  { group: 'MOD PHYSICS' },
  { key: 'flySpeed', label: 'Fly Thrust (E)', min: 12, max: 220, step: 1, fmt: kmh },
  { key: 'flyLift', label: 'Climb Rate', min: 5, max: 120, step: 1, fmt: v => one(v) + ' m/s' },
  { key: 'gravity', label: 'Gravity', min: 2, max: 70, step: 0.5, fmt: v => one(v) + ' m/s²' },

  { group: 'APPEARANCE' },
  { key: 'color', label: 'Body Paint', type: 'color' },
  { key: 'accentColor', label: 'Trim / Glass', type: 'color' },
  { key: 'wheelColor', label: 'Rims', type: 'color' },
  { key: 'glowColor', label: 'Underglow', type: 'color' },
  { key: 'glow', label: 'Underglow On', type: 'toggle' },
  { key: 'spoiler', label: 'Rear Wing', type: 'toggle' },
  { key: 'length', label: 'Body Length', min: 2.6, max: 9, step: 0.05, fmt: v => v.toFixed(2) + ' m' },
  { key: 'width', label: 'Body Width', min: 1.4, max: 5, step: 0.02, fmt: v => v.toFixed(2) + ' m' },
  { key: 'wheelSize', label: 'Wheel Size', min: 0.24, max: 1.1, step: 0.01, fmt: v => v.toFixed(2) + ' m' },

  { group: 'CHEATS' },
  { key: 'invincible', label: 'No Damage', type: 'toggle' },
  { key: 'noPolice', label: 'Police Ignore You', type: 'toggle' }
];

export const ADMIN_PRESETS = [
  {
    name: 'BALANCED',
    values: { ...ADMIN_DEFAULTS }
  },
  {
    name: 'ROCKET',
    values: { maxSpeed: 240, accel: 200, brake: 90, boost: 2.6, grip: 14, steerRate: 2.1, mass: 0.8, flySpeed: 170, flyLift: 70, gravity: 20, color: 0x00e5ff, glowColor: 0x00e5ff, glow: true, spoiler: true, length: 4.2, width: 1.94, wheelSize: 0.33 }
  },
  {
    name: 'DRIFT KING',
    values: { maxSpeed: 70, accel: 78, brake: 34, boost: 1.5, grip: 3.6, driftGrip: 0.5, steerRate: 3.4, mass: 1.4, color: 0xffcc3d, glowColor: 0xffcc3d, glow: true, spoiler: true, length: 4.6, width: 2.06, wheelSize: 0.38 }
  },
  {
    name: 'MONSTER',
    values: { maxSpeed: 60, accel: 70, brake: 60, boost: 1.4, grip: 8, steerRate: 1.8, mass: 3.4, gravity: 34, length: 6.4, width: 3.6, wheelSize: 0.95, color: 0x3ddc84, glowColor: 0x3ddc84, glow: true, spoiler: false }
  },
  {
    name: 'JET',
    values: { maxSpeed: 130, accel: 110, brake: 70, boost: 2, grip: 12, steerRate: 2.6, mass: 0.5, flySpeed: 210, flyLift: 110, gravity: 6, color: 0xe8f4ff, accentColor: 0x0a1420, glowColor: 0x37e6ff, glow: true, spoiler: true, length: 5.2, width: 2.14, wheelSize: 0.3 }
  },
  {
    name: 'GOD MODE',
    values: { maxSpeed: 300, accel: 260, brake: 160, boost: 4, grip: 26, driftGrip: 8, steerRate: 7, mass: 4, flySpeed: 220, flyLift: 120, gravity: 2, invincible: true, noPolice: true, color: 0xffffff, accentColor: 0x000000, wheelColor: 0xffcc3d, glowColor: 0xff3ea5, glow: true, spoiler: true, length: 4.8, width: 2.2, wheelSize: 0.42 }
  }
];

export const POLICE_SPEC = {
  color: 0xf2f4f8,
  accentColor: 0x0b1a3a,
  maxSpeed: 50,
  accel: 27,
  grip: 7.4,
  brake: 30,
  steerRate: 2.0,
  length: 4.5, width: 1.98, wheelSize: 0.36
};

export function resolveSpec(car, adminConfig) {
  if (car.admin) return { ...BASE_CAR, ...car, ...adminConfig, admin: true };
  return { ...BASE_CAR, ...car };
}
