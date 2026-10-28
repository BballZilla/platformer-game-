# Spooky Slither — a Halloween platformer

A complete three-level 2D platformer written in plain JavaScript with the HTML5
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
| Spirit flame (tap) / heal (hold, needs a full soul orb) | X, F or Shift |
| Bash off a ghost | Jump in mid-air next to a ghost |
| Pixel-art mode on/off | V |

**On a phone or tablet** on-screen buttons appear automatically: ◀ ▶ to move,
**JUMP** to jump, ▼ to drop through platforms, ✦ for the spirit flame / heal,
▦ for pixel-art mode, ❚❚ to pause and ♪ to mute.
Turn the phone sideways for the biggest screen.

You're a snake slithering through three haunted levels at night. Grab candy
corn, squash pumpkins and ghosts by landing on top of them, avoid spikes and
pits, and reach the checkered flag. You get 3 lives per level; lighting a
lantern checkpoint makes it your respawn point. A game over lets you retry the
level you were on.

| Level | Name | What's new |
| --- | --- | --- |
| 1 | Haunted Hills | Learn the basics: pumpkins, springs, planks, spikes |
| 2 | Graveyard Crypt | Ghosts that float through walls, a low crypt, stepping-stone pillars |
| 3 | Witch's Peak | A tall level: climb a tower, cross a broken bridge over a spike pit | Finishing faster and with lives left gives bonus points.
Your best score is saved in the browser.

## Features

**Mechanics inspired by other games**

- **Soul orb (risk-reward, like Hollow Knight):** stomping enemies fills the orb.
  Spend a third of it on a spirit flame that destroys an enemy from a distance,
  or save up a full orb and hold the spell key to heal a life (up to 5). Flame
  kills don't refill soul, so you have to play aggressively to earn it.
- **Ghost bash (momentum, like Ori's Bash):** in mid-air, press jump next to a
  ghost to launch off it. The ghost is knocked away and stunned; a dashed ring
  shows when one is in range. Chain bashes to reach high places.
- **Death trails (like Super Meat Boy):** every death leaves a dotted line of
  the route you took and a skull where it ended, so you can see what went wrong.
  Trails stay while you retry the same level.

**Art & depth**

- Flat vector art drawn with canvas shapes, so it stays sharp at any size, plus
  a **pixel-art mode** (V) that renders the world at 1/3 resolution and scales it
  up without smoothing.
- Five parallax layers: mountains (0.1x), far hills (0.25x), near hills (0.5x),
  the level (1x) and a foreground of grass, fences and vines (1.35x).
- Contrast: a pool of light around the snake with darker screen edges, a rim
  glow on the snake, and a red glow on spikes so hazards read instantly.

**Everything else**


- Three tile-based levels written as text (easy to edit or add to — see `js/level.js`)
- Each level has its own sky and moon colours, a title banner, and levels can be
  taller than the screen (the camera scrolls up and down)
- Fixed-timestep physics with axis-separated tile collision
- "Game feel" techniques: coyote time, jump buffering, variable jump height,
  squash & stretch, camera look-ahead, screen shake, particles
- Solid tiles, one-way platforms (drop through with ↓), spikes, bottomless pits
- Patrolling pumpkin enemies that turn at walls, ledges and spikes; stomp to defeat
- Ghost enemies that float back and forth through walls; also stompable
- Springs, candy corn, lantern checkpoints, goal flag
- A snake hero whose body is a little rope simulation (Verlet integration):
  it trails on the ground, dangles while jumping and wiggles as it slithers
- Halloween night scene: moon, twinkling stars, bats, dead trees, a haunted
  house, drifting fog, tombstones, flickering jack-o'-lantern faces
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
js/level.js        the levels (maps, names, colours), tile lookup, tile collision
js/particles.js    particle effects
js/entities.js     Player, Walker and Ghost (enemies), Coin, Spring, Checkpoint, Flag
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

- Add more levels: copy an entry in `LEVELS` (`js/level.js`), give it a name,
  sky colours and a new map. The game picks it up automatically.
- Replace the shape drawing in `render.js` with sprite sheets (`ctx.drawImage`)
- New enemy types (jumping, flying, shooting), moving platforms, power-ups
- Gamepad support via the Gamepad API
