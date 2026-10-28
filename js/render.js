// ---------------------------------------------------------------------------
// render.js — all drawing code. Everything is drawn with canvas shapes, so the
// game needs no image files. Swap any of these functions for sprite drawing
// (ctx.drawImage) if you want to use your own art.
// ---------------------------------------------------------------------------

// Fixed "random" numbers so the stars, bats and decorations are the same
// every frame (real Math.random() here would make them jump around).
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const STARS = Array.from({ length: 70 }, (_, i) => ({
  x: hash(i) * 1400,
  y: hash(i + 100) * 300,
  r: 0.6 + hash(i + 200) * 1.4,
  phase: hash(i + 300) * 10,
}));

const BATS = Array.from({ length: 6 }, (_, i) => ({
  x: hash(i + 400) * 1600,
  y: 60 + hash(i + 500) * 180,
  speed: 40 + hash(i + 600) * 50,
  phase: hash(i + 700) * 10,
  size: 0.6 + hash(i + 800) * 0.6,
}));

const Render = {
  // ---- Background (parallax: far layers scroll slower than near ones) ----
  // Each level has its own sky colours and moon colour (see LEVELS).
  background(ctx, camX, time, level) {
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, level.sky[0]);
    sky.addColorStop(0.55, level.sky[1]);
    sky.addColorStop(1, level.sky[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Twinkling stars
    for (const s of STARS) {
      const x = ((s.x - camX * 0.03) % 1400 + 1400) % 1400 - 200;
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(time * 1.5 + s.phase));
      ctx.fillStyle = "#fff";
      ctx.fillRect(x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    this.moon(ctx, 760 - camX * 0.02, 110, level.moon);

    // Bats flapping across the sky
    for (const b of BATS) {
      const span = VIEW_W + 200;
      const x = ((b.x + time * b.speed - camX * 0.3) % span + span) % span - 100;
      const y = b.y + Math.sin(time * 2 + b.phase) * 15;
      this.bat(ctx, x, y, b.size, time * 14 + b.phase);
    }

    // Parallax layers, back to front. Each scrolls slower the further away it
    // is: mountains 0.1x the camera, far hills 0.25x, near hills 0.5x, the
    // level itself 1x, and the foreground (drawn later) 1.35x.
    this.mountains(ctx, camX * 0.1);

    // Far hills with a haunted house, near hills with dead trees
    const farOffset = camX * 0.25;
    const houseX = 1250 - farOffset;
    if (houseX > -150 && houseX < VIEW_W + 150) {
      this.house(ctx, houseX, this.hillY(1250, 380, 50, 0.004) + 6, COLORS.hillFar);
    }
    this.hills(ctx, farOffset, COLORS.hillFar, 380, 50, 0.004);
    this.hillsWithTrees(ctx, camX * 0.5, COLORS.hillNear, 440, 40, 0.007);

    // Drifting fog
    ctx.fillStyle = COLORS.fog;
    for (let i = 0; i < 10; i++) {
      const x = ((i * 160 - camX * 0.6 + time * 12) % 1300 + 1300) % 1300 - 170;
      ctx.beginPath();
      ctx.ellipse(x, 470 + Math.sin(i * 1.7) * 20, 140, 26, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  moon(ctx, x, y, color) {
    const glow = ctx.createRadialGradient(x, y, 40, x, y, 140);
    glow.addColorStop(0, color + "59"); // "59" = about 35% opacity
    glow.addColorStop(1, color + "00");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 140, y - 140, 280, 280);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(180, 160, 120, 0.35)"; // craters
    for (const [cx, cy, r] of [[-15, -12, 10], [14, 8, 13], [-8, 20, 6], [20, -20, 5]]) {
      ctx.beginPath();
      ctx.arc(x + cx, y + cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  bat(ctx, x, y, s, flapPhase) {
    const flap = Math.sin(flapPhase) * 8 * s;
    ctx.fillStyle = "#0b0612";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 10 * s, y - 6 * s - flap, x - 22 * s, y - flap);
    ctx.quadraticCurveTo(x - 12 * s, y + 2 * s, x, y + 4 * s);
    ctx.quadraticCurveTo(x + 12 * s, y + 2 * s, x + 22 * s, y - flap);
    ctx.quadraticCurveTo(x + 10 * s, y - 6 * s - flap, x, y);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y + 1, 4 * s, 0, Math.PI * 2);
    ctx.fill();
  },

  // Jagged distant mountain range, faded into the sky
  mountains(ctx, offset) {
    ctx.fillStyle = "rgba(25, 12, 40, 0.55)";
    ctx.beginPath();
    ctx.moveTo(0, VIEW_H);
    const step = 70;
    const first = Math.floor(offset / step);
    for (let i = first; i <= first + Math.ceil(VIEW_W / step) + 1; i++) {
      const peak = i % 2 === 0;
      const y = peak ? 210 + hash(i) * 70 : 300 + hash(i) * 40;
      ctx.lineTo(i * step - offset, y);
    }
    ctx.lineTo(VIEW_W, VIEW_H);
    ctx.fill();
  },

  // Foreground silhouettes that pass in front of everything, moving faster
  // than the camera — the strongest depth cue in a side-scroller.
  foreground(ctx, camX, camY, level, time) {
    const offset = camX * 1.35;
    ctx.fillStyle = "rgba(4, 1, 8, 0.92)";
    // Grass clumps and fence posts along the bottom edge
    const spacing = 230;
    const first = Math.floor(offset / spacing) - 1;
    for (let i = first; i <= first + 6; i++) {
      const x = i * spacing + hash(i + 900) * 120 - offset;
      if (hash(i + 950) < 0.35) {
        // iron fence post with a spike on top
        ctx.fillRect(x, VIEW_H - 70, 7, 70);
        ctx.beginPath();
        ctx.moveTo(x - 3, VIEW_H - 70); ctx.lineTo(x + 3.5, VIEW_H - 84); ctx.lineTo(x + 10, VIEW_H - 70);
        ctx.fill();
        ctx.fillRect(x - 40, VIEW_H - 52, 90, 5);
      } else {
        // a clump of tall grass blades swaying in the wind
        ctx.beginPath();
        for (let k = 0; k < 7; k++) {
          const bx = x + k * 7;
          const h = 22 + hash(i * 7 + k) * 32;
          const sway = Math.sin(time * 1.6 + i + k * 0.4) * 5;
          ctx.moveTo(bx - 3, VIEW_H);
          ctx.quadraticCurveTo(bx + sway * 0.5, VIEW_H - h * 0.6, bx + sway, VIEW_H - h);
          ctx.quadraticCurveTo(bx + 1 + sway * 0.5, VIEW_H - h * 0.6, bx + 3, VIEW_H);
        }
        ctx.fill();
      }
    }
    // Branches hanging down from the top edge
    const tSpacing = 520;
    const tFirst = Math.floor(offset / tSpacing) - 1;
    ctx.strokeStyle = "rgba(4, 1, 8, 0.92)";
    ctx.lineCap = "round";
    for (let i = tFirst; i <= tFirst + 3; i++) {
      if (hash(i + 990) < 0.4) continue;
      const x = i * tSpacing + hash(i + 970) * 200 - offset;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(x - 80, -5);
      ctx.quadraticCurveTo(x, 30 + hash(i) * 20, x + 90, -5);
      ctx.stroke();
      ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) {           // dangling vines
        const vx = x - 40 + k * 28;
        const len = 25 + hash(i * 3 + k) * 45;
        const sway = Math.sin(time * 1.3 + k) * 4;
        ctx.beginPath();
        ctx.moveTo(vx, 14);
        ctx.quadraticCurveTo(vx + sway, 14 + len / 2, vx + sway * 1.5, 14 + len);
        ctx.stroke();
      }
    }
  },

  // Darken the edges of the screen and leave a pool of light around the
  // snake. This keeps the player the brightest, clearest thing on screen.
  lighting(ctx, px, py, dead) {
    const cx = dead ? VIEW_W / 2 : px;
    const cy = dead ? VIEW_H / 2 : py;
    const g = ctx.createRadialGradient(cx, cy, 120, cx, cy, 640);
    g.addColorStop(0, "rgba(5, 0, 15, 0)");
    g.addColorStop(1, "rgba(5, 0, 15, 0.6)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  },

  // Past attempts on this level: a dotted route and a skull where you died.
  // Older attempts are fainter.
  trails(ctx, attempts, camX, camY) {
    const n = attempts.length;
    attempts.forEach((a, i) => {
      const alpha = 0.15 + 0.35 * ((i + 1) / n);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#ff5d73";
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      a.path.forEach((pt, k) => {
        if (k === 0) ctx.moveTo(pt.x - camX, pt.y - camY);
        else ctx.lineTo(pt.x - camX, pt.y - camY);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      this.skull(ctx, a.death.x - camX, a.death.y - camY);
      ctx.restore();
    });
  },

  skull(ctx, x, y) {
    ctx.fillStyle = "#f1e9ff";
    ctx.beginPath();
    ctx.arc(x, y - 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 4, y + 3, 8, 5);
    ctx.fillStyle = "#1a1020";
    ctx.fillRect(x - 4, y - 4, 3, 3);
    ctx.fillRect(x + 1, y - 4, 3, 3);
    ctx.fillRect(x - 1, y + 4, 2, 4);
  },

  // Spirit flame: a violet fireball with a flickering tail.
  flame(ctx, f, camX, camY, time) {
    const x = f.x + f.w / 2 - camX;
    const y = f.y + f.h / 2 - camY;
    const dir = Math.sign(f.vx);
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 26);
    glow.addColorStop(0, "rgba(196, 181, 253, 0.8)");
    glow.addColorStop(1, "rgba(196, 181, 253, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 26, y - 26, 52, 52);
    ctx.fillStyle = "#a78bfa";
    ctx.beginPath();
    ctx.moveTo(x + dir * 9, y);
    ctx.quadraticCurveTo(x, y - 9, x - dir * (22 + Math.sin(time * 40) * 4), y + Math.sin(time * 30) * 3);
    ctx.quadraticCurveTo(x, y + 9, x + dir * 9, y);
    ctx.fill();
    ctx.fillStyle = "#f5f3ff";
    ctx.beginPath();
    ctx.arc(x + dir * 2, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  },

  // Pulsing ring that shows "you can bash this ghost right now".
  bashRing(ctx, g, camX, camY, time) {
    const x = g.x + g.w / 2 - camX;
    const y = g.y + g.h / 2 - camY;
    ctx.save();
    ctx.strokeStyle = "#a5f3fc";
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 12);
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -time * 30;
    ctx.beginPath();
    ctx.arc(x, y, 22 + Math.sin(time * 12) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },

  hillY(wx, baseY, amp, freq) {
    return baseY - Math.sin(wx * freq) * amp - Math.sin(wx * freq * 2.7) * amp * 0.4;
  },

  hills(ctx, offset, color, baseY, amp, freq) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, VIEW_H);
    for (let x = 0; x <= VIEW_W; x += 8) ctx.lineTo(x, this.hillY(x + offset, baseY, amp, freq));
    ctx.lineTo(VIEW_W, VIEW_H);
    ctx.fill();
  },

  hillsWithTrees(ctx, offset, color, baseY, amp, freq) {
    // A dead tree every ~450px of this layer
    const spacing = 450;
    const first = Math.floor(offset / spacing) - 1;
    for (let i = first; i <= first + 4; i++) {
      const wx = i * spacing + hash(i) * 200;
      const x = wx - offset;
      if (x < -120 || x > VIEW_W + 120) continue;
      this.tree(ctx, x, this.hillY(wx, baseY, amp, freq) + 4, 60 + hash(i + 50) * 40, i, color);
    }
    this.hills(ctx, offset, color, baseY, amp, freq);
  },

  // Recursive branching tree silhouette
  tree(ctx, x, y, height, seed, color) {
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    const branch = (bx, by, angle, len, width, depth) => {
      const ex = bx + Math.cos(angle) * len;
      const ey = by + Math.sin(angle) * len;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      if (depth === 0) return;
      const n = depth + seed;
      branch(ex, ey, angle - 0.4 - hash(n) * 0.4, len * 0.68, width * 0.65, depth - 1);
      branch(ex, ey, angle + 0.3 + hash(n + 9) * 0.4, len * 0.62, width * 0.65, depth - 1);
    };
    branch(x, y, -Math.PI / 2, height * 0.45, 8, 4);
  },

  house(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x - 50, y - 70, 100, 70);           // main house
    ctx.fillRect(x + 22, y - 120, 22, 60);           // tower
    ctx.beginPath();                                 // roofs
    ctx.moveTo(x - 60, y - 68); ctx.lineTo(x - 5, y - 115); ctx.lineTo(x + 50, y - 68);
    ctx.moveTo(x + 16, y - 118); ctx.lineTo(x + 33, y - 160); ctx.lineTo(x + 50, y - 118);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 200, 90, 0.75)";       // glowing windows
    ctx.fillRect(x - 35, y - 50, 12, 14);
    ctx.fillRect(x - 8, y - 82, 10, 12);
    ctx.fillRect(x + 28, y - 100, 9, 12);
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
        if (t === "#") this.ground(ctx, x, y, !level.isSolid(c, r - 1), c, level.tileAt(c, r - 1) === " ");
        else if (t === "B") this.stone(ctx, x, y, !level.isSolid(c, r - 1));
        else if (t === "-") this.plank(ctx, x, y);
        else if (t === "^") this.spikes(ctx, x, y);
      }
    }
  },

  ground(ctx, x, y, grassy, col, openAbove) {
    ctx.fillStyle = COLORS.dirt;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = COLORS.dirtDark;
    ctx.fillRect(x + 6, y + 14, 4, 4);
    ctx.fillRect(x + 20, y + 24, 5, 4);
    if (!grassy) return;
    // Decorations sit on some grassy tiles: tombstones and dead grass.
    if (openAbove) {
      const pick = hash(col);
      if (pick < 0.12) this.tombstone(ctx, x + 6 + hash(col + 1) * 8, y);
      else if (pick < 0.3) this.tuft(ctx, x + 4 + hash(col + 2) * 20, y);
    }
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(x, y, TILE, 8);
    ctx.fillStyle = COLORS.grassDark;
    ctx.fillRect(x, y + 8, TILE, 3);
    ctx.fillRect(x + 4, y + 11, 4, 3);
    ctx.fillRect(x + 22, y + 11, 4, 3);
  },

  tombstone(ctx, x, y) {
    ctx.fillStyle = "#4b4559";
    ctx.beginPath();
    ctx.moveTo(x, y + 2);
    ctx.lineTo(x, y - 14);
    ctx.arc(x + 7, y - 14, 7, Math.PI, 0);
    ctx.lineTo(x + 14, y + 2);
    ctx.fill();
    ctx.fillStyle = "#2f2a3a";
    ctx.fillRect(x + 6, y - 15, 2, 9);  // cross
    ctx.fillRect(x + 4, y - 12, 6, 2);
  },

  tuft(ctx, x, y) {
    ctx.strokeStyle = COLORS.grassDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const [dx, h] of [[0, 7], [3, 10], [6, 6]]) {
      ctx.moveTo(x + dx, y + 1);
      ctx.lineTo(x + dx + 2, y - h);
    }
    ctx.stroke();
  },

  // Crypt stone blocks (the "B" tiles)
  stone(ctx, x, y, topExposed) {
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = COLORS.stone;
    ctx.fillRect(x + 1, y + 1, 14, 14);
    ctx.fillRect(x + 17, y + 1, 14, 14);
    ctx.fillRect(x + 1, y + 17, 6, 14);
    ctx.fillRect(x + 9, y + 17, 14, 14);
    ctx.fillRect(x + 25, y + 17, 6, 14);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x + 1, y + 1, 14, 2);
    ctx.fillRect(x + 17, y + 1, 14, 2);
    if (topExposed) {
      ctx.fillStyle = COLORS.moss;
      ctx.fillRect(x, y, TILE, 3);
      ctx.fillRect(x + 5, y + 3, 6, 3);
      ctx.fillRect(x + 20, y + 3, 4, 5);
    }
  },

  plank(ctx, x, y) {
    ctx.fillStyle = COLORS.plankDark;
    ctx.fillRect(x, y, TILE, 12);
    ctx.fillStyle = COLORS.plank;
    ctx.fillRect(x, y, TILE, 8);
    ctx.fillStyle = COLORS.plankDark;
    ctx.fillRect(x + 10, y + 2, 2, 4);  // nail holes / wood grain
    ctx.fillRect(x + 4, y + 12, 3, 8);
    ctx.fillRect(x + TILE - 7, y + 12, 3, 8);
  },

  spikes(ctx, x, y) {
    // A faint red glow behind every spike so hazards read instantly.
    const glow = ctx.createLinearGradient(0, y + TILE, 0, y);
    glow.addColorStop(0, "rgba(255, 70, 90, 0.35)");
    glow.addColorStop(1, "rgba(255, 70, 90, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x, y - 4, TILE, TILE + 4);
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

  // ---- The snake ----
  // The body is a chain of circles drawn on the rope points in player.body
  // (see Player.updateBody). A sine wave on top makes it wiggle as it slithers.
  player(ctx, p, camX, camY, time) {
    if (p.dead) return;

    const wiggle = Math.min(1, Math.abs(p.vx) / 150) * 2.5;
    const segs = p.body.slice(1).map((pt, i) => {
      const r = 7.5 - i * 0.38;
      return {
        x: pt.x - camX,
        y: pt.y - camY - r + Math.sin(p.slither * 0.08 - i * 0.9) * wiggle,
        r,
      };
    });

    // Head rears up above the front of the body, cobra style.
    const hx = p.x + p.w / 2 - camX + p.facing * 2;
    const hy = p.y + p.h - camY - 16;
    // Soft rim light behind the head so the snake stands out from the dark
    // background; it brightens while you hold the spell key to heal.
    const halo = ctx.createRadialGradient(hx, hy, 4, hx, hy, 42 + p.glow * 30);
    halo.addColorStop(0, `rgba(170, 255, 150, ${0.18 + p.glow * 0.5})`);
    halo.addColorStop(1, "rgba(170, 255, 150, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(hx - 80, hy - 80, 160, 160);

    // Neck: a few circles from the head down to the first body segment.
    if (segs.length) {
      const s0 = segs[0];
      for (let k = 3; k >= 1; k--) {
        const t = k / 4;
        segs.unshift({ x: hx + (s0.x - hx) * t, y: hy + 4 + (s0.y - hy - 4) * t, r: 7.5 });
      }
    }

    // Outline pass, then colour pass (tail first so the head ends up on top).
    for (let pass = 0; pass < 2; pass++) {
      for (let i = segs.length - 1; i >= 0; i--) {
        const s = segs[i];
        ctx.fillStyle = pass === 0 ? COLORS.snakeDark : (i % 3 === 0 ? COLORS.snakeBand : COLORS.snake);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r + (pass === 0 ? 1.5 : 0), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Head (with squash & stretch, tilted up when rising and down when falling)
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(Math.max(-0.35, Math.min(0.35, p.vy / 1500)) * p.facing);
    ctx.scale(p.facing * p.scaleX, p.scaleY);   // flip to face left/right

    // Forked tongue flicks out every couple of seconds
    if (time % 2.2 < 0.25) {
      const out = Math.sin((time % 2.2) / 0.25 * Math.PI) * 9;
      ctx.strokeStyle = "#e0314b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, 3);
      ctx.lineTo(10 + out, 3);
      ctx.lineTo(13 + out, 0);
      ctx.moveTo(10 + out, 3);
      ctx.lineTo(13 + out, 6);
      ctx.stroke();
    }

    ctx.fillStyle = COLORS.snakeDark;
    ctx.beginPath();
    ctx.ellipse(1, 0, 13.5, 10.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.snake;
    ctx.beginPath();
    ctx.ellipse(1, 0, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.snakeBand;
    ctx.beginPath();
    ctx.ellipse(-3, -4, 5, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eye with a slit pupil; blinks every few seconds
    const blinking = time % 3.4 < 0.12;
    if (blinking) {
      ctx.fillStyle = COLORS.snakeDark;
      ctx.fillRect(1, -3, 9, 2);
    } else {
      ctx.fillStyle = COLORS.snakeEye;
      ctx.beginPath();
      ctx.arc(5, -3, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.ellipse(6.5, -3, 1.4, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = COLORS.snakeDark;   // nostril and smile
    ctx.fillRect(11, -2, 2, 2);
    ctx.fillRect(4, 4, 7, 1.5);
    ctx.restore();
  },

  // ---- Pumpkin enemy ----
  walker(ctx, e, camX, camY, time) {
    const cx = e.x + e.w / 2 - camX;
    const bottom = e.y + e.h - camY;
    if (!e.alive) {
      // Smashed pumpkin that fades away
      ctx.globalAlpha = Math.max(0, e.squashTimer / ENEMY.squashTime);
      ctx.fillStyle = COLORS.pumpkinDark;
      ctx.beginPath();
      ctx.ellipse(cx, bottom - 3, 18, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.pumpkin;
      ctx.beginPath();
      ctx.ellipse(cx, bottom - 4, 13, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }

    // Waddle: a little hop and a side-to-side rock while walking.
    const hop = Math.abs(Math.sin(e.animTime * 8)) * 3;
    const rock = Math.sin(e.animTime * 8) * 0.12;
    const d = e.dir || -1;

    ctx.fillStyle = "rgba(0,0,0,0.3)";      // shadow
    ctx.beginPath();
    ctx.ellipse(cx, bottom - 1, 12 - hop, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, bottom - hop);
    ctx.rotate(rock);

    ctx.fillStyle = "#1a1020";               // little legs
    ctx.fillRect(-8 + Math.sin(e.animTime * 8) * 2, -4, 5, 4);
    ctx.fillRect(3 - Math.sin(e.animTime * 8) * 2, -4, 5, 4);

    ctx.fillStyle = COLORS.pumpkinDark;      // body: three overlapping lobes
    for (const [ox, rx] of [[-6, 9], [6, 9], [0, 10]]) {
      ctx.beginPath();
      ctx.ellipse(ox, -12, rx, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = COLORS.pumpkin;
    for (const [ox, rx] of [[-6, 8], [6, 8], [0, 8]]) {
      ctx.beginPath();
      ctx.ellipse(ox, -12, rx, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#4f6b32";               // stem
    ctx.fillRect(-2, -25, 4, 5);

    // Glowing carved face that flickers like a candle inside
    const flicker = 0.75 + 0.25 * Math.sin(time * 17 + e.x) * Math.sin(time * 7);
    ctx.fillStyle = COLORS.pumpkinGlow;
    ctx.globalAlpha = flicker;
    ctx.beginPath();
    ctx.moveTo(-7 + d * 2, -17); ctx.lineTo(-3 + d * 2, -17); ctx.lineTo(-5 + d * 2, -13);  // eyes
    ctx.moveTo(3 + d * 2, -17); ctx.lineTo(7 + d * 2, -17); ctx.lineTo(5 + d * 2, -13);
    ctx.fill();
    ctx.beginPath();                          // jagged mouth
    ctx.moveTo(-7 + d, -9);
    ctx.lineTo(-4 + d, -7); ctx.lineTo(-2 + d, -9); ctx.lineTo(1 + d, -7);
    ctx.lineTo(3 + d, -9); ctx.lineTo(7 + d, -9); ctx.lineTo(4 + d, -5); ctx.lineTo(-4 + d, -5);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  // ---- Ghost enemy ----
  ghost(ctx, g, camX, camY, time) {
    const x = g.x + g.w / 2 - camX;
    const y = g.y - camY;
    const fade = g.alive ? 1 : Math.max(0, g.squashTimer / ENEMY.squashTime);
    const flicker = 0.8 + 0.1 * Math.sin(time * 9 + g.homeX);

    ctx.save();
    ctx.globalAlpha = fade * flicker;
    ctx.translate(x, y);
    ctx.scale(g.dir, 1);

    // Soft glow
    const glow = ctx.createRadialGradient(0, 12, 4, 0, 12, 26);
    glow.addColorStop(0, "rgba(220, 235, 255, 0.35)");
    glow.addColorStop(1, "rgba(220, 235, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(-26, -14, 52, 52);

    // Body: round head, wavy bottom edge that ripples over time
    ctx.fillStyle = "#eef4ff";
    ctx.beginPath();
    ctx.arc(0, 11, 12, Math.PI, 0);
    ctx.lineTo(12, 22);
    for (let i = 0; i <= 4; i++) {
      const wx = 12 - i * 6;
      ctx.lineTo(wx, 22 + Math.sin(time * 8 + i * 1.8) * 3 + (i % 2 ? 2 : 0));
    }
    ctx.closePath();
    ctx.fill();

    // Face: hollow eyes and an "oooo" mouth; squinting when defeated
    ctx.fillStyle = "#1a1020";
    if (g.alive) {
      ctx.beginPath();
      ctx.ellipse(1, 9, 2.4, 3.4, 0, 0, Math.PI * 2);
      ctx.ellipse(8, 9, 2.4, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(5, 16, 2, 2.6 + Math.sin(time * 4) * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-1, 9, 5, 2);
      ctx.fillRect(6, 9, 5, 2);
    }
    ctx.restore();
  },

  // ---- Candy corn (the "coins") ----
  coin(ctx, c, camX, camY, time) {
    const bob = Math.sin(time * 3 + c.phase) * 3;
    const spin = Math.cos(time * 3 + c.phase);   // -1..1 squashes the width = fake 3D spin
    const cx = c.x + c.w / 2 - camX;
    const cy = c.y + c.h / 2 - camY + bob;

    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 16);
    glow.addColorStop(0, "rgba(255, 170, 60, 0.35)");
    glow.addColorStop(1, "rgba(255, 170, 60, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 16, cy - 16, 32, 32);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(Math.max(0.15, Math.abs(spin)), 1);
    ctx.beginPath();                          // rounded-bottom triangle
    ctx.moveTo(0, -10);
    ctx.lineTo(8, 7);
    ctx.quadraticCurveTo(0, 11, -8, 7);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = COLORS.candyBase;
    ctx.fillRect(-9, 2, 18, 10);
    ctx.fillStyle = COLORS.candyMid;
    ctx.fillRect(-9, -4, 18, 6);
    ctx.fillStyle = COLORS.candyTip;
    ctx.fillRect(-9, -11, 18, 7);
    ctx.restore();
    ctx.restore();
  },

  spring(ctx, s, camX, camY) {
    const x = Math.round(s.x - camX);
    const bottom = Math.round(s.y + s.h - camY);
    const height = 16 - s.compress * 9;
    ctx.fillStyle = "#3d374b";
    ctx.fillRect(x + 2, bottom - 4, s.w - 4, 4);
    ctx.strokeStyle = "#9aa3ad";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const yy = bottom - 4 - (height - 8) * (i / 4);
      ctx.lineTo(x + (i % 2 ? s.w - 6 : 6), yy);
    }
    ctx.stroke();
    ctx.fillStyle = "#a855f7";
    ctx.fillRect(x, bottom - height - 4, s.w, 6);
  },

  // ---- Checkpoint: a lantern on a post that lights up ----
  checkpoint(ctx, cp, camX, camY, time) {
    const x = Math.round(cp.x + TILE / 2 - camX);
    const top = Math.round(cp.y - camY);
    const bottom = Math.round(cp.y + cp.h - camY);
    ctx.fillStyle = COLORS.plankDark;
    ctx.fillRect(x - 3, top + 6, 6, bottom - top - 6);
    ctx.fillRect(x - 3, top + 6, 16, 4);       // arm
    ctx.fillStyle = "#1a1020";
    ctx.fillRect(x + 10, top + 10, 2, 5);      // hook

    const lx = x + 11, ly = top + 24;
    if (cp.active) {
      const flick = 1 + Math.sin(time * 13) * 0.08 + Math.sin(time * 29) * 0.05;
      const glow = ctx.createRadialGradient(lx, ly, 2, lx, ly, 46 * flick);
      glow.addColorStop(0, "rgba(255, 184, 77, 0.55)");
      glow.addColorStop(1, "rgba(255, 184, 77, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(lx - 50, ly - 50, 100, 100);
    }
    ctx.fillStyle = "#1a1020";                 // frame
    ctx.fillRect(lx - 7, ly - 9, 14, 18);
    ctx.fillStyle = cp.active ? COLORS.lantern : "#3a3346";
    ctx.fillRect(lx - 5, ly - 7, 10, 14);
    if (cp.active) {                           // flame
      ctx.fillStyle = "#fff3c4";
      ctx.beginPath();
      ctx.ellipse(lx, ly + 1, 2.5, 4 + Math.sin(time * 20), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  // ---- Goal: tattered flag with a glowing orb on top ----
  flag(ctx, f, camX, camY, time) {
    const x = Math.round(f.x + f.w / 2 - camX);
    const top = Math.round(f.y - camY);
    const bottom = Math.round(f.y + f.h - camY);
    ctx.fillStyle = "#2a1f33";
    ctx.fillRect(x - 3, top, 6, bottom - top);

    const pulse = 0.6 + 0.4 * Math.sin(time * 4);
    const glow = ctx.createRadialGradient(x, top, 2, x, top, 26);
    glow.addColorStop(0, `rgba(168, 85, 247, ${0.7 * pulse})`);
    glow.addColorStop(1, "rgba(168, 85, 247, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 26, top - 26, 52, 52);
    ctx.fillStyle = "#e9d5ff";
    ctx.beginPath();
    ctx.arc(x, top, 6, 0, Math.PI * 2);
    ctx.fill();

    // Waving orange-and-black checkered flag
    const cols = 5, rows = 3, cw = 9, ch = 9;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const wave = Math.sin(time * 5 - i * 0.8) * 3 * (i / cols);
        ctx.fillStyle = (i + j) % 2 ? "#111" : COLORS.accent;
        ctx.fillRect(x + 3 + i * cw, top + 8 + j * ch + wave, cw, ch);
      }
    }
  },

  // ---- HUD & screens ----
  hud(ctx, game) {
    ctx.fillStyle = "rgba(10, 5, 20, 0.55)";
    this.roundRect(ctx, 10, 10, 580, 40, 10);
    ctx.fill();
    ctx.font = "bold 20px 'Trebuchet MS', sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    // Candy icon + count
    this.coin(ctx, { x: 24, y: 22, w: 16, h: 16, phase: 0 }, 0, 0, 0);
    ctx.fillStyle = COLORS.hud;
    ctx.fillText(`${game.coins}/${game.totalCoins}`, 46, 31);

    // Lives as little hearts
    for (let i = 0; i < game.lives; i++) this.heart(ctx, 132 + i * 22, 30, COLORS.accent);

    ctx.fillStyle = COLORS.hud;
    ctx.fillText(`${String(game.score).padStart(6, "0")}`, 250, 31);
    ctx.fillText(`⏱ ${formatTime(game.time)}`, 345, 31);
    ctx.fillStyle = COLORS.accent;
    ctx.fillText(`LV ${game.levelIndex + 1}`, 440, 31);
    this.soulOrb(ctx, 530, 30, game.soul / SOUL.max, game.clock);
    if (!Input.touchMode) {
      ctx.font = "bold 14px 'Trebuchet MS', sans-serif";
      ctx.fillStyle = "#c4b5fd";
      ctx.fillText("X", 552, 31);
    }
  },

  // Soul orb: fills from the bottom; glows and pulses when full.
  soulOrb(ctx, x, y, fill, time) {
    const r = 13;
    if (fill >= 1) {
      const g = ctx.createRadialGradient(x, y, r, x, y, r + 12);
      g.addColorStop(0, `rgba(167, 139, 250, ${0.5 + 0.3 * Math.sin(time * 6)})`);
      g.addColorStop(1, "rgba(167, 139, 250, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r - 12, y - r - 12, (r + 12) * 2, (r + 12) * 2);
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#1c1430";
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = "#a78bfa";
    const h = r * 2 * fill;
    ctx.fillRect(x - r, y + r - h, r * 2, h);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(x - r, y + r - h, r * 2, Math.min(2, h));
    ctx.restore();
    ctx.strokeStyle = "#e9d5ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
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
  // The title's letters bob up and down in a wave.
  // (On touchscreens the bottom of the screen has buttons over it, so the
  // text is moved up a little.)
  screen(ctx, title, lines, { titleColor = COLORS.accent, dim = 0.55, time = 0 } = {}) {
    ctx.fillStyle = `rgba(8, 3, 16, ${dim})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textBaseline = "middle";

    const top = Input.touchMode ? 120 : 170;
    ctx.font = "bold 64px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "left";
    const width = ctx.measureText(title).width;
    let x = VIEW_W / 2 - width / 2;
    [...title].forEach((ch, i) => {
      const y = top + Math.sin(time * 3 - i * 0.45) * 6;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillText(ch, x + 4, y + 4);
      ctx.fillStyle = titleColor;
      ctx.fillText(ch, x, y);
      x += ctx.measureText(ch).width;
    });

    ctx.textAlign = "center";
    ctx.font = "22px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "#fff";
    lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, top + 90 + i * 36));
  },

  // "LEVEL 2 / Graveyard Crypt" banner that slides in and fades out.
  levelIntro(ctx, number, name, tip, t) {
    // t goes from 1 (just started) to 0 (finished)
    const alpha = Math.min(1, t * 4, (1 - t) * 6);
    const slide = (1 - Math.min(1, (1 - t) * 6)) * -40;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = "rgba(8, 3, 16, 0.6)";
    ctx.fillRect(0, 150 + slide, VIEW_W, 140);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 22px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = COLORS.accent;
    ctx.fillText(`LEVEL ${number}`, VIEW_W / 2, 178 + slide);
    ctx.font = "bold 44px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(name, VIEW_W / 2, 222 + slide);
    ctx.font = "18px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "#c4b5fd";
    ctx.fillText(tip, VIEW_W / 2, 266 + slide);
    ctx.restore();
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
