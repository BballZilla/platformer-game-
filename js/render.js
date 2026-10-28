// ---------------------------------------------------------------------------
// render.js — all drawing code. Everything is drawn with canvas shapes, so the
// game needs no image files. Swap any of these functions for sprite drawing
// (ctx.drawImage) if you want to use your own art.
// ---------------------------------------------------------------------------

const Render = {
  // ---- Background (parallax: far layers scroll slower than near ones) ----
  background(ctx, camX, time) {
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, COLORS.skyTop);
    sky.addColorStop(1, COLORS.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Sun
    ctx.fillStyle = "rgba(255, 245, 200, 0.9)";
    ctx.beginPath();
    ctx.arc(780 - camX * 0.02, 110, 46, 0, Math.PI * 2);
    ctx.fill();

    // Clouds drift slowly on their own as well as with the camera.
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    for (let i = 0; i < 8; i++) {
      const span = VIEW_W + 300;
      const x = ((i * 410 - camX * 0.15 + time * 8) % span + span) % span - 150;
      const y = 50 + ((i * 97) % 140);
      this.cloud(ctx, x, y, 0.7 + (i % 3) * 0.25);
    }

    this.hills(ctx, camX * 0.25, COLORS.hillFar, 360, 60, 0.004);
    this.hills(ctx, camX * 0.5, COLORS.hillNear, 420, 45, 0.007);
  },

  cloud(ctx, x, y, s) {
    ctx.beginPath();
    ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
    ctx.arc(x + 25 * s, y - 10 * s, 28 * s, 0, Math.PI * 2);
    ctx.arc(x + 55 * s, y, 22 * s, 0, Math.PI * 2);
    ctx.fill();
  },

  hills(ctx, offset, color, baseY, amp, freq) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, VIEW_H);
    for (let x = 0; x <= VIEW_W; x += 8) {
      const wx = x + offset;
      ctx.lineTo(x, baseY - Math.sin(wx * freq) * amp - Math.sin(wx * freq * 2.7) * amp * 0.4);
    }
    ctx.lineTo(VIEW_W, VIEW_H);
    ctx.fill();
  },

  // ---- Tiles: only the ones on screen are drawn ----
  tiles(ctx, level, camX, camY) {
    const c0 = Math.max(0, Math.floor(camX / TILE));
    const c1 = Math.min(level.cols - 1, Math.floor((camX + VIEW_W) / TILE));
    const r0 = Math.max(0, Math.floor(camY / TILE));
    const r1 = Math.min(level.rows - 1, Math.floor((camY + VIEW_H) / TILE));

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = level.tileAt(c, r);
        if (t === " ") continue;
        const x = Math.round(c * TILE - camX);
        const y = Math.round(r * TILE - camY);
        if (t === "#") this.ground(ctx, x, y, !level.isSolid(c, r - 1));
        else if (t === "B") this.brick(ctx, x, y);
        else if (t === "-") this.plank(ctx, x, y);
        else if (t === "^") this.spikes(ctx, x, y);
      }
    }
  },

  ground(ctx, x, y, grassy) {
    ctx.fillStyle = COLORS.dirt;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = COLORS.dirtDark;
    ctx.fillRect(x + 6, y + 14, 4, 4);
    ctx.fillRect(x + 20, y + 24, 5, 4);
    if (grassy) {
      ctx.fillStyle = COLORS.grass;
      ctx.fillRect(x, y, TILE, 9);
      ctx.fillStyle = COLORS.grassDark;
      ctx.fillRect(x, y + 9, TILE, 3);
      ctx.fillRect(x + 4, y + 12, 4, 3);
      ctx.fillRect(x + 22, y + 12, 4, 3);
    }
  },

  brick(ctx, x, y) {
    ctx.fillStyle = COLORS.brickDark;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = COLORS.brick;
    ctx.fillRect(x + 1, y + 1, 14, 14);
    ctx.fillRect(x + 17, y + 1, 14, 14);
    ctx.fillRect(x + 1, y + 17, 6, 14);
    ctx.fillRect(x + 9, y + 17, 14, 14);
    ctx.fillRect(x + 25, y + 17, 6, 14);
  },

  plank(ctx, x, y) {
    ctx.fillStyle = COLORS.plankDark;
    ctx.fillRect(x, y, TILE, 12);
    ctx.fillStyle = COLORS.plank;
    ctx.fillRect(x, y, TILE, 8);
    ctx.fillStyle = COLORS.plankDark;
    ctx.fillRect(x + 4, y + 12, 3, 8);
    ctx.fillRect(x + TILE - 7, y + 12, 3, 8);
  },

  spikes(ctx, x, y) {
    for (let i = 0; i < 4; i++) {
      const sx = x + i * 8;
      ctx.fillStyle = COLORS.spikeDark;
      ctx.beginPath();
      ctx.moveTo(sx, y + TILE);
      ctx.lineTo(sx + 4, y + 10);
      ctx.lineTo(sx + 8, y + TILE);
      ctx.fill();
      ctx.fillStyle = COLORS.spike;
      ctx.beginPath();
      ctx.moveTo(sx + 1, y + TILE);
      ctx.lineTo(sx + 4, y + 10);
      ctx.lineTo(sx + 5, y + TILE);
      ctx.fill();
    }
  },

  // ---- Entities ----
  player(ctx, p, camX, camY, time) {
    if (p.dead) return;
    // Draw relative to the feet so squash & stretch keeps them on the ground.
    const footX = p.x + p.w / 2 - camX;
    const footY = p.y + p.h - camY;
    const w = p.w * p.scaleX;
    const h = p.h * p.scaleY;
    const bob = p.runTime > 0 ? Math.abs(Math.sin(p.runTime * 18)) * 2 : 0;

    ctx.save();
    ctx.translate(Math.round(footX), Math.round(footY));

    // Legs (alternate while running)
    ctx.fillStyle = COLORS.playerDark;
    const swing = p.runTime > 0 ? Math.sin(p.runTime * 18) * 4 : 0;
    ctx.fillRect(-w / 2 + 3 + swing, -6, 6, 6);
    ctx.fillRect(w / 2 - 9 - swing, -6, 6, 6);

    // Body
    ctx.fillStyle = COLORS.player;
    this.roundRect(ctx, -w / 2, -h - bob, w, h - 4, 7);
    ctx.fill();

    // Eyes look in the facing direction (and up when rising, down when falling).
    const lookY = Math.max(-2, Math.min(2, p.vy / 300));
    const ex = p.facing * 3;
    ctx.fillStyle = "#fff";
    ctx.fillRect(ex - 6, -h + 7 - bob, 5, 7);
    ctx.fillRect(ex + 2, -h + 7 - bob, 5, 7);
    ctx.fillStyle = "#222";
    ctx.fillRect(ex - 5 + p.facing, -h + 9 - bob + lookY, 3, 4);
    ctx.fillRect(ex + 3 + p.facing, -h + 9 - bob + lookY, 3, 4);
    ctx.restore();
  },

  walker(ctx, e, camX, camY) {
    const x = Math.round(e.x - camX);
    const y = Math.round(e.y - camY);
    if (!e.alive) {
      // Squashed pancake that fades out
      ctx.globalAlpha = Math.max(0, e.squashTimer / ENEMY.squashTime);
      ctx.fillStyle = COLORS.enemy;
      this.roundRect(ctx, x - 2, y + e.h - 7, e.w + 4, 7, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    const step = Math.sin(e.animTime * 12) * 3;
    ctx.fillStyle = COLORS.enemyDark;
    ctx.fillRect(x + 3 + step, y + e.h - 5, 7, 5);
    ctx.fillRect(x + e.w - 10 - step, y + e.h - 5, 7, 5);
    ctx.fillStyle = COLORS.enemy;
    this.roundRect(ctx, x, y, e.w, e.h - 3, 10);
    ctx.fill();
    // Angry eyes
    const d = e.dir || -1;
    ctx.fillStyle = "#fff";
    ctx.fillRect(x + 6 + d * 2, y + 6, 5, 6);
    ctx.fillRect(x + 15 + d * 2, y + 6, 5, 6);
    ctx.fillStyle = "#222";
    ctx.fillRect(x + 7 + d * 3, y + 8, 3, 4);
    ctx.fillRect(x + 16 + d * 3, y + 8, 3, 4);
    ctx.fillRect(x + 5 + d * 2, y + 4, 7, 2);
    ctx.fillRect(x + 14 + d * 2, y + 4, 7, 2);
  },

  coin(ctx, c, camX, camY, time) {
    const bob = Math.sin(time * 3 + c.phase) * 3;
    const spin = Math.abs(Math.cos(time * 4 + c.phase)); // 0..1 width = fake 3D spin
    const cx = c.x + c.w / 2 - camX;
    const cy = c.y + c.h / 2 - camY + bob;
    ctx.fillStyle = COLORS.coinDark;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(1.5, 8 * spin), 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.coin;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(1, 5.5 * spin), 6, 0, 0, Math.PI * 2);
    ctx.fill();
  },

  spring(ctx, s, camX, camY) {
    const x = Math.round(s.x - camX);
    const bottom = Math.round(s.y + s.h - camY);
    const height = 16 - s.compress * 9;
    ctx.fillStyle = "#555c66";
    ctx.fillRect(x + 2, bottom - 4, s.w - 4, 4);
    ctx.strokeStyle = "#9aa3ad";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const yy = bottom - 4 - (height - 8) * (i / 4);
      ctx.lineTo(x + (i % 2 ? s.w - 6 : 6), yy);
    }
    ctx.stroke();
    ctx.fillStyle = "#e84a4a";
    ctx.fillRect(x, bottom - height - 4, s.w, 6);
  },

  checkpoint(ctx, cp, camX, camY, time) {
    const x = Math.round(cp.x + TILE / 2 - camX);
    const top = Math.round(cp.y - camY);
    const bottom = Math.round(cp.y + cp.h - camY);
    ctx.fillStyle = "#ddd";
    ctx.fillRect(x - 2, top + 4, 4, bottom - top - 4);
    ctx.fillStyle = cp.active ? "#4ade80" : "#9ca3af";
    const wave = cp.active ? Math.sin(time * 6) * 3 : 0;
    ctx.beginPath();
    ctx.moveTo(x + 2, top + 4);
    ctx.lineTo(x + 22, top + 12 + wave);
    ctx.lineTo(x + 2, top + 22);
    ctx.fill();
  },

  flag(ctx, f, camX, camY, time) {
    const x = Math.round(f.x + f.w / 2 - camX);
    const top = Math.round(f.y - camY);
    const bottom = Math.round(f.y + f.h - camY);
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(x - 3, top, 6, bottom - top);
    ctx.fillStyle = COLORS.coin;
    ctx.beginPath();
    ctx.arc(x, top, 6, 0, Math.PI * 2);
    ctx.fill();
    // Waving checkered flag
    const cols = 5, rows = 3, cw = 9, ch = 9;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const wave = Math.sin(time * 5 - i * 0.8) * 3 * (i / cols);
        ctx.fillStyle = (i + j) % 2 ? "#111" : "#fff";
        ctx.fillRect(x + 3 + i * cw, top + 6 + j * ch + wave, cw, ch);
      }
    }
  },

  // ---- HUD & screens ----
  hud(ctx, game) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    this.roundRect(ctx, 10, 10, 410, 40, 10);
    ctx.fill();
    ctx.font = "bold 20px 'Trebuchet MS', sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    // Coin icon + count
    ctx.fillStyle = COLORS.coin;
    ctx.beginPath();
    ctx.arc(32, 30, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.hud;
    ctx.fillText(`${game.coins}/${game.totalCoins}`, 46, 31);

    // Lives as little hearts
    for (let i = 0; i < game.lives; i++) this.heart(ctx, 135 + i * 24, 30, COLORS.player);

    ctx.fillStyle = COLORS.hud;
    ctx.fillText(`${String(game.score).padStart(6, "0")}`, 220, 31);
    ctx.fillText(`⏱ ${formatTime(game.time)}`, 320, 31);
  },

  heart(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + 7);
    ctx.bezierCurveTo(x - 12, y - 1, x - 6, y - 10, x, y - 4);
    ctx.bezierCurveTo(x + 6, y - 10, x + 12, y - 1, x, y + 7);
    ctx.fill();
  },

  // Dark panel with a title and lines of text, used for every menu screen.
  // (On touchscreens the bottom of the screen has buttons over it, so the
  // text is moved up a little.)
  screen(ctx, title, lines, { titleColor = COLORS.coin, dim = 0.55 } = {}) {
    ctx.fillStyle = `rgba(10, 8, 25, ${dim})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "bold 64px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    const top = Input.touchMode ? 120 : 170;
    ctx.fillText(title, VIEW_W / 2 + 4, top + 4);
    ctx.fillStyle = titleColor;
    ctx.fillText(title, VIEW_W / 2, top);

    ctx.font = "22px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "#fff";
    lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, top + 90 + i * 36));
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
};

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
