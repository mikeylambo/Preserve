import { DeathMaterials } from "./simulation.js";
import { ROOM_BY_ID } from "./rooms.js";
import { VERSION, TUNE } from "./tuning.js";
export const inputBits = (i) =>
  (i.left ? 1 : 0) |
  (i.right ? 2 : 0) |
  (i.jump ? 4 : 0) |
  (i.jumpPressed ? 8 : 0) |
  (i.swap ? 16 : 0);
export const bitsInput = (b) => ({
  left: !!(b & 1),
  right: !!(b & 2),
  jump: !!(b & 4),
  jumpPressed: !!(b & 8),
  swap: !!(b & 16),
});
export function appendInput(runs, b) {
  const last = runs.at(-1);
  if (last && last[0] === b) last[1]++;
  else runs.push([b, 1]);
}
export function verifyReplay(tape, { ghost = false } = {}) {
  if (
    tape.version !== VERSION ||
    !ROOM_BY_ID[tape.roomId] ||
    !Array.isArray(tape.inputs) ||
    tape.inputs.length > 100000
  )
    throw Error("This replay does not match this build.");
  const world = new DeathMaterials(ROOM_BY_ID[tape.roomId]);
  let count = 0;
  const frames = [];
  for (const pair of tape.inputs) {
    if (!Array.isArray(pair) || pair.length !== 2) throw Error("Invalid replay.");
    const [b, n] = pair;
    if (
      !Number.isInteger(b) ||
      b < 0 ||
      b > 31 ||
      !Number.isInteger(n) ||
      n < 1 ||
      n > 600000 ||
      count + n > 600000
    )
      throw Error("Replay is too long or invalid.");
    for (let j = 0; j < n; j++) {
      if (world.won) throw Error("Replay continues after completion.");
      world.step(bitsInput(b));
      world.drain();
      if (ghost && count % 4 === 0) frames.push({ t: world.time * 1000, state: world.state() });
      count++;
    }
  }
  if (!world.won || world.deaths !== tape.deaths || world.tick !== tape.ticks)
    throw Error("The replay does not reproduce this score.");
  return {
    world,
    frames,
    deaths: world.deaths,
    ticks: world.tick,
    timeMs: Math.round(world.time * 1000),
  };
}
export function encodeReplay(tape) {
  const data = JSON.stringify(tape);
  const bytes = new TextEncoder().encode(data);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return "PRSV1." + btoa(bin);
}
export function decodeReplay(code) {
  if (code.length > 2000000 || !code.startsWith("PRSV1."))
    throw Error("Paste a Preserve replay code.");
  const bin = atob(code.trim().slice(6));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}
export function verifyRun(run) {
  if (run.kind !== "run" || !Array.isArray(run.tapes)) throw Error("Invalid Par Run replay.");
  const expected =
    run.id === "full"
      ? Object.values(ROOM_BY_ID).filter((r) => !r.anomaly)
      : Object.values(ROOM_BY_ID).filter((r) => !r.anomaly && "act." + r.act === run.id);
  if (!expected.length || run.tapes.length !== expected.length) throw Error("Incomplete Par Run.");
  let deaths = 0,
    timeMs = 0,
    ticks = 0;
  for (let i = 0; i < expected.length; i++) {
    if (run.tapes[i].roomId !== expected[i].id) throw Error("Par Run room order does not match.");
    ticks += run.tapes[i].ticks;
    if (ticks > 6000000) throw Error("Par Run replay is too long.");
    const v = verifyReplay(run.tapes[i]);
    deaths += v.deaths;
    timeMs += v.timeMs;
  }
  return { deaths, timeMs };
}
