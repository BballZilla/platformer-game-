// ---------------------------------------------------------------------------
// config.js — every tunable number in one place.
// Tweak these to change how the game feels; nothing else needs to change.
// All speeds are in pixels per second, accelerations in pixels per second².
// ---------------------------------------------------------------------------

const TILE = 32;            // size of one map tile in pixels
const VIEW_W = 960;         // canvas width
const VIEW_H = 544;         // canvas height (17 tiles)
const STEP = 1 / 60;        // fixed physics timestep (seconds)

const PLAYER = {
  width: 22,
  height: 28,
  runAccel: 2400,           // acceleration while on the ground
  airAccel: 1600,           // acceleration while in the air (less control)
  friction: 2200,           // deceleration on the ground with no input
  airDrag: 300,             // deceleration in the air with no input
  maxSpeed: 260,
  gravity: 2200,
  maxFall: 900,
  jumpSpeed: 700,           // initial upward velocity of a jump
  jumpCut: 0.45,            // velocity multiplier when jump is released early
  coyoteTime: 0.10,         // can still jump this long after walking off a ledge
  jumpBuffer: 0.12,         // a jump pressed this early before landing still counts
  stompBounce: 450,         // bounce after stomping an enemy
  stompBounceHeld: 650,     // ...bigger if jump is held
  springSpeed: 1150,
  dropThroughTime: 0.25,    // how long one-way platforms are ignored after pressing down
};

const ENEMY = {
  width: 26,
  height: 22,
  speed: 60,
  squashTime: 0.5,          // how long the squashed body stays on screen
};

const GAME = {
  startLives: 3,
  respawnDelay: 1.2,        // seconds between dying and respawning
  coinScore: 100,
  stompScore: 200,
  timeBonusPar: 180,        // finish faster than this (seconds) for a time bonus
  timeBonusPerSecond: 50,
  lifeBonus: 1000,
};

const COLORS = {
  skyTop: "#4aa3df",
  skyBottom: "#bfe6ff",
  hillFar: "#8fc9a8",
  hillNear: "#5fae7a",
  dirt: "#8a5a35",
  dirtDark: "#6e4426",
  grass: "#58c24b",
  grassDark: "#3c9a33",
  brick: "#c2603d",
  brickDark: "#8f3f25",
  plank: "#b98a4e",
  plankDark: "#7d5a2e",
  spike: "#d9dde3",
  spikeDark: "#8c96a3",
  player: "#ff6b4a",
  playerDark: "#c4432a",
  enemy: "#7b4fc9",
  enemyDark: "#52308f",
  coin: "#ffd34d",
  coinDark: "#d49b12",
  hud: "#ffffff",
};
