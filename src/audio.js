const MOTIF = [0, 7, 9, 4, 2, 7, 4, 0, 0, 4, 7, 11, 9, 7, 2, 0];
const ROOTS = [
  130.8128, 130.8128, 146.8324, 130.8128, 146.8324, 164.8138, 164.8138, 174.6141, 174.6141,
];
export class AudioLayer {
  constructor(settings) {
    this.settings = settings;
    this.context = null;
    this.buses = {};
    this.act = 0;
    this.note = 0;
    this.nextNote = 0;
    this.sceneKey = "";
    this.lastStep = 0;
    this.noiseBuffer = null;
    this.activeVoices = 0;
    this.sequence = 0;
  }
  unlock() {
    try {
      if (!this.context) {
        const c = (this.context = new (window.AudioContext || window.webkitAudioContext)());
        this.master = c.createDynamicsCompressor();
        this.master.threshold.value = -18;
        this.master.knee.value = 20;
        this.master.ratio.value = 3;
        this.master.attack.value = 0.006;
        this.master.release.value = 0.2;
        this.master.connect(c.destination);
        this.reverb = c.createConvolver();
        const ir = c.createBuffer(2, c.sampleRate * 1.8, c.sampleRate);
        let seed = 173;
        for (let ch = 0; ch < 2; ch++) {
          const d = ir.getChannelData(ch);
          for (let i = 0; i < d.length; i++) {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            d[i] = ((seed / 4294967296) * 2 - 1) * Math.pow(1 - i / d.length, 3) * 0.32;
          }
        }
        this.reverb.buffer = ir;
        const wet = c.createGain();
        wet.gain.value = 0.16;
        this.reverb.connect(wet).connect(this.master);
        for (const k of ["music", "sfx", "ambience", "ui"]) {
          const g = c.createGain();
          g.gain.value = this.settings[k] ?? 0.5;
          g.connect(this.master);
          this.buses[k] = g;
          if (k === "music" || k === "sfx") g.connect(this.reverb);
        }
        this.noiseBuffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
        const d = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          d[i] = (seed / 4294967296) * 2 - 1;
        }
        this.air = c.createBufferSource();
        this.air.buffer = this.noiseBuffer;
        this.air.loop = true;
        this.airFilter = c.createBiquadFilter();
        this.airFilter.type = "lowpass";
        this.airFilter.frequency.value = 220;
        this.airGain = c.createGain();
        this.airGain.gain.value = 0;
        this.air.connect(this.airFilter).connect(this.airGain).connect(this.buses.ambience);
        this.air.start();
      }
      if (this.context.state === "suspended") this.context.resume();
    } catch {}
  }
  tone(f, to, dur, type = "sine", vol = 0.05, bus = "sfx", delay = 0, attack = 0.007) {
    if (!this.context || this.activeVoices > 96) return;
    const c = this.context,
      t = c.currentTime + delay,
      o = c.createOscillator(),
      g = c.createGain();
    this.activeVoices++;
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.buses[bus]);
    o.start(t);
    o.stop(t + dur + 0.03);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
      this.activeVoices--;
    };
  }
  noise(dur = 0.15, vol = 0.05, freq = 700, bus = "sfx", delay = 0, type = "bandpass") {
    if (!this.context || this.activeVoices > 96) return;
    const c = this.context,
      t = c.currentTime + delay,
      s = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain();
    this.activeVoices++;
    s.buffer = this.noiseBuffer;
    s.loop = dur > 1.5;
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = 0.65;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.buses[bus]);
    s.start(t, (this.sequence++ % 7) * 0.19);
    s.stop(t + dur);
    s.onended = () => {
      s.disconnect();
      f.disconnect();
      g.disconnect();
      this.activeVoices--;
    };
  }
  piano(f, vol = 0.06, delay = 0, bus = "music") {
    for (const [ratio, gain, dur] of [
      [1, 1, 2.5],
      [2, 0.24, 1.3],
      [3, 0.08, 0.7],
      [4.01, 0.035, 0.4],
    ])
      this.tone(f * ratio, f * ratio, dur, "sine", vol * gain, bus, delay, 0.004);
    this.noise(0.035, vol * 0.2, 1500, bus, delay);
  }
  pluck(f, vol = 0.05, delay = 0, bus = "music") {
    if (!this.context) return;
    const c = this.context,
      rate = c.sampleRate,
      n = Math.floor(rate * 2.3),
      period = Math.round(rate / f),
      buf = c.createBuffer(1, n, rate),
      d = buf.getChannelData(0);
    let seed = Math.floor(f * 731);
    for (let i = 0; i < period; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      d[i] = ((seed / 4294967296) * 2 - 1) * 0.5;
    }
    for (let i = period; i < n; i++) d[i] = (d[i - period] + d[i - period + 1]) * 0.496;
    const s = c.createBufferSource(),
      g = c.createGain();
    s.buffer = buf;
    g.gain.value = vol;
    s.connect(g).connect(this.buses[bus]);
    s.start(c.currentTime + delay);
    s.onended = () => {
      s.disconnect();
      g.disconnect();
    };
  }
  glass(f = 1046, vol = 0.08, bus = "sfx", delay = 0) {
    for (const [r, v] of [
      [1, 1],
      [2.76, 0.24],
      [5.4, 0.08],
    ])
      this.tone(f * r, f * r, 0.95 / r ** 0.3, "sine", vol * v, bus, delay);
  }
  event(id) {
    const variant = 1 + ((this.sequence++ % 4) - 1.5) * 0.045;
    if (id === "jam.jump") {
      this.tone(220 * variant, 510, 0.14, "sine", 0.085);
      this.noise(0.055, 0.022, 1000);
    } else if (id === "jam.land") {
      this.tone(105 * variant, 45, 0.14, "sine", 0.13);
      this.noise(0.085, 0.06, 480);
    } else if (id === "jam.step") {
      this.noise(0.06, 0.032, this.act === 8 ? 420 : this.act === 7 ? 850 : 600);
      this.tone(90 * variant, 55, 0.065, "sine", 0.04);
    } else if (id.startsWith("jam.die.")) {
      this.tone(125, 32, 0.3, "sine", 0.16);
      this.noise(0.18, 0.13, 350);
      if (/fire|\.f$/.test(id)) this.noise(0.55, 0.08, 4200);
      else if (/frost/.test(id)) {
        if (id.includes("frost"))
          for (let i = 0; i < 4; i++) this.glass(1000 + i * 330, 0.025, "sfx", i * 0.04);
      }
      if (/spike|\^/.test(id)) this.noise(0.035, 0.1, 4800);
      if (/press/.test(id)) {
        this.tone(63, 38, 0.3, "triangle", 0.12);
        this.glass(290, 0.025);
      }
      if (/wire|\.w$/.test(id)) {
        this.noise(0.15, 0.1, 2500);
        this.tone(110, 110, 0.4, "sawtooth", 0.025);
      }
      if (/vat|\.v$/.test(id)) this.tone(190, 48, 0.38, "sine", 0.11);
    } else if (id === "pad.bounce") {
      this.tone(100, 740, 0.31, "sine", 0.15);
      this.tone(205, 440, 0.12, "triangle", 0.045);
    } else if (id.startsWith("material.form.")) {
      const k = id.split(".").at(-1);
      if (k === "i")
        for (let i = 0; i < 3; i++) this.glass(1100 + i * 420, 0.045, "sfx", i * 0.045);
      else if (k === "t") {
        this.tone(110, 110, 0.7, "sine", 0.05);
        this.noise(0.07, 0.04, 2400);
      } else if (k === "b") this.noise(0.23, 0.08, 1500);
      else if (k === "p") this.tone(270, 140, 0.22, "sine", 0.1);
      else if (k === "j") this.tone(210, 70, 0.25, "sine", 0.1);
      else {
        this.tone(150, 85, 0.15, "sine", 0.09);
        this.noise(0.1, 0.04, 700);
      }
    } else if (/material.break|strand.short|ice.melt/.test(id))
      this.noise(0.3, 0.055, id.includes("short") ? 3000 : 1300);
    else if (id === "press.slam") {
      this.noise(0.14, 0.1, 280);
      this.tone(70, 27, 0.3, "triangle", 0.12);
      this.glass(185, 0.025);
    } else if (id === "seed.collect") {
      this.pluck(1046, 0.2, 0, "sfx");
      this.glass(1568, 0.055, "sfx", 0.07);
    } else if (id === "jam.split") {
      this.noise(0.08, 0.06, 2500);
      this.tone(540, 180, 0.16, "sine", 0.1);
    } else if (id === "jam.merge") {
      this.tone(170, 440, 0.18, "sine", 0.12);
      this.noise(0.12, 0.05, 460);
    } else if (id === "room.clear") {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.glass(f, 0.06, "sfx", i * 0.09));
      this.tone(180, 75, 0.08, "sine", 0.075, "sfx", 0.32);
    } else if (id === "ui.confirm" || id === "ui.back")
      this.glass(id === "ui.back" ? 420 : 760, 0.045, "ui");
    else if (id === "room.retry") {
      this.noise(0.2, 0.04, 1800, "ui");
      this.tone(650, 90, 0.18, "sine", 0.035, "ui");
    } else if (id === "cinema.crack") {
      this.noise(0.04, 0.15, 5500);
      this.glass(2100, 0.045);
    } else if (id === "cinema.spill" || id === "cinema.pour") {
      this.noise(id.endsWith("pour") ? 4 : 0.4, 0.04, 450);
      this.tone(170, 65, 0.4, "sine", 0.085);
    } else if (id === "cinema.lid") {
      this.glass(880, 0.07);
      this.noise(0.05, 0.07, 460);
    } else if (id === "cinema.home" || id === "cinema.dawn") {
      [174.61, 220, 261.63, 349.23].forEach((f, i) => this.piano(f, 0.055, i * 0.2, "music"));
    } else if (id === "cinema.lift" || id === "cinema.hatch") {
      this.noise(2, 0.09, 180, "ambience");
      this.tone(55, 75, 2, "sine", 0.045, "ambience");
    }
  }
  update(act, playing, { world = null, cinema = null, credits = false } = {}) {
    this.act = act;
    if (!this.context) return;
    const c = this.context,
      now = c.currentTime;
    for (const [k, g] of Object.entries(this.buses))
      g.gain.setTargetAtTime(this.settings[k] ?? 0.5, now, 0.06);
    const sounding = playing || !!cinema || credits;
    const key = cinema ?? (credits ? "ending" : String(act));
    if (key !== this.sceneKey) {
      this.sceneKey = key;
      this.note = 0;
      this.nextNote = now + 0.1;
    }
    this.airFilter.frequency.setTargetAtTime(
      act === 7 || cinema === "escape" ? 2600 : act === 8 ? 800 : 170,
      now,
      1,
    );
    this.airGain.gain.setTargetAtTime(
      sounding ? (act === 7 || cinema === "escape" ? 0.065 : act === 8 ? 0.007 : 0.02) : 0.003,
      now,
      0.5,
    );
    if (world && playing) {
      const p = world.players[world.active];
      if (p?.ground && !p.dead && Math.abs(p.vx) > 1 && world.time - this.lastStep > 0.22) {
        this.lastStep = world.time;
        this.event("jam.step");
      }
      if (world.time < this.lastStep) this.lastStep = world.time;
    }
    if (!sounding || now < this.nextNote || cinema === "escape") return;
    const home = act === 8 || cinema === "ending" || credits,
      root = home ? 174.6141 : (ROOTS[act] ?? 130.8128),
      tempo = home ? 0.62 : act === 0 ? 1.6 : 0.78;
    this.nextNote = now + tempo;
    const n = this.note++ % 16,
      f = root * 2 ** (MOTIF[n] / 12);
    if (act === 0 || cinema === "opening") {
      if (n % 4 === 0) {
        this.tone(root / 2, root / 2, 5, "sine", 0.04, "music", 0, 0.5);
        this.tone(50, 42, 0.16, "sine", 0.055, "ambience");
      }
      return;
    }
    if (n % 4 === 0) {
      const chord = n < 8 ? [0, 4, 7] : [-5, 2, 7];
      for (const k of chord)
        this.tone(
          root * 0.5 * 2 ** (k / 12),
          root * 0.5 * 2 ** (k / 12),
          4.2,
          "sine",
          home ? 0.025 : 0.034,
          "music",
          0,
          0.35,
        );
    }
    if (home) {
      this.piano(f, 0.065);
      if (n % 2 === 0) this.pluck(f / 2, 0.12, 0.12);
      if (n % 4 === 3) this.glass(f * 2, 0.018, "music", 0.05);
    } else if (act >= 5) {
      this.piano(f, 0.038);
      if (act === 7 && n % 2 === 0) this.pluck(f / 2, 0.1);
    } else {
      this.glass(f * 2, 0.018, "music");
      if (act === 3 || act === 4) {
        this.noise(0.075, 0.025, n % 4 === 0 ? 250 : 1200, "music");
        this.tone(n % 4 === 0 ? 55 : 110, 40, 0.06, "sine", 0.04, "music");
      }
    }
    if (world?.room.machine && n % 2 === 0) this.noise(0.07, 0.023, 600, "music");
  }
}
