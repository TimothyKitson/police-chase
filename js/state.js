import { ADMIN_DEFAULTS, CARS, CHEAT_COINS } from './config.js';

const KEY = 'blacktop-modded-save-v1';

const DEFAULT_SAVE = {
  coins: 0,
  owned: ['cruiser'],
  selected: 'cruiser',
  admin: { ...ADMIN_DEFAULTS },
  best: { distance: 0, coins: 0, heat: 0 },
  muted: false
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SAVE, admin: { ...ADMIN_DEFAULTS }, owned: ['cruiser'], best: { ...DEFAULT_SAVE.best } };
    const parsed = JSON.parse(raw);
    const save = {
      ...DEFAULT_SAVE,
      ...parsed,
      admin: { ...ADMIN_DEFAULTS, ...(parsed.admin || {}) },
      best: { ...DEFAULT_SAVE.best, ...(parsed.best || {}) },
      owned: Array.isArray(parsed.owned) && parsed.owned.length ? parsed.owned : ['cruiser']
    };
    if (!save.owned.includes('cruiser')) save.owned.push('cruiser');
    if (!CARS.some(c => c.id === save.selected)) save.selected = 'cruiser';
    if (!save.owned.includes(save.selected)) save.selected = 'cruiser';
    save.coins = Math.max(0, Math.floor(Number(save.coins) || 0));
    return save;
  } catch (e) {
    return { ...DEFAULT_SAVE, admin: { ...ADMIN_DEFAULTS }, owned: ['cruiser'], best: { ...DEFAULT_SAVE.best } };
  }
}

class Store {
  constructor() {
    this.data = load();
    this.listeners = new Set();
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { void e; }
    this.listeners.forEach(fn => fn(this.data));
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  get coins() { return this.data.coins; }

  addCoins(n) {
    this.data.coins = Math.max(0, Math.floor(this.data.coins + n));
    this.save();
    return this.data.coins;
  }

  cheatCoins() { return this.addCoins(CHEAT_COINS); }

  owns(id) { return this.data.owned.includes(id); }

  buy(id) {
    const car = CARS.find(c => c.id === id);
    if (!car || this.owns(id)) return false;
    if (this.data.coins < car.price) return false;
    this.data.coins -= car.price;
    this.data.owned.push(id);
    this.save();
    return true;
  }

  select(id) {
    if (!this.owns(id)) return false;
    this.data.selected = id;
    this.save();
    return true;
  }

  get selectedCar() {
    return CARS.find(c => c.id === this.data.selected) || CARS[0];
  }

  get admin() { return this.data.admin; }

  setAdmin(key, value) {
    this.data.admin[key] = value;
    this.save();
  }

  setAdminAll(values) {
    this.data.admin = { ...ADMIN_DEFAULTS, ...values };
    this.save();
  }

  resetAdmin() {
    this.data.admin = { ...ADMIN_DEFAULTS };
    this.save();
  }

  recordRun(run) {
    const b = this.data.best;
    b.distance = Math.max(b.distance, run.distance || 0);
    b.coins = Math.max(b.coins, run.coins || 0);
    b.heat = Math.max(b.heat, run.heat || 0);
    this.save();
  }

  get muted() { return !!this.data.muted; }
  set muted(v) { this.data.muted = !!v; this.save(); }
}

export const store = new Store();
