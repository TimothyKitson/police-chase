import { ADMIN_PRESETS, ADMIN_SCHEMA, CARS, MOD_BUILD, resolveSpec } from './config.js';
import { store } from './state.js';
import { CarPreview } from './preview.js';

const $ = id => document.getElementById(id);
const numToHex = n => '#' + (n & 0xffffff).toString(16).padStart(6, '0');
const hexToNum = h => parseInt(h.replace('#', ''), 16);
const fmtCoins = n => Math.floor(n).toLocaleString();

const SCREENS = ['menu', 'garage', 'admin', 'help', 'pause', 'down'];

export class UI {
  constructor(actions) {
    this.actions = actions;
    this.current = 'menu';
    this.root = 'menu';
    this.previewCarId = store.data.selected;
    this.preview = new CarPreview();

    document.getElementById('screens').addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      this.handle(btn.dataset.action);
    });

    $('btnBuySelect').addEventListener('click', () => this.buyOrSelect());
    $('btnTune').addEventListener('click', () => this.show('admin'));

    store.onChange(() => this.refresh());
    this.buildAdminControls();
    this.buildPresets();
    this.renderGarage();
    this.refresh();
    window.addEventListener('resize', () => this.preview.resize());
  }

  handle(action) {
    switch (action) {
      case 'play': this.actions.play(); break;
      case 'playadmin': store.select('admin'); this.actions.play(); break;
      case 'garage': this.show('garage'); break;
      case 'help': this.show('help'); break;
      case 'back': this.back(); break;
      case 'resume': this.actions.resume(); break;
      case 'menu': this.actions.quitToMenu(); break;
      case 'respawn': this.actions.respawn(); break;
      case 'cheatcoins': this.actions.cheat(); break;
      case 'adminreset':
        store.resetAdmin();
        this.syncAdminControls();
        break;
    }
  }

  show(name) {
    if (name && !SCREENS.includes(name)) return;
    if (name === 'menu' || name === 'pause') this.root = name;
    else if ((name === 'garage' || name === 'help') && (this.current === 'menu' || this.current === 'pause')) {
      this.root = this.current;
    }
    this.current = name;
    for (const s of SCREENS) {
      $('screen-' + s).classList.toggle('active', s === name);
    }
    if (name === 'garage' || name === 'admin') {
      this.preview.mount(name === 'garage' ? $('previewMount') : $('adminPreviewMount'));
      this.preview.start();
      this.syncPreview();
      if (name === 'admin') this.syncAdminControls();
    } else {
      this.preview.stop();
    }
    if (name === 'garage') this.renderGarage();
    this.refresh();
  }

  back() {
    this.show(this.root || 'menu');
  }

  hideAll() {
    this.current = null;
    for (const s of SCREENS) $('screen-' + s).classList.remove('active');
    this.preview.stop();
  }

  get blocking() { return !!this.current; }

  refresh() {
    const c = fmtCoins(store.coins);
    $('menuCoins').textContent = c;
    const best = store.data.best;
    $('menuBest').textContent = best.distance > 50
      ? ` · BEST RUN ${(best.distance / 1000).toFixed(2)} KM · ${fmtCoins(best.coins)} COINS`
      : '';
    $('garageCoins').textContent = c;
    $('pauseCoins').textContent = c;
    this.updateCards();
    this.updatePreviewInfo();
  }

  renderGarage() {
    const list = $('carList');
    list.innerHTML = '';
    this.cards = new Map();
    for (const car of CARS) {
      const btn = document.createElement('button');
      btn.className = 'car-card' + (car.admin ? ' admincard' : '');
      btn.innerHTML = `
        <span class="cname"></span>
        <span class="cprice"></span>
        <span class="cspec"></span>
        <span class="swatch"></span>`;
      btn.querySelector('.cname').textContent = car.name;
      btn.addEventListener('click', () => {
        this.previewCarId = car.id;
        this.syncPreview();
        this.refresh();
      });
      list.appendChild(btn);
      this.cards.set(car.id, btn);
    }
    this.updateCards();
  }

  specFor(car) {
    return resolveSpec(car, store.admin);
  }

  updateCards() {
    if (!this.cards) return;
    for (const car of CARS) {
      const el = this.cards.get(car.id);
      if (!el) continue;
      const spec = this.specFor(car);
      const owned = store.owns(car.id);
      const priceEl = el.querySelector('.cprice');
      priceEl.className = 'cprice' + (owned ? ' owned' : store.coins >= car.price ? '' : ' locked');
      priceEl.textContent = owned
        ? (store.data.selected === car.id ? 'IN USE' : 'OWNED')
        : fmtCoins(car.price);
      el.querySelector('.cspec').textContent = car.admin && !owned
        ? 'Fully tunable · locked'
        : `${Math.round(spec.maxSpeed * 3.6)} km/h · ${Math.round(spec.accel)} accel · grip ${spec.grip.toFixed(1)}`;
      el.querySelector('.swatch').style.background =
        `linear-gradient(90deg,${numToHex(spec.color)},${numToHex(spec.glowColor ?? spec.color)})`;
      el.classList.toggle('sel', this.previewCarId === car.id);
    }
  }

  syncPreview() {
    const car = CARS.find(c => c.id === this.previewCarId) || CARS[0];
    this.preview.setSpec(this.specFor(car));
  }

  updatePreviewInfo() {
    const car = CARS.find(c => c.id === this.previewCarId) || CARS[0];
    const spec = this.specFor(car);
    const owned = store.owns(car.id);
    $('previewName').textContent = car.name;
    $('previewDesc').textContent = car.desc;

    const rows = [
      ['TOP SPEED', spec.maxSpeed / 300, Math.round(spec.maxSpeed * 3.6) + ' km/h'],
      ['ACCELERATION', spec.accel / 260, spec.accel.toFixed(0)],
      ['GRIP', spec.grip / 26, spec.grip.toFixed(1)],
      ['BRAKES', spec.brake / 160, spec.brake.toFixed(0)],
      ['BOOST', (spec.boost - 1) / 3, '×' + spec.boost.toFixed(2)],
      ['FLY THRUST', spec.flySpeed / 220, Math.round(spec.flySpeed * 3.6) + ' km/h']
    ];
    $('previewStats').innerHTML = rows.map(([label, ratio, val]) => `
      <div class="stat-row${car.admin ? ' mod' : ''}">
        <span>${label} · ${val}</span>
        <span class="sbar"><i style="width:${Math.max(3, Math.min(100, ratio * 100))}%"></i></span>
      </div>`).join('');

    const btn = $('btnBuySelect');
    const tune = $('btnTune');
    tune.classList.toggle('hidden', !car.admin || !owned);
    btn.disabled = false;
    if (owned) {
      const inUse = store.data.selected === car.id;
      btn.textContent = inUse ? 'SELECTED' : 'SELECT';
      btn.disabled = inUse;
    } else if (store.coins >= car.price) {
      btn.textContent = 'BUY — ' + fmtCoins(car.price);
    } else {
      btn.textContent = 'NEED ' + fmtCoins(car.price - store.coins) + ' MORE';
      btn.disabled = true;
    }
  }

  buyOrSelect() {
    const car = CARS.find(c => c.id === this.previewCarId);
    if (!car) return;
    if (store.owns(car.id)) {
      store.select(car.id);
      this.actions.notify?.(car.name + ' selected');
    } else if (store.buy(car.id)) {
      store.select(car.id);
      this.actions.notify?.(car.name + ' unlocked', car.admin ? 'mod' : 'gold');
      if (car.admin) this.show('admin');
    }
    this.refresh();
  }

  buildAdminControls() {
    const wrap = $('adminControls');
    wrap.innerHTML = '';
    this.adminControls = [];
    for (const item of ADMIN_SCHEMA) {
      if (item.group) {
        const h = document.createElement('h4');
        h.textContent = item.group;
        wrap.appendChild(h);
        continue;
      }
      if (item.type === 'color') {
        const el = document.createElement('label');
        el.className = 'ctl color';
        el.innerHTML = `<span class="ctl-head"><span>${item.label}</span></span>`;
        const inp = document.createElement('input');
        inp.type = 'color';
        inp.addEventListener('input', () => {
          store.setAdmin(item.key, hexToNum(inp.value));
          this.syncPreview();
        });
        el.appendChild(inp);
        wrap.appendChild(el);
        this.adminControls.push({ item, sync: () => { inp.value = numToHex(store.admin[item.key] ?? 0); } });
      } else if (item.type === 'toggle') {
        const el = document.createElement('div');
        el.className = 'ctl toggle';
        el.innerHTML = `<span class="ctl-head"><span>${item.label}</span></span><span class="switch"></span>`;
        el.addEventListener('click', () => {
          store.setAdmin(item.key, !store.admin[item.key]);
          this.syncAdminControls();
          this.syncPreview();
        });
        wrap.appendChild(el);
        this.adminControls.push({ item, sync: () => el.classList.toggle('on', !!store.admin[item.key]) });
      } else {
        const el = document.createElement('div');
        el.className = 'ctl';
        el.innerHTML = `<span class="ctl-head"><span>${item.label}</span><b></b></span>`;
        const out = el.querySelector('b');
        const inp = document.createElement('input');
        inp.type = 'range';
        inp.min = item.min; inp.max = item.max; inp.step = item.step;
        inp.addEventListener('input', () => {
          const v = parseFloat(inp.value);
          store.setAdmin(item.key, v);
          out.textContent = item.fmt ? item.fmt(v) : v;
          this.syncPreview();
        });
        el.appendChild(inp);
        wrap.appendChild(el);
        this.adminControls.push({
          item,
          sync: () => {
            const v = store.admin[item.key] ?? item.min;
            inp.value = v;
            out.textContent = item.fmt ? item.fmt(v) : v;
          }
        });
      }
    }
  }

  buildPresets() {
    const wrap = $('adminPresets');
    wrap.innerHTML = '';
    for (const p of ADMIN_PRESETS) {
      const btn = document.createElement('button');
      btn.className = 'btn tiny';
      btn.textContent = p.name;
      btn.addEventListener('click', () => {
        store.setAdminAll({ ...store.admin, ...p.values });
        this.syncAdminControls();
        this.previewCarId = 'admin';
        this.syncPreview();
        this.actions.notify?.('preset · ' + p.name, 'mod');
      });
      wrap.appendChild(btn);
    }
  }

  syncAdminControls() {
    if (!this.adminControls) return;
    for (const c of this.adminControls) c.sync();
    this.previewCarId = 'admin';
    this.syncPreview();
    this.updateCards();
  }

  showDown(info) {
    $('downTitle').textContent = info.title;
    $('downSub').textContent = info.sub;
    $('runStats').innerHTML = `
      <div><b>${fmtCoins(info.runCoins)}</b>COINS THIS RUN</div>
      <div><b>${(info.distance / 1000).toFixed(2)}</b>KM DRIVEN</div>
      <div><b>${info.stars}</b>MAX WANTED</div>
      <div><b>${MOD_BUILD}</b>MOD BUILD</div>`;
    this.show('down');
  }
}

