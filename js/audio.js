class Sfx {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.muted = false;
    this.engineOn = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const master = this.ctx.createGain();
    master.gain.value = 0.5;
    master.connect(this.ctx.destination);
    this.master = master;

    const eg = this.ctx.createGain();
    eg.gain.value = 0;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    eg.connect(filter);
    filter.connect(master);
    this.engineGain = eg;
    this.engineFilter = filter;

    this.oscA = this.ctx.createOscillator();
    this.oscA.type = 'sawtooth';
    this.oscA.frequency.value = 60;
    this.oscB = this.ctx.createOscillator();
    this.oscB.type = 'square';
    this.oscB.frequency.value = 91;
    this.oscA.connect(eg);
    this.oscB.connect(eg);
    this.oscA.start();
    this.oscB.start();

    const sg = this.ctx.createGain();
    sg.gain.value = 0;
    sg.connect(master);
    this.sirenGain = sg;
    this.siren = this.ctx.createOscillator();
    this.siren.type = 'triangle';
    this.siren.frequency.value = 700;
    this.siren.connect(sg);
    this.siren.start();
    this.sirenPhase = 0;

    this.ready = true;
    this.applyMute();
  }

  setMuted(m) {
    this.muted = m;
    this.applyMute();
  }

  applyMute() {
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
  }

  engine(speedRatio, throttle, flying) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const base = flying ? 120 : 58;
    const f = base + speedRatio * (flying ? 180 : 210);
    this.oscA.frequency.setTargetAtTime(f, t, 0.08);
    this.oscB.frequency.setTargetAtTime(f * 1.51, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(600 + speedRatio * 2200, t, 0.1);
    const g = this.engineOn ? (0.045 + (throttle ? 0.07 : 0.015) + speedRatio * 0.05) : 0;
    this.engineGain.gain.setTargetAtTime(g, t, 0.1);
  }

  sirenLevel(dist, dt) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const near = dist < 130 && this.engineOn;
    const target = near ? Math.max(0, 0.05 * (1 - dist / 130)) : 0;
    this.sirenGain.gain.setTargetAtTime(target, t, 0.2);
    if (near) {
      this.sirenPhase += dt * 2.4;
      const f = 620 + Math.sin(this.sirenPhase) * 240;
      this.siren.frequency.setTargetAtTime(f, t, 0.04);
    }
  }

  blip(freq = 880, dur = 0.09, type = 'triangle', gain = 0.13) {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 1.7, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  coin() { this.blip(1180, 0.08, 'triangle', 0.1); }
  cash() { this.blip(720, 0.22, 'square', 0.09); }

  crash(strength = 1) {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    const len = 0.28;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 400 + strength * 1400;
    const g = this.ctx.createGain();
    g.gain.value = Math.min(0.4, 0.1 + strength * 0.3);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  }

  whoosh() { this.blip(220, 0.35, 'sine', 0.12); }
}

export const sfx = new Sfx();
