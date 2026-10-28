// ---------------------------------------------------------------------------
// touch.js — on-screen buttons for phones and tablets.
//
// Each button in index.html has a data-code such as "TouchLeft". Touching a
// button "holds" that virtual key in Input, exactly like a keyboard key, so
// the rest of the game doesn't know or care whether you used a keyboard.
//
// Several fingers can be down at once (run + jump), and a finger can slide
// from one button to another (left -> right) without lifting.
// ---------------------------------------------------------------------------

const Touch = {
  fingers: new Map(), // pointerId -> code of the button under that finger

  init() {
    const layer = document.getElementById("touch-controls");
    if (!layer) return;

    // Show the buttons straight away on touchscreen devices, or as soon as
    // someone touches the screen on a device we didn't detect.
    if (window.matchMedia("(pointer: coarse)").matches) this.enable();
    window.addEventListener("touchstart", () => this.enable(), { passive: true });

    layer.addEventListener("pointerdown", (e) => this.track(e));
    layer.addEventListener("pointermove", (e) => {
      if (this.fingers.has(e.pointerId)) this.track(e);
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
      layer.addEventListener(type, (e) => this.lift(e.pointerId));
    }
    // Stop long-presses from opening the "copy / save image" menu.
    layer.addEventListener("contextmenu", (e) => e.preventDefault());
  },

  enable() {
    if (Input.touchMode) return;
    Input.touchMode = true;
    document.body.classList.add("touch");
  },

  // Work out which button is under the finger right now.
  track(e) {
    e.preventDefault();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const button = el && el.closest("[data-code]");
    this.fingers.set(e.pointerId, button ? button.dataset.code : null);
    this.sync();
  },

  lift(pointerId) {
    if (!this.fingers.delete(pointerId)) return;
    this.sync();
  },

  // Press every button that has a finger on it and release the rest.
  sync() {
    const held = new Set(this.fingers.values());
    for (const button of document.querySelectorAll("#touch-controls [data-code]")) {
      const code = button.dataset.code;
      if (held.has(code)) Input.press(code);
      else Input.release(code);
      button.classList.toggle("active", held.has(code));
    }
  },
};
