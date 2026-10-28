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
  bodySegments: 13,         // snake body (visual only, no collision)
  bodySpacing: 5,
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
  // Night sky, from the top of the screen down to the orange glow on the horizon
  skyTop: "#120a24",
  skyMid: "#2e1747",
  skyBottom: "#7a3b55",
  moon: "#fdf3c4",
  hillFar: "#2a1b3d",
  hillNear: "#1c1229",
  fog: "rgba(200, 180, 230, 0.10)",
  dirt: "#3b2633",
  dirtDark: "#2a1a24",
  grass: "#5d7d35",
  grassDark: "#3e5624",
  stone: "#5e5670",
  stoneDark: "#3d374b",
  moss: "#4f6b32",
  plank: "#6e4b33",
  plankDark: "#3f2a1d",
  spike: "#e6e1d3",
  spikeDark: "#8f8a7c",
  snake: "#6fd34f",
  snakeBand: "#3f9a34",
  snakeDark: "#1f4d1b",
  snakeEye: "#ffd84a",
  pumpkin: "#f07a1a",
  pumpkinDark: "#b4500c",
  pumpkinGlow: "#ffe066",
  candyBase: "#ffd23f",
  candyMid: "#ff8a1f",
  candyTip: "#fff8ea",
  lantern: "#ffb84d",
  hud: "#ffffff",
  accent: "#ff8a1f",       // titles and highlights
  dust: "#a99bc0",
};
