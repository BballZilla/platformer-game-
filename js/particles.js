// ---------------------------------------------------------------------------
// particles.js — short-lived visual effects (dust, sparkles, confetti).
// Purely cosmetic: particles never affect gameplay.
// ---------------------------------------------------------------------------

class Particles {
  constructor() {
    this.list = [];
  }

  // Spawn `count` particles at (x, y) with random velocities.
  burst(x, y, count, { color = "#fff", speed = 120, life = 0.5, size = 4, gravity = 600, spread = Math.PI * 2, angle = 0 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const s = speed * (0.4 + Math.random() * 0.6);
      const colorPick = Array.isArray(color) ? color[Math.floor(Math.random() * color.length)] : color;
      this.list.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life, maxLife: life, size, gravity, color: colorPick,
      });
    }
  }

  update(dt) {
    for (const p of this.list) {
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx) {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      const s = p.size * (0.5 + 0.5 * p.life / p.maxLife);
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }
}
