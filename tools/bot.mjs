// Room bot: a headless search over the authoritative DeathMaterials rules.
//
// Two jobs (tuning doc §4):
//  - prove(room): follow the room's intended death list and record a replay tape
//    that clears at exactly that many deaths.
//  - minimum(room, limit): search every distinct death outcome breadth-first and
//    report the fewest deaths that clear, up to `limit` deaths.
//
// Movement between deaths is a breadth-first search over held inputs. States are
// merged on a quantized key, so a found path is always a real replay (it is
// re-simulated), while a "no clear found" answer is a bounded search, not a proof.
import { DeathMaterials } from "../src/simulation.js";
import { appendInput, inputBits, verifyReplay } from "../src/replays.js";
import { VERSION } from "../src/tuning.js";

export function clone(w) {
  const c = Object.create(DeathMaterials.prototype);
  Object.assign(c, w);
  c.grid = w.grid.map((r) => r.slice());
  c.materials = w.materials.map((m) => ({ ...m, cells: m.cells.map((q) => q.slice()) }));
  c.presses = w.presses.map((k) => ({ ...k }));
  c.lifts = w.lifts.map((k) => ({ ...k }));
  c.seeds = w.seeds.map((k) => ({ ...k }));
  c.players = w.players.map((p) => ({ ...p }));
  c.events = [];
  c.deathMarks = [];
  c.frostMask = new Set(w.frostMask);
  return c;
}

// Rooms whose behaviour depends on the clock need time in the state key.
export function timed(room) {
  return !!(
    room.machine ||
    room.wind ||
    room.sun ||
    room.rows.some((r) => /[KL]/.test(r)) ||
    room.rows.some((r) => r.includes("~") && r.includes("w"))
  );
}

const q = (v, s) => Math.round(v * s);

function gridSig(w) {
  let s = "";
  for (const m of w.materials) s += `${m.id}${m.type}${m.cells[0]}${m.cells.length},`;
  return s + w.deaths;
}

export function gridKey(w) {
  const sig = gridSig(w);
  if (w._gsig === sig) return w._gk;
  let h1 = 0x811c9dc5,
    h2 = 7;
  for (const row of w.grid)
    for (const c of row) {
      const v = c.charCodeAt(0);
      h1 = Math.imul(h1 ^ v, 16777619);
      h2 = (Math.imul(h2, 31) + v) | 0;
    }
  let s = `${h1 >>> 0}.${h2 >>> 0}`;
  for (const m of w.materials) s += `|${m.type}`;
  w._gsig = sig;
  w._gk = s;
  return s;
}

function stateKey(w, held, clock, grain = 4) {
  let s = "";
  for (const p of w.players) {
    if (p.dead) {
      s += "d;";
      continue;
    }
    s += `${q(p.x, grain)},${q(p.y, grain)},${q(p.vx, 0.5)},${q(p.vy, 0.5)},${p.ground ? 1 : 0}${p.cut ? 1 : 0}${p.padded ? 1 : 0}${p.half ? 1 : 0}${p.inJar ? 1 : 0},${q(p.frost, 10)},${p.cutterGrace > 0 ? 1 : 0},${q(p.windV ?? 0, 1)};`;
  }
  s += `${w.active}|${held ? 1 : 0}|${w.respawnTimer > 0 ? q(w.respawnTimer, 10) : 0}|${w.power}`;
  s += "|" + gridKey(w);
  for (const m of w.materials)
    if (m.touched || m.timer) s += `|${m.touched ? 1 : 0}${q(m.timer, 4)}`;
  for (const k of w.presses) s += k.jammed ? `|j${q(k.top, 2)}` : "|k";
  for (const k of w.presses) if (!k.jammed) s += `|${k.phase},${q(k.pos, 2)},${q(k.t, 4)}`;
  for (const l of w.lifts) s += `|${q(l.y, 4)}`;
  if (clock) s += `|t${q(w.time, 10)}`;
  return s;
}

// Held-input macros. Bit layout matches replays.js: 1 left, 2 right, 4 jump.
const MOVES = [0, 1, 2, 4, 5, 6];

function runMacro(w, mask, prevHeld, ticks, stopOnDeath = true) {
  const hold = !!(mask & 4);
  const before = w.deaths;
  const tape = [];
  let n = 0;
  for (; n < ticks && !w.won; n++) {
    const input = {
      left: !!(mask & 1),
      right: !!(mask & 2),
      jump: hold,
      jumpPressed: hold && !prevHeld && n === 0,
      swap: !!(mask & 16) && n === 0,
    };
    tape.push(inputBits(input));
    w.step(input);
    w.events.length = 0;
    if (stopOnDeath && w.deaths !== before) {
      n++;
      break;
    }
  }
  return tape;
}

class Heap {
  constructor() {
    this.a = [];
  }
  push(v, pr) {
    const a = this.a;
    a.push([pr, v]);
    let i = a.length - 1;
    while (i > 0) {
      const j = (i - 1) >> 1;
      if (a[j][0] <= a[i][0]) break;
      [a[i], a[j]] = [a[j], a[i]];
      i = j;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1,
          r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top[1];
  }
  get size() {
    return this.a.length;
  }
}

// Best-first search over movement from `start` until `goal(world)` is true.
// `heuristic(world)` (tiles to go) steers it; without one it is breadth-first.
// `onDeath(world, path, held)` sees every state right after a death; return true
// to stop. Returns { world, tape, held } or null; `stats.exhausted` says whether
// the reachable space was fully explored.
export function explore(
  start,
  {
    goal,
    onDeath,
    heuristic,
    ticks = 12,
    maxNodes = 200000,
    prevHeld = false,
    grain = 4,
    stats = {},
  },
) {
  const clock = timed(start.room);
  const root = { w: clone(start), held: prevHeld, parent: null, tape: [], g: 0 };
  const seen = new Set([stateKey(root.w, prevHeld, clock, grain)]);
  const open = new Heap();
  open.push(root, 0);
  let nodes = 0;
  stats.exhausted = false;
  const path = (n) => {
    const out = [];
    for (let x = n; x; x = x.parent) out.push(x.tape);
    return out.reverse().flat();
  };
  while (open.size) {
    const n = open.pop();
    const split = n.w.players.filter((p) => !p.dead).length > 1;
    const moves = split ? [...MOVES, 16] : MOVES;
    for (const mask of moves) {
      if (++nodes > maxNodes) return null;
      const w = clone(n.w);
      const deaths = w.deaths;
      const tape = runMacro(w, mask, n.held, mask & 16 ? 1 : ticks);
      const node = { w, held: !!(mask & 4), parent: n, tape, g: n.g + 1 };
      if (goal(w)) {
        stats.nodes = nodes;
        return { world: w, tape: path(node), held: node.held };
      }
      if (w.deaths !== deaths) {
        if (onDeath?.(w, () => path(node), node.held)) return null;
        continue;
      }
      if (w.won) continue;
      const k = stateKey(w, node.held, clock, grain);
      if (seen.has(k)) continue;
      seen.add(k);
      open.push(node, heuristic ? node.g * 0.25 + heuristic(w) * 2 : node.g);
    }
  }
  stats.exhausted = true;
  stats.nodes = nodes;
  return null;
}

// Wait out a respawn so every search segment starts from a standing Pip.
function settle(w, held) {
  const tape = [];
  while (w.respawnTimer > 0 && !w.won) tape.push(...runMacro(w, 0, held, 1, false));
  return tape;
}

// A death target: { at: [x, y] } means a death whose material (or death mark)
// covers that cell; kind narrows it to a hazard ("^", "f", "v", "w", "press",
// "frost", "fall", "cutter"); half: true asks for a half's death.
function matches(w, before, target) {
  const mark = w.deathMarks.at(-1);
  if (!mark) return false;
  if (target.kind && mark.kind !== target.kind) return false;
  if (target.at) {
    const [x, y] = target.at;
    const formed = w.materials.find(
      (m) => !before.has(m.id) && m.cells.some((c) => c[0] === x && c[1] === y),
    );
    if (!formed && !(Math.floor(mark.x) === x && Math.floor(mark.y) === y)) return false;
  }
  return true;
}

function tapeOf(room, world, inputs) {
  const runs = [];
  for (const b of inputs) appendInput(runs, b);
  return {
    version: VERSION,
    roomId: room.id,
    deaths: world.deaths,
    ticks: world.tick,
    inputs: runs,
  };
}

function toward(x, y) {
  return (w) => {
    let best = Infinity;
    for (const p of w.players)
      if (!p.dead && !p.inJar)
        best = Math.min(
          best,
          Math.abs(p.x + p.w / 2 - x - 0.5) + Math.abs(p.y + p.h / 2 - y - 0.5),
        );
    return best === Infinity ? 0 : best;
  };
}

// Follow room.solution: a list of death targets, then the exit.
export function prove(room, opts = {}) {
  let w = new DeathMaterials(room);
  let held = false;
  const inputs = [];
  const plan = room.solution ?? [];
  for (let i = 0; i < plan.length; i++) {
    const target = plan[i];
    if (target.via) {
      const [vx, vy] = target.via;
      const deaths = w.deaths;
      const r = explore(w, {
        ...opts,
        prevHeld: held,
        heuristic: toward(vx, vy),
        goal: (x) =>
          x.deaths === deaths &&
          x.players.some(
            (p) =>
              !p.dead &&
              p.ground &&
              Math.floor(p.x + p.w / 2) === vx &&
              Math.floor(p.y + p.h - 0.01) === vy,
          ),
      });
      if (!r)
        return {
          ok: false,
          step: i,
          target,
          deaths: w.deaths,
          grid: w.grid.map((g) => g.join("")),
        };
      inputs.push(...r.tape);
      w = r.world;
      held = r.held;
      continue;
    }
    const before = new Set(w.materials.map((m) => m.id));
    const deaths = w.deaths;
    const r = explore(w, {
      ...opts,
      prevHeld: held,
      heuristic: target.at ? toward(...target.at) : undefined,
      goal: (x) => x.deaths === deaths + 1 && matches(x, before, target),
    });
    if (!r)
      return { ok: false, step: i, target, deaths: w.deaths, grid: w.grid.map((g) => g.join("")) };
    inputs.push(...r.tape);
    w = r.world;
    held = r.held;
    inputs.push(...settle(w, held));
  }
  const deaths = w.deaths;
  const r = explore(w, {
    ...opts,
    prevHeld: held,
    heuristic: toward(w.exit.x, w.exit.y),
    goal: (x) => x.won && x.deaths === deaths,
  });
  if (!r)
    return {
      ok: false,
      step: plan.length,
      target: "exit",
      deaths: w.deaths,
      grid: w.grid.map((g) => g.join("")),
    };
  inputs.push(...r.tape);
  const tape = tapeOf(room, r.world, inputs);
  verifyReplay(tape);
  return { ok: true, tape };
}

// Fewest deaths to clear, searching every distinct death outcome level by level.
export function minimum(room, limit, { maxNodes = 120000, maxStates = 4000, ticks = 12 } = {}) {
  let level = [{ w: new DeathMaterials(room), held: false }];
  const seen = new Set();
  let exhaustive = true;
  for (let d = 0; d <= limit; d++) {
    const next = [];
    for (const s of level) {
      let cleared = false;
      const r = explore(s.w, {
        ticks,
        maxNodes,
        prevHeld: s.held,
        goal: (x) => x.won,
        onDeath: (x, _path, held) => {
          if (d === limit) return false;
          const y = clone(x);
          settle(y, held);
          const k = gridKey(y) + (timed(room) ? `|t${q(y.time, 4)}` : "") + "|" + y.players.length;
          if (seen.has(k)) return false;
          seen.add(k);
          next.push({ w: y, held });
          return false;
        },
      });
      if (r) cleared = true;
      if (cleared) return { deaths: d, exhaustive };
    }
    if (next.length > maxStates) {
      exhaustive = false;
      next.length = maxStates;
    }
    level = next;
    if (!level.length) break;
  }
  return { deaths: null, exhaustive };
}
