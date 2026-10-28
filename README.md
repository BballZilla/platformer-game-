# Sky Hopper — a one-level 2D platformer

A complete single-level 2D platformer written in plain JavaScript with the HTML5
Canvas. No engine, libraries, build step, or image/sound files are needed.

## How to play

**Easiest:** download **`sky-hopper.html`** (the whole game in one file — on
GitHub click it, then the download button ↓ at the top right) and double-click it.

**Or download everything:**
1. On this repository's GitHub page, click the green **Code** button, then **Download ZIP**.
2. Unzip the file (on Windows: right-click it → **Extract All**).
3. In the unzipped folder, double-click **`index.html`** — it opens in your browser.
   (Open it from the unzipped folder, not from inside the ZIP — otherwise it can't
   find the `css` and `js` folders.)

**Play it online (optional):** in the repo go to **Settings → Pages**, set the source
to the `main` branch and save. GitHub then gives you a link such as
`https://<your-username>.github.io/platformer-game-/` that anyone can play.

| Action | Keys |
| --- | --- |
| Move | ← → or A D |
| Jump (hold for higher) | Space, ↑, W or Z |
| Drop through wooden platforms | ↓ or S |
| Pause | P or Esc |
| Mute | M |

**On a phone or tablet** on-screen buttons appear automatically: ◀ ▶ to move,
**JUMP** to jump, ▼ to drop through platforms, ❚❚ to pause and ♪ to mute.
Turn the phone sideways for the biggest screen.

Collect coins, stomp enemies by landing on top of them, avoid spikes and pits,
and reach the checkered flag. You have 3 lives; touching a checkpoint flag makes
it your respawn point. Finishing faster and with lives left gives bonus points.
Your best score is saved in the browser.

## Features

- Tile-based level written as text (easy to edit — see `js/level.js`)
- Fixed-timestep physics with axis-separated tile collision
- "Game feel" techniques: coyote time, jump buffering, variable jump height,
  squash & stretch, camera look-ahead, screen shake, particles
- Solid tiles, one-way platforms (drop through with ↓), spikes, bottomless pits
- Patrolling enemies that turn at walls, ledges and spikes; stomp to defeat
- Springs, coins, checkpoints, goal flag
- Title, pause, game-over and level-clear screens; score, time and lives HUD
- Synthesized sound effects (Web Audio API) and procedural graphics

## Project structure

```
sky-hopper.html    the whole game in one file (generated — don't edit)
tools/build_standalone.py   regenerates sky-hopper.html after you change the code
index.html         page + canvas, loads the scripts in order
css/style.css      page layout / canvas scaling
js/config.js       all tunable constants (physics, scoring, colors)
js/input.js        keyboard -> actions ("left", "jump", ...)
js/touch.js        on-screen buttons for phones and tablets
js/audio.js        synthesized sound effects
js/level.js        level map, tile lookup, collision against tiles
js/particles.js    particle effects
js/entities.js     Player, Walker (enemy), Coin, Spring, Checkpoint, Flag
js/render.js       all drawing code
js/game.js         game state machine, interactions, camera, main loop
```

## How it works (short version)

1. **Main loop** (`game.js`): `requestAnimationFrame` measures elapsed time and
   runs `update()` in fixed 1/60 s steps, then `draw()` once per frame. Fixed
   steps make physics behave the same on 60 Hz and 144 Hz screens.
2. **Physics** (`entities.js`): each step the player accelerates toward the input
   direction, gravity is added to vertical velocity, then the player moves.
3. **Collision** (`level.js`): bodies move along X first and are pushed out of any
   solid tile, then along Y. Landing on a tile while moving down sets `onGround`.
   One-way platforms only block a body that was above them on the previous step.
4. **Interactions** (`game.js → handleInteractions`): box-overlap tests against
   coins, enemies, springs, checkpoints, spikes and the flag. Touching an enemy
   while falling onto its top is a stomp; any other touch kills the player.
5. **Rendering** (`render.js`): parallax background, then only the on-screen
   tiles, then entities, particles, HUD and menu overlays.

## Ideas for extending it

- Add more levels (make `LEVEL_MAP` an array of maps and load the next on win)
- Replace the shape drawing in `render.js` with sprite sheets (`ctx.drawImage`)
- New enemy types (jumping, flying, shooting), moving platforms, power-ups
- Gamepad support via the Gamepad API
