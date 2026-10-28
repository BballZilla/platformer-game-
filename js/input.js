// ---------------------------------------------------------------------------
// input.js — keyboard handling.
//
// Keys are mapped to *actions* ("left", "jump", ...) so the rest of the game
// never cares which physical key was pressed.
//   Input.held(action)    true while any key for that action is down
//   Input.pressed(action) true only on the update step the key went down
// ---------------------------------------------------------------------------

// "Touch..." codes come from the on-screen buttons (see touch.js).
const KEY_BINDINGS = {
  left:  ["ArrowLeft", "KeyA", "TouchLeft"],
  right: ["ArrowRight", "KeyD", "TouchRight"],
  jump:  ["Space", "ArrowUp", "KeyW", "KeyZ", "TouchJump"],
  down:  ["ArrowDown", "KeyS", "TouchDown"],
  pause: ["KeyP", "Escape", "TouchPause"],
  start: ["Enter", "Space", "TouchJump"],
  mute:  ["KeyM", "TouchMute"],
};

const Input = {
  down: new Set(),        // keys currently held
  justPressed: new Set(), // keys pressed since the last update step
  touchMode: false,       // true once we know the player is using a touchscreen

  init() {
    const allKeys = new Set(Object.values(KEY_BINDINGS).flat());

    window.addEventListener("keydown", (e) => {
      if (allKeys.has(e.code)) e.preventDefault(); // stop arrows/space scrolling the page
      if (e.repeat) return;                       // ignore auto-repeat
      this.down.add(e.code);
      this.justPressed.add(e.code);
    });
    window.addEventListener("keyup", (e) => this.down.delete(e.code));
    // If the window loses focus we never get keyup events, so release everything.
    window.addEventListener("blur", () => this.down.clear());
  },

  // Used by the on-screen buttons to press and release virtual keys.
  press(code) {
    if (this.down.has(code)) return;
    this.down.add(code);
    this.justPressed.add(code);
  },

  release(code) {
    this.down.delete(code);
  },

  held(action) {
    return KEY_BINDINGS[action].some((code) => this.down.has(code));
  },

  pressed(action) {
    return KEY_BINDINGS[action].some((code) => this.justPressed.has(code));
  },

  // Called once after every update step so "pressed" only lasts one step.
  endStep() {
    this.justPressed.clear();
  },
};
