// Per-room look: one dominant light per act, climbing from emergency red to
// morning sun (art bible §7). Presentation only; nothing here touches the grid.
const lerp = (a, b, t) => a + (b - a) * t;
function mix(a, b, t) {
  const ch = (c, s) => (c >> s) & 255;
  return (
    (Math.round(lerp(ch(a, 16), ch(b, 16), t)) << 16) |
    (Math.round(lerp(ch(a, 8), ch(b, 8), t)) << 8) |
    Math.round(lerp(ch(a, 0), ch(b, 0), t))
  );
}
// Three keyframes through a 0..1 progress value.
function ramp(t, a, b, c) {
  return t < 0.5 ? mix(a, b, t * 2) : mix(b, c, (t - 0.5) * 2);
}

const FACILITY = {
  kit: "facility",
  concrete: [0x3a3d42, 0x6b6e73],
  lip: 0x6b7379,
  rain: false,
  lightning: false,
  beacons: false,
  flicker: false,
  shafts: 0,
  pipLight: 1,
};

export function lookFor(room) {
  const act = room.act;
  // Progress through the act, 0 at its first room and 1 at its Test Chamber.
  const t = room.n === "A" ? 0.5 : Math.max(0, Math.min(1, (Number(room.n) - 1) / 11));
  if (act === 0)
    return {
      ...FACILITY,
      clear: 0x040607,
      fog: 0x040607,
      key: 0x71828b,
      keyIntensity: 0.12,
      sky: 0x1a2228,
      ground: 0x050607,
      ambient: 0.14,
      concrete: [0x2c2f33, 0x45484d],
      pipLight: 2.2,
    };
  if (act <= 2)
    return {
      ...FACILITY,
      clear: 0x0c0809,
      fog: 0x120b0c,
      key: 0xd8382e,
      keyIntensity: 3.2,
      sky: 0x7a6466,
      ground: 0x141216,
      ambient: 0.8,
      beacons: true,
      pipLight: 1.4,
    };
  if (act <= 4)
    return {
      ...FACILITY,
      clear: 0x0d0d0e,
      fog: 0x15130f,
      key: 0xf0a64a,
      keyIntensity: 1.9,
      sky: 0x66778c,
      ground: 0x17181d,
      ambient: 0.5,
      flicker: true,
      lip: 0x7a7468,
      pipLight: 1.1,
    };
  if (act <= 6)
    return {
      ...FACILITY,
      clear: 0x121820,
      fog: 0x1a2229,
      key: 0xdfe9f2,
      keyIntensity: 2,
      sky: 0xa9b8c4,
      ground: 0x1d2228,
      ambient: 0.62,
      shafts: act === 5 ? 0.06 : 0.09,
      pipLight: 0.9,
    };
  if (act === 7)
    // Storm at night, a grey dawn, then sunrise over the farm.
    return {
      ...FACILITY,
      kit: "surface",
      clear: ramp(t, 0x0b1019, 0x56626f, 0xd8a47a),
      fog: ramp(t, 0x1d2433, 0x7d8995, 0xe7b98e),
      key: ramp(t, 0x7f93b8, 0xc5ccd3, 0xffc58a),
      keyIntensity: lerp(1.4, 2.8, t),
      sky: ramp(t, 0x29324a, 0x9aa6b2, 0xffd9a8),
      ground: ramp(t, 0x0d1015, 0x3a3f45, 0x6b4a33),
      ambient: lerp(0.6, 0.85, t),
      concrete: [ramp(t, 0x3f434a, 0x5e6167, 0x7d7469), ramp(t, 0x5c616a, 0x82858a, 0xa69a88)],
      lip: ramp(t, 0x2e3a2c, 0x46573d, 0x6f7d46),
      rain: t < 0.62,
      lightning: t < 0.4,
      pipLight: lerp(1.3, 0.7, t),
    };
  return {
    ...FACILITY,
    kit: "home",
    clear: 0x3a2a1f,
    fog: 0x4a3626,
    key: 0xffd58a,
    keyIntensity: 3,
    sky: 0xffe2b0,
    ground: 0x8a5a36,
    ambient: 0.8,
    concrete: [0x7c5232, 0x9a6a42],
    lip: 0xb78452,
    pipLight: 0.6,
  };
}
