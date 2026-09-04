export class Minimap {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.range = 190;
  }

  draw(player, police) {
    const ctx = this.ctx;
    const { width: w, height: h } = this.canvas;
    const cx = w / 2, cy = h / 2;
    const scale = (w * 0.5) / this.range;
    const world = this.world;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = 'rgba(8,12,19,.85)';
    ctx.fillRect(0, 0, w, h);

    ctx.translate(cx, cy);
    ctx.rotate(-player.yaw);

    const B = world.B, half = world.half;
    ctx.strokeStyle = 'rgba(120,170,210,.32)';
    ctx.lineWidth = 3;
    const first = Math.floor((player.pos.x - this.range + half) / B);
    const last = Math.ceil((player.pos.x + this.range + half) / B);
    for (let i = first; i <= last; i++) {
      const lx = (-half + i * B - player.pos.x) * scale;
      ctx.beginPath();
      ctx.moveTo(lx, -h); ctx.lineTo(lx, h);
      ctx.stroke();
    }
    const firstZ = Math.floor((player.pos.z - this.range + half) / B);
    const lastZ = Math.ceil((player.pos.z + this.range + half) / B);
    for (let j = firstZ; j <= lastZ; j++) {
      const lz = (-half + j * B - player.pos.z) * scale;
      ctx.beginPath();
      ctx.moveTo(-w, lz); ctx.lineTo(w, lz);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffcc3d';
    for (const c of world.coins) {
      if (!c.active) continue;
      const dx = (c.x - player.pos.x);
      const dz = (c.z - player.pos.z);
      if (Math.abs(dx) > this.range || Math.abs(dz) > this.range) continue;
      ctx.beginPath();
      ctx.arc(dx * scale, dz * scale, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const u of police) {
      const v = u.vehicle;
      const dx = (v.pos.x - player.pos.x) * scale;
      const dz = (v.pos.z - player.pos.z) * scale;
      ctx.fillStyle = '#ff4d4d';
      ctx.beginPath();
      ctx.arc(dx, dz, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,77,77,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(dx, dz, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#37e6ff';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 4);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(120,220,255,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}
