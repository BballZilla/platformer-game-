// ---------------------------------------------------------------------------
// game.js — the game itself: state machine, interactions, camera, main loop.
//
// States:  title -> playing <-> paused
//                   playing -> dying -> playing (respawn) or gameover
//                   playing -> won
// ---------------------------------------------------------------------------

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.state = "title";
    this.time = 0;          // level timer (only runs while playing)
    this.clock = 0;         // always-running clock for animations
    this.bestScore = loadBestScore();
    this.reset();
  }

  // Build a fresh copy of the level and everything in it.
  reset() {
    this.level = new Level(LEVEL_MAP);
    const s = this.level.spawns;
    const start = spawnOnTile(s.player, PLAYER.width, PLAYER.height);

    this.startPoint = start;
    this.respawnPoint = start;
    this.player = new Player(start.x, start.y);
    this.enemies = s.enemies.map((sp) => new Walker(sp));
    this.coinList = s.coins.map((sp) => new Coin(sp));
    this.springs = s.springs.map((sp) => new Spring(sp));
    this.checkpoints = s.checkpoints.map((sp) => new Checkpoint(sp));
    this.flag = new Flag(s.flag);
    this.particles = new Particles();

    this.totalCoins = this.coinList.length;
    this.coins = 0;
    this.score = 0;
    this.lives = GAME.startLives;
    this.time = 0;
    this.deathTimer = 0;
    this.shake = 0;
    this.fade = 0;          // 0..1 black overlay used when dying / respawning
    this.result = null;

    this.camX = 0;
    this.camY = this.level.height - VIEW_H;
    this.snapCamera();
  }

  // ---- Update ---------------------------------------------------------------

  update(dt) {
    this.clock += dt;
    if (Input.pressed("mute")) Sound.toggleMute();

    switch (this.state) {
      case "title":
        if (Input.pressed("start")) {
          Sound.select();
          this.state = "playing";
        }
        break;

      case "paused":
        if (Input.pressed("pause")) this.state = "playing";
        break;

      case "gameover":
      case "won":
        this.particles.update(dt);
        if (Input.pressed("start") && this.clock - this.endedAt > 0.5) {
          Sound.select();
          this.reset();
          this.state = "playing";
        }
        break;

      case "dying":
        this.deathTimer -= dt;
        this.particles.update(dt);
        this.updateEnemies(dt);
        if (this.deathTimer <= 0) this.afterDeath();
        break;

      case "playing":
        if (Input.pressed("pause")) {
          this.state = "paused";
          break;
        }
        this.time += dt;
        this.player.update(dt, this.level, this.particles);
        this.updateEnemies(dt);
        this.handleInteractions();
        this.particles.update(dt);
        break;
    }

    this.shake = Math.max(0, this.shake - dt);
    // Fade to black at the end of a death, then fade back in after respawning.
    if (this.state === "dying" && this.deathTimer < 0.4 && this.lives > 1) {
      this.fade = 1 - this.deathTimer / 0.4;
    } else {
      this.fade = Math.max(0, this.fade - 3 * dt);
    }
    this.updateCamera(dt);
  }

  updateEnemies(dt) {
    for (const e of this.enemies) e.update(dt, this.level);
    this.enemies = this.enemies.filter((e) => !e.removable);
  }

  // Everything the player can touch: coins, enemies, springs, hazards, goal.
  handleInteractions() {
    const p = this.player;

    for (const coin of this.coinList) {
      if (!coin.collected && overlaps(p, coin)) {
        coin.collected = true;
        this.coins++;
        this.score += GAME.coinScore;
        Sound.coin();
        this.particles.burst(coin.x + 8, coin.y + 8, 10, { color: [COLORS.candyBase, COLORS.candyMid, "#fff"], speed: 140, gravity: 200, life: 0.4, size: 3 });
      }
    }

    for (const e of this.enemies) {
      if (!e.alive || !overlaps(p, e)) continue;
      // It's a stomp if we're falling and our feet were above the enemy's
      // top last step. Otherwise, the enemy got us.
      const stomp = p.vy > 0 && p.prevBottom <= e.y + 8;
      if (stomp) {
        e.squash();
        p.bounce();
        this.score += GAME.stompScore;
        Sound.stomp();
        this.particles.burst(e.x + e.w / 2, e.y + e.h, 12, { color: [COLORS.pumpkin, COLORS.pumpkinDark, COLORS.pumpkinGlow], speed: 180, life: 0.5, size: 5 });
      } else {
        this.killPlayer();
        return;
      }
    }

    for (const s of this.springs) {
      if (p.vy >= 0 && overlaps(p, s)) {
        p.launch();
        s.compress = 1;
        Sound.spring();
      }
      s.compress = Math.max(0, s.compress - 4 * STEP);
    }

    for (const cp of this.checkpoints) {
      if (!cp.active && overlaps(p, cp)) {
        cp.active = true;
        this.respawnPoint = cp.respawnPoint;
        Sound.checkpoint();
        this.particles.burst(cp.x + TILE / 2, cp.y + 10, 16, { color: [COLORS.lantern, "#fff3c4"], speed: 150, life: 0.6 });
      }
    }

    if (this.level.touchesSpike(p) || p.y > this.level.height + 64) {
      this.killPlayer();
      return;
    }

    if (overlaps(p, this.flag)) this.win();
  }

  killPlayer() {
    const p = this.player;
    p.dead = true;
    this.state = "dying";
    this.deathTimer = GAME.respawnDelay;
    this.shake = 0.3;
    Sound.die();
    this.particles.burst(p.x + p.w / 2, Math.min(p.y + p.h / 2, this.level.height), 24, { color: [COLORS.snake, COLORS.snakeBand, COLORS.snakeDark], speed: 260, life: 0.8, size: 5 });
  }

  afterDeath() {
    this.lives--;
    if (this.lives <= 0) {
      this.endGame("gameover");
    } else {
      this.player.respawn(this.respawnPoint.x, this.respawnPoint.y);
      this.state = "playing";
    }
  }

  win() {
    // Bonuses for finishing quickly and with lives to spare.
    const timeBonus = Math.max(0, Math.floor(GAME.timeBonusPar - this.time)) * GAME.timeBonusPerSecond;
    const lifeBonus = this.lives * GAME.lifeBonus;
    this.result = { base: this.score, timeBonus, lifeBonus };
    this.score += timeBonus + lifeBonus;
    Sound.win();
    for (let i = 0; i < 4; i++) {
      this.particles.burst(this.flag.x, this.flag.y + i * 30, 20, { color: [COLORS.accent, COLORS.candyBase, "#a855f7", COLORS.snake, "#fff"], speed: 320, life: 1.4, gravity: 300, size: 5 });
    }
    this.endGame("won");
  }

  endGame(state) {
    this.state = state;
    this.endedAt = this.clock;
    this.newBest = this.score > this.bestScore;
    if (this.newBest) {
      this.bestScore = this.score;
      saveBestScore(this.score);
    }
  }

  // ---- Camera ---------------------------------------------------------------
  // Follows the player smoothly, looks a little ahead in the facing direction,
  // and never shows anything below or beside the level.

  cameraTarget() {
    const p = this.player;
    return {
      x: p.x + p.w / 2 - VIEW_W / 2 + p.facing * 60,
      y: p.y - 150, // only scroll up once the player is near the top of the screen
    };
  }

  clampCamera() {
    this.camX = Math.max(0, Math.min(this.camX, this.level.width - VIEW_W));
    this.camY = Math.max(-VIEW_H, Math.min(this.camY, this.level.height - VIEW_H));
  }

  snapCamera() {
    const t = this.cameraTarget();
    this.camX = t.x;
    this.camY = t.y;
    this.clampCamera();
  }

  updateCamera(dt) {
    if (this.state !== "playing") return;
    const t = this.cameraTarget();
    this.camX += (t.x - this.camX) * Math.min(1, 6 * dt);
    this.camY += (t.y - this.camY) * Math.min(1, 4 * dt);
    this.clampCamera();
  }

  // ---- Draw -----------------------------------------------------------------

  draw() {
    const ctx = this.ctx;
    let camX = this.camX;
    let camY = this.camY;
    if (this.shake > 0) {
      camX += (Math.random() - 0.5) * 12 * this.shake / 0.3;
      camY += (Math.random() - 0.5) * 12 * this.shake / 0.3;
    }
    camX = Math.round(camX);
    camY = Math.round(camY);
    const t = this.clock;

    Render.background(ctx, camX, t);
    Render.tiles(ctx, this.level, camX, camY);
    for (const cp of this.checkpoints) Render.checkpoint(ctx, cp, camX, camY, t);
    Render.flag(ctx, this.flag, camX, camY, t);
    for (const s of this.springs) Render.spring(ctx, s, camX, camY);
    for (const c of this.coinList) if (!c.collected) Render.coin(ctx, c, camX, camY, t);
    for (const e of this.enemies) Render.walker(ctx, e, camX, camY, t);
    Render.player(ctx, this.player, camX, camY, t);

    ctx.save();
    ctx.translate(-camX, -camY);
    this.particles.draw(ctx);
    ctx.restore();

    if (this.fade > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.fade})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (this.state !== "title") Render.hud(ctx, this);
    this.drawScreens(ctx);
  }

  drawScreens(ctx) {
    const best = `Best score: ${this.bestScore}`;
    const touch = Input.touchMode;
    switch (this.state) {
      case "title":
        Render.screen(ctx, "SPOOKY SLITHER", [
          "Slither through the haunted hills! Grab candy corn,",
          "squash pumpkins and reach the flag.",
          touch
            ? "◀ ▶ to move   ·   JUMP to jump   ·   ▼ to drop through planks"
            : "← → to move   ·   Space to jump   ·   ↓ to drop through planks",
          blink(this.clock) ? (touch ? "Tap the screen to start" : "Press ENTER or click to start") : "",
          best,
        ], { dim: 0.45, time: this.clock });
        break;
      case "paused":
        Render.screen(ctx, "PAUSED", touch
          ? ["Tap ❚❚ to resume", "♪ to mute / unmute"]
          : ["Press P or Esc to resume", "M to mute / unmute"], { time: this.clock });
        break;
      case "gameover":
        Render.screen(ctx, "GAME OVER", [
          `Score: ${this.score}   ·   Candy: ${this.coins}/${this.totalCoins}`,
          this.newBest ? "New best score!" : best,
          "",
          blink(this.clock) ? touch ? "Tap the screen to try again" : "Press ENTER or click to try again" : "",
        ], { titleColor: "#c084fc", time: this.clock });
        break;
      case "won": {
        const r = this.result;
        Render.screen(ctx, "LEVEL CLEAR!", [
          `Candy: ${this.coins}/${this.totalCoins}   ·   Time: ${formatTime(this.time)}`,
          `Score ${r.base}  +  time bonus ${r.timeBonus}  +  lives bonus ${r.lifeBonus}`,
          `Final score: ${this.score}` + (this.newBest ? "   — New best!" : ""),
          "",
          blink(this.clock) ? touch ? "Tap the screen to play again" : "Press ENTER or click to play again" : "",
        ], { titleColor: COLORS.candyBase, dim: 0.45, time: this.clock });
        break;
      }
    }
  }
}

function blink(t) {
  return Math.floor(t * 2) % 2 === 0;
}

// Best score persists between visits (if the browser allows storage).
function loadBestScore() {
  try {
    return Number(localStorage.getItem("skyHopperBest")) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    localStorage.setItem("skyHopperBest", String(score));
  } catch {
    // Storage blocked (private mode etc.) — not important.
  }
}

// ---------------------------------------------------------------------------
// Main loop with a fixed timestep.
// The screen may refresh at 60, 120 or 144 Hz, but physics always advances in
// steps of exactly STEP seconds, so the game plays the same on every machine.
// ---------------------------------------------------------------------------
document.getElementById("load-error")?.remove();
const canvas = document.getElementById("game");
const game = new Game(canvas);
Input.init();
Touch.init();

// Audio may only start inside a real key press or tap, so unlock it here.
for (const type of ["keydown", "pointerdown"]) {
  window.addEventListener(type, () => Sound.init());
}

// Clicking the game counts as pressing Enter (start / restart). It also gives
// the page keyboard focus, which matters when the game is embedded in a frame.
canvas.addEventListener("pointerdown", () => {
  window.focus();
  Input.justPressed.add("Enter");
});

let lastTime = performance.now();
let accumulator = 0;

function frame(now) {
  // Cap the frame time so switching tabs doesn't cause a huge catch-up jump.
  accumulator += Math.min((now - lastTime) / 1000, 0.25);
  lastTime = now;

  while (accumulator >= STEP) {
    game.update(STEP);
    Input.endStep();
    accumulator -= STEP;
  }
  game.draw();
  requestAnimationFrame(frame);
}

// Pause automatically if the player switches away mid-game.
document.addEventListener("visibilitychange", () => {
  if (document.hidden && game.state === "playing") game.state = "paused";
});

requestAnimationFrame(frame);
