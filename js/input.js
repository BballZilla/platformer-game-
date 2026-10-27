// ---------------------------------------------------------------------------
// input.js — keyboard handling.
//
// Keys are mapped to *actions* ("left", "jump", ...) so the rest of the game
// never cares which physical key was pressed.
//   Input.held(action)    true while any key for that action is down
//   Input.pressed(action) true only on the update step the key went down
// ---------------------------------------------------------------------------

const KEY_BINDINGS = {
  left:  ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  jump:  ["Space", "ArrowUp", "KeyW", "KeyZ"],
  down:  ["ArrowDown", "KeyS"],
  pause: ["KeyP", "Escape"],
  start: ["Enter", "Space"],
  mute:  ["KeyM"],
};

const Input = {
  down: new Set(),        // keys currently held
  justPressed: new Set(), // keys pressed since the last update step

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
