// ---------------------------------------------------------------------------
// entities.js — everything that moves or can be touched.
//
// Each entity has a hitbox {x, y, w, h} (top-left corner + size) and an
// update(dt, ...) method. Drawing lives in render.js to keep logic and
// visuals separate.
// ---------------------------------------------------------------------------

// Helper: place a box of size w x h standing on the floor of tile (col, row).
function spawnOnTile(spawn, w, h) {
  return { x: spawn.col * TILE + (TILE - w) / 2, y: (spawn.row + 1) * TILE - h };
}

// ===========================================================================
// Player
// ===========================================================================
class Player {
  constructor(x, y) {
    this.w = PLAYER.width;
    this.h = PLAYER.height;
    this.respawn(x, y);
  }

  respawn(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.dead = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.jumpCutDone = true;
    this.dropTimer = 0;
    this.dropThrough = false;
    this.scaleX = 1;        // squash & stretch (visual only)
    this.scaleY = 1;
    this.prevBottom = y + this.h;
    this.slither = 0;       // grows as the snake moves; drives the wiggle
    this.boostTimer = 0;    // after a ghost bash, speed may exceed maxSpeed
    this.glow = 0;          // 0..1 healing glow (visual only)

    // The snake's body is a chain of points (like a rope). Each point is
    // pulled along by the one in front and falls with gravity, so the body
    // trails behind on the ground and dangles while jumping. Start stretched
    // out behind the head.
    this.body = [];
    for (let i = 0; i < PLAYER.bodySegments; i++) {
      const bx = x + this.w / 2 - i * PLAYER.bodySpacing;
      const by = y + this.h;
      this.body.push({ x: bx, y: by, px: bx, py: by });
    }
  }

  update(dt, level, particles) {
    this.prevBottom = this.y + this.h;
    this.justJumped = false;

    // --- Horizontal movement: accelerate toward input, otherwise slow down.
    const dir = (Input.held("right") ? 1 : 0) - (Input.held("left") ? 1 : 0);
    if (dir !== 0) {
      const accel = this.onGround ? PLAYER.runAccel : PLAYER.airAccel;
      // Turning around is snappier: add friction when pushing against velocity.
      const turning = Math.sign(this.vx) === -dir ? PLAYER.friction : 0;
      this.vx += dir * (accel + turning) * dt;
      this.facing = dir;
    } else {
      const decel = (this.onGround ? PLAYER.friction : PLAYER.airDrag) * dt;
      this.vx = Math.abs(this.vx) <= decel ? 0 : this.vx - Math.sign(this.vx) * decel;
    }
    // Normally speed is capped; right after a bash the launch speed is kept
    // briefly and then eases back down, which is what gives the bash momentum.
    this.boostTimer -= dt;
    const limit = this.boostTimer > 0 ? BASH.speedSide : PLAYER.maxSpeed;
    if (Math.abs(this.vx) > limit) this.vx = Math.sign(this.vx) * Math.max(limit, Math.abs(this.vx) - 1500 * dt);

    // --- Jump timers (coyote time + jump buffering make jumping feel fair).
    this.coyoteTimer = this.onGround ? PLAYER.coyoteTime : this.coyoteTimer - dt;
    this.jumpBufferTimer = Input.pressed("jump") ? PLAYER.jumpBuffer : this.jumpBufferTimer - dt;

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.vy = -PLAYER.jumpSpeed;
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.jumpCutDone = false;
      this.justJumped = true;
      this.scaleX = 0.7;
      this.scaleY = 1.3;
      Sound.jump();
      particles.burst(this.x + this.w / 2, this.y + this.h, 6, { color: COLORS.dust, speed: 80, angle: -Math.PI / 2, spread: Math.PI, gravity: 200, life: 0.3 });
    }

    // Variable jump height: letting go of jump early cuts the jump short.
    if (!this.jumpCutDone && !Input.held("jump") && this.vy < 0) {
      this.vy *= PLAYER.jumpCut;
      this.jumpCutDone = true;
    }

    // --- Drop through one-way platforms.
    if (Input.pressed("down") && this.onGround && level.onlyOneWayBelow(this)) {
      this.dropTimer = PLAYER.dropThroughTime;
    }
    this.dropTimer -= dt;
    this.dropThrough = this.dropTimer > 0;

    // --- Gravity, then move & collide one axis at a time.
    this.vy = Math.min(this.vy + PLAYER.gravity * dt, PLAYER.maxFall);
    const wasOnGround = this.onGround;
    const landingSpeed = this.vy;
    level.moveX(this, this.vx * dt);
    level.moveY(this, this.vy * dt);

    if (this.onGround && !wasOnGround) {
      // Squash on landing, harder landings squash more.
      const impact = Math.min(landingSpeed / PLAYER.maxFall, 1);
      this.scaleX = 1 + 0.35 * impact;
      this.scaleY = 1 - 0.3 * impact;
      if (impact > 0.4) {
        particles.burst(this.x + this.w / 2, this.y + this.h, 8, { color: COLORS.dust, speed: 100, angle: -Math.PI / 2, spread: Math.PI, gravity: 300, life: 0.35 });
      }
    }

    // Ease squash & stretch back to normal.
    this.scaleX += (1 - this.scaleX) * Math.min(1, 12 * dt);
    this.scaleY += (1 - this.scaleY) * Math.min(1, 12 * dt);
    this.slither += Math.abs(this.vx) * dt;

    this.updateBody(dt, level);
  }

  // Rope-style body using "Verlet integration": each point remembers where it
  // was last step, and the difference is its velocity. Purely cosmetic.
  updateBody(dt, level) {
    const b = this.body;
    // The first point is glued to the back of the head.
    b[0].x = this.x + this.w / 2 - this.facing * 4;
    b[0].y = this.y + this.h;

    for (let i = 1; i < b.length; i++) {
      const p = b[i];
      const vx = (p.x - p.px) * 0.9; // 0.9 = air friction so it doesn't swing forever
      const vy = (p.y - p.py) * 0.9;
      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy + PLAYER.gravity * dt * dt;

      // Stay within bodySpacing of the point in front (follow the leader).
      const front = b[i - 1];
      const dx = p.x - front.x;
      const dy = p.y - front.y;
      const dist = Math.hypot(dx, dy);
      if (dist > PLAYER.bodySpacing) {
        p.x = front.x + (dx / dist) * PLAYER.bodySpacing;
        p.y = front.y + (dy / dist) * PLAYER.bodySpacing;
      }

      // Rest on top of the ground and platforms instead of sinking into them.
      const col = Math.floor(p.x / TILE);
      const row = Math.floor(p.y / TILE);
      const tileTop = row * TILE;
      const cameFromAbove = p.py <= tileTop + 1;
      if (level.isSolid(col, row) || (level.isOneWay(col, row) && cameFromAbove)) {
        if (cameFromAbove) {
          p.y = tileTop;
        } else {
          // Hit the side of a wall: undo the sideways part of the move so the
          // point slides up/down the wall instead of passing through it.
          p.x = p.px;
          if (level.isSolid(Math.floor(p.x / TILE), Math.floor(p.y / TILE))) p.y = p.py;
        }
      }

      // Safety net: if a point got stuck far behind, pull it back to the chain.
      if (Math.hypot(p.x - front.x, p.y - front.y) > PLAYER.bodySpacing * 2) {
        p.x = p.px = front.x;
        p.y = p.py = front.y;
      }
    }
  }

  // Called when the player jumps on an enemy.
  bounce() {
    this.vy = -(Input.held("jump") ? PLAYER.stompBounceHeld : PLAYER.stompBounce);
    this.jumpCutDone = !Input.held("jump");
    this.scaleX = 0.75;
    this.scaleY = 1.25;
  }

  // Launch off a bashed ghost: always upward, and sideways toward the input.
  bash(dir) {
    this.vy = -BASH.speedUp;
    this.vx = dir * BASH.speedSide;
    if (dir !== 0) this.facing = dir;
    this.boostTimer = BASH.boostTime;
    this.jumpCutDone = true;   // a bash is always full height
    this.jumpBufferTimer = 0;
    this.coyoteTimer = 0;
    this.scaleX = 0.6;
    this.scaleY = 1.4;
  }

  launch() {
    this.vy = -PLAYER.springSpeed;
    this.jumpCutDone = true; // releasing jump shouldn't cut a spring launch
    this.coyoteTimer = 0;
    this.scaleX = 0.6;
    this.scaleY = 1.4;
  }
}

// ===========================================================================
// Walker enemy — patrols back and forth, turning at walls, ledges and spikes.
// ===========================================================================
class Walker {
  constructor(spawn) {
    this.w = ENEMY.width;
    this.h = ENEMY.height;
    Object.assign(this, spawnOnTile(spawn, this.w, this.h));
    this.vx = -ENEMY.speed;
    this.vy = 0;
    this.onGround = false;
    this.alive = true;
    this.squashTimer = 0;
    this.animTime = Math.random() * 10;
  }

  // An enemy is removed once it has finished its squash animation or fallen out.
  get removable() {
    return !this.alive && this.squashTimer <= 0;
  }

  update(dt, level) {
    if (!this.alive) {
      this.squashTimer -= dt;
      return;
    }
    this.animTime += dt;
    this.vy = Math.min(this.vy + PLAYER.gravity * dt, PLAYER.maxFall);

    if (level.moveX(this, this.vx * dt)) this.vx = this.lastDir() * -ENEMY.speed;
    level.moveY(this, this.vy * dt);

    if (this.onGround) {
      // Look one pixel ahead: is there floor under our front foot? Spikes ahead?
      const dir = Math.sign(this.vx) || this.lastDir();
      const aheadCol = Math.floor((dir > 0 ? this.x + this.w + 1 : this.x - 1) / TILE);
      const feetRow = Math.floor((this.y + this.h - 1) / TILE);
      if (!level.isStandable(aheadCol, feetRow + 1) || level.isSpike(aheadCol, feetRow)) {
        this.vx = -dir * ENEMY.speed;
      }
    }
    if (this.vx !== 0) this.dir = Math.sign(this.vx);

    if (this.y > level.height) {
      this.alive = false;
      this.squashTimer = 0;
    }
  }

  lastDir() {
    return this.dir || -1;
  }

  squash() {
    this.alive = false;
    this.squashTimer = ENEMY.squashTime;
  }
}

// ===========================================================================
// Ghost enemy — floats left and right through walls, bobbing up and down.
// It doesn't use tile collision at all: its position is just a sine wave.
// Like the walker it can be stomped, so it has the same alive/squash/removable.
// ===========================================================================
class Ghost {
  constructor(spawn) {
    this.w = GHOST.width;
    this.h = GHOST.height;
    this.homeX = spawn.col * TILE + (TILE - this.w) / 2;
    this.homeY = spawn.row * TILE + (TILE - this.h) / 2;
    this.x = this.homeX;
    this.y = this.homeY;
    this.dir = 1;
    this.alive = true;
    this.squashTimer = 0;
    this.animTime = spawn.col; // so ghosts aren't all in sync
    this.stunTimer = 0;        // > 0 after being bashed: harmless and dizzy
    this.knockX = 0;           // extra offset from being bashed away
    this.knockV = 0;
  }

  get harmless() {
    return !this.alive || this.stunTimer > 0;
  }

  // Pushed away (opposite to the player's launch) and stunned.
  bashed(dir) {
    this.stunTimer = BASH.stunTime;
    this.knockV = -dir * 260 || 0;
  }

  get removable() {
    return !this.alive && this.squashTimer <= 0;
  }

  update(dt) {
    if (!this.alive) {
      this.squashTimer -= dt;
      this.y -= 40 * dt; // the defeated ghost drifts upward as it fades
      return;
    }
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    if (this.stunTimer === 0) this.animTime += dt;  // frozen in place while dizzy
    this.knockX += this.knockV * dt;
    this.knockV *= Math.pow(0.02, dt);              // knock-back slows quickly...
    this.knockX *= Math.pow(0.4, dt);               // ...and the ghost drifts home
    const swing = Math.sin(this.animTime * GHOST.speed);
    this.x = this.homeX + swing * GHOST.range + this.knockX;
    this.y = this.homeY + Math.sin(this.animTime * 3) * 6;
    this.dir = Math.cos(this.animTime * GHOST.speed) >= 0 ? 1 : -1;
  }

  squash() {
    this.alive = false;
    this.squashTimer = ENEMY.squashTime;
  }
}

// ===========================================================================
// Spirit flame — the spell bought with soul. Flies straight ahead, burns up
// the first enemy it touches, and fizzles against walls.
// ===========================================================================
class SpiritFlame {
  constructor(x, y, dir) {
    this.w = 16;
    this.h = 12;
    this.x = x - this.w / 2;
    this.y = y - this.h / 2;
    this.vx = dir * FLAME.speed;
    this.life = FLAME.life;
    this.dead = false;
  }

  update(dt, level) {
    this.x += this.vx * dt;
    this.life -= dt;
    const col = Math.floor((this.x + this.w / 2) / TILE);
    const row = Math.floor((this.y + this.h / 2) / TILE);
    if (this.life <= 0 || level.isSolid(col, row)) this.dead = true;
  }
}

// ===========================================================================
// Simple static pickups / props
// ===========================================================================
class Coin {
  constructor(spawn) {
    this.x = spawn.col * TILE + 8;
    this.y = spawn.row * TILE + 8;
    this.w = 16;
    this.h = 16;
    this.collected = false;
    this.phase = spawn.col * 0.6; // offsets bob/spin so coins aren't in sync
  }
}

class Spring {
  constructor(spawn) {
    // Only the bottom half of the tile is the springy part.
    this.x = spawn.col * TILE + 2;
    this.y = spawn.row * TILE + 16;
    this.w = TILE - 4;
    this.h = 16;
    this.compress = 0; // 0..1 animation amount
  }
}

class Checkpoint {
  constructor(spawn) {
    this.x = spawn.col * TILE;
    this.y = spawn.row * TILE - TILE; // 2 tiles tall
    this.w = TILE;
    this.h = TILE * 2;
    this.active = false;
    // Where the player reappears after dying.
    this.respawnPoint = spawnOnTile(spawn, PLAYER.width, PLAYER.height);
  }
}

class Flag {
  constructor(spawn) {
    this.x = spawn.col * TILE + 10;
    this.y = spawn.row * TILE - TILE * 3; // pole is 4 tiles tall
    this.w = 12;
    this.h = TILE * 4;
  }
}
