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

const GHOST = {
  width: 24,
  height: 24,
  range: 2.5 * TILE,        // how far it floats left/right of where it starts
  speed: 1.4,               // how fast it swings back and forth
};

// Soul: a risk-reward resource. Stomping enemies fills it; you spend it on a
// spirit flame (tap the spell key) or on healing (hold it while full).
const SOUL = {
  max: 100,
  perStomp: 34,             // 3 stomps fill the orb
  flameCost: 34,
  healCost: 100,
  healHoldTime: 0.7,        // seconds to hold the spell key to heal
  tapTime: 0.25,            // released quicker than this = a tap (cast flame)
  maxLives: 5,
};

const FLAME = {
  speed: 560,
  life: 1.0,                // seconds before it fizzles out
};

// Ghost bash: in mid-air, press jump next to a ghost to launch off it.
const BASH = {
  range: 70,                // distance (centre to centre) a ghost can be bashed from
  speedUp: 820,
  speedSide: 520,
  boostTime: 0.35,          // the sideways launch can exceed normal max speed this long
  stunTime: 1.0,            // a bashed ghost is harmless this long
  hitstop: 0.07,            // tiny freeze frame to make the bash feel punchy
};

const GAME = {
  startLives: 3,            // lives are refilled at the start of every level
  respawnDelay: 1.2,        // seconds between dying and respawning
  coinScore: 100,
  stompScore: 200,
  timeBonusPar: 180,        // finish faster than this (seconds) for a time bonus
  timeBonusPerSecond: 50,
  lifeBonus: 1000,
  levelIntroTime: 3.0,      // how long the "LEVEL 2 - ..." banner shows
  trailsKept: 5,            // how many past attempts are drawn as death trails
  pixelScale: 3,            // pixel-art mode renders at 1/3 resolution
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
