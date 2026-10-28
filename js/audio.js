// ---------------------------------------------------------------------------
// audio.js — tiny synthesized sound effects using the Web Audio API.
// No sound files needed: each effect is one or two oscillator "beeps" whose
// pitch slides over time.
// ---------------------------------------------------------------------------

const Sound = {
  ctx: null,
  muted: false,

  // Browsers only allow audio after a user gesture (a key press or a tap), so
  // this is called from inside those event handlers (see game.js).
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },

  toggleMute() {
    this.muted = !this.muted;
  },

  // Play one tone. freq -> slideTo (Hz) over `duration` seconds.
  tone(freq, duration, { type = "square", volume = 0.15, slideTo = freq, delay = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  },

  jump()       { this.tone(320, 0.15, { slideTo: 640, volume: 0.08 }); },
  coin()       { this.tone(988, 0.08, { volume: 0.07 }); this.tone(1319, 0.2, { volume: 0.07, delay: 0.07 }); },
  stomp()      { this.tone(220, 0.15, { slideTo: 80, type: "triangle", volume: 0.25 }); },
  spring()     { this.tone(200, 0.35, { slideTo: 900, type: "triangle", volume: 0.2 }); },
  checkpoint() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.15, { delay: i * 0.08, volume: 0.08 })); },
  die()        { this.tone(440, 0.6, { slideTo: 60, type: "sawtooth", volume: 0.12 }); },
  win()        { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.2, { delay: i * 0.12, volume: 0.08 })); },
  select()     { this.tone(660, 0.1, { volume: 0.08 }); },
};
