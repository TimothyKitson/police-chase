export class Minimap {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.range = 190;
  }

  draw(player, police, traffic, hazards) {
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

    ctx.fillStyle = 'rgba(32,96,132,.55)';
    for (const wt of world.water) {
      ctx.fillRect(
        (wt.minX - player.pos.x) * scale,
        (wt.minZ - player.pos.z) * scale,
        (wt.maxX - wt.minX) * scale,
        (wt.maxZ - wt.minZ) * scale
      );
    }

    for (let i = 0; i < world.xs.length; i++) {
      const dx = world.xs[i] - player.pos.x;
      if (Math.abs(dx) > this.range + 20) continue;
      ctx.strokeStyle = world.wx[i] >= 20 ? 'rgba(150,200,235,.5)' : 'rgba(120,170,210,.3)';
      ctx.lineWidth = world.wx[i] >= 20 ? 4 : 2.5;
      ctx.beginPath();
      ctx.moveTo(dx * scale, -h); ctx.lineTo(dx * scale, h);
      ctx.stroke();
    }
    for (let j = 0; j < world.zs.length; j++) {
      const dz = world.zs[j] - player.pos.z;
      if (Math.abs(dz) > this.range + 20) continue;
      ctx.strokeStyle = world.wz[j] >= 20 ? 'rgba(150,200,235,.5)' : 'rgba(120,170,210,.3)';
      ctx.lineWidth = world.wz[j] >= 20 ? 4 : 2.5;
      ctx.beginPath();
      ctx.moveTo(-w, dz * scale); ctx.lineTo(w, dz * scale);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,196,60,.85)';
    for (const r of world.ramps) {
      const dx = (r.x - player.pos.x) * scale;
      const dz = (r.z - player.pos.z) * scale;
      if (Math.abs(dx) > w || Math.abs(dz) > h) continue;
      ctx.fillRect(dx - 2.5, dz - 2.5, 5, 5);
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

    if (traffic) {
      ctx.fillStyle = 'rgba(190,200,215,.7)';
      for (const car of traffic.cars) {
        if (!car.active) continue;
        const dx = (car.x - player.pos.x) * scale;
        const dz = (car.z - player.pos.z) * scale;
        if (Math.abs(dx) > w || Math.abs(dz) > h) continue;
        ctx.fillRect(dx - 1.5, dz - 1.5, 3, 3);
      }
    }

    if (hazards) {
      for (const b of hazards.blocks) {
        if (!b.barriers.length) continue;
        const dx = (b.x - player.pos.x) * scale;
        const dz = (b.z - player.pos.z) * scale;
        if (Math.abs(dx) > w || Math.abs(dz) > h) continue;
        ctx.fillStyle = '#ff8a3d';
        ctx.fillRect(dx - 3.5, dz - 3.5, 7, 7);
      }
      ctx.fillStyle = '#5aa9ff';
      for (const t of hazards.traps) {
        const dx = (t.x - player.pos.x) * scale;
        const dz = (t.z - player.pos.z) * scale;
        if (Math.abs(dx) > w || Math.abs(dz) > h) continue;
        ctx.beginPath();
        ctx.arc(dx, dz, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
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
