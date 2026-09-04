const $ = id => document.getElementById(id);

export class Hud {
  constructor() {
    this.root = $('hud');
    this.coinValue = $('coinValue');
    this.wanted = $('wantedStars');
    this.carName = $('carName');
    this.damageBar = $('damageBar');
    this.bustBar = $('bustBar');
    this.boostBar = $('boostBar');
    this.boostBlock = $('boostBlock');
    this.speedValue = $('speedValue');
    this.gearText = $('gearText');
    this.chipFly = $('chipFly');
    this.chipDrift = $('chipDrift');
    this.chipBoost = $('chipBoost');
    this.toasts = $('toasts');
    this.comboWrap = $('comboWrap');
    this.comboText = $('comboText');
    this.comboValue = $('comboValue');
    this.objective = $('objective');
    this.objArrow = $('objArrow');
    this.objLabel = $('objLabel');
    this.objSub = $('objSub');
    this.objCrew = $('objCrew');
    this.jobCount = $('jobCount');
    this.canvas = $('speedoCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.boostBlock.classList.remove('hidden');
    this.shownCoins = 0;
  }

  show() { this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); }

  toast(text, kind = '') {
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = text;
    this.toasts.appendChild(el);
    setTimeout(() => el.remove(), 1900);
    while (this.toasts.children.length > 4) this.toasts.firstChild.remove();
  }

  setCombo(label, value) {
    this.comboWrap.classList.remove('hidden');
    this.comboText.textContent = label;
    this.comboValue.textContent = '+' + Math.floor(value);
  }

  clearCombo() { this.comboWrap.classList.add('hidden'); }

  update(s) {
    this.shownCoins += (s.coins - this.shownCoins) * 0.25;
    if (Math.abs(s.coins - this.shownCoins) < 1) this.shownCoins = s.coins;
    this.coinValue.textContent = Math.round(this.shownCoins).toLocaleString();

    const stars = Math.min(5, Math.floor(s.heat));
    this.wanted.textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    this.carName.textContent = s.carName;

    this.damageBar.style.width = s.damage + '%';
    this.bustBar.style.width = s.bust + '%';
    this.boostBar.style.width = (s.boost * 100) + '%';

    this.speedValue.textContent = Math.round(Math.abs(s.speedKmh));
    const ratio = Math.min(1, Math.abs(s.speedKmh) / Math.max(40, s.maxKmh));
    const gearRatio = ratio;
    this.gearText.textContent = s.flying ? 'FLY'
      : s.reverse ? 'R'
      : Math.abs(s.speedKmh) < 3 ? 'N'
      : String(Math.min(6, 1 + Math.floor(gearRatio * 5.6)));

    this.chipFly.textContent = s.flying ? 'E · FLYING' : 'E · FLY OFF';
    this.chipFly.classList.toggle('on', s.flying);
    this.chipDrift.classList.toggle('on', s.drifting);
    this.chipBoost.classList.toggle('on', s.boosting);

    this.drawSpeedo(ratio, s.flying);
    this.updateObjective(s.job);
  }

  updateObjective(job) {
    if (!job) return;
    this.objLabel.textContent = job.label;
    this.objSub.textContent = job.state === 'idle'
      ? 'stand by'
      : (job.distance > 999 ? (job.distance / 1000).toFixed(2) + ' km' : Math.round(job.distance) + ' m');
    this.objective.classList.toggle('drop', job.state === 'toDrop');
    this.objective.classList.toggle('idle', job.state === 'idle');
    this.objArrow.style.transform = `rotate(${job.bearing}deg)`;
    this.objCrew.classList.toggle('hidden', !job.crew);
    if (job.crew) this.objCrew.textContent = 'CREW ' + job.crew;
    this.jobCount.textContent = job.delivered;
  }

  drawSpeedo(rawRatio, flying) {
    const ratio = Math.max(0.001, Math.min(1, rawRatio));
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h - 22, r = 96;
    const start = Math.PI * 0.86, end = Math.PI * 2.14;

    ctx.lineWidth = 9;
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(120,220,255,.2)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 10; i++) {
      const a = start + (end - start) * (i / 10);
      const x1 = cx + Math.cos(a) * (r - 12), y1 = cy + Math.sin(a) * (r - 12);
      const x2 = cx + Math.cos(a) * (r - 20), y2 = cy + Math.sin(a) * (r - 20);
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    const grad = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
    if (flying) {
      grad.addColorStop(0, '#ff3ea5');
      grad.addColorStop(1, '#ffd23e');
    } else {
      grad.addColorStop(0, '#37e6ff');
      grad.addColorStop(0.7, '#8bf0ff');
      grad.addColorStop(1, '#ff3ea5');
    }
    ctx.strokeStyle = grad;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + (end - start) * Math.max(0.001, ratio));
    ctx.stroke();

    const a = start + (end - start) * ratio;
    ctx.fillStyle = flying ? '#ff3ea5' : '#37e6ff';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
