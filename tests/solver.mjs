import { DeathMaterials } from "../src/simulation.js";
import { ROOMS } from "../src/rooms.js";
import { appendInput, inputBits, verifyReplay } from "../src/replays.js";
import { writeFile, readFile, mkdir } from "node:fs/promises";
function clone(w) {
  const c = Object.create(DeathMaterials.prototype);
  Object.assign(c, w);
  c.grid = w.grid.map((r) => [...r]);
  c.materials = w.materials.map((m) => ({ ...m, cells: m.cells.map((c) => [...c]) }));
  for (const field of ["presses", "lifts", "players", "seeds"])
    c[field] = w[field].map((k) => ({ ...k }));
  c.events = [];
  c.deathMarks = [];
  c.frostMask = new Set(w.frostMask);
  return c;
}
function key(w, jump) {
  return (
    w.players
      .map((q) =>
        q.dead
          ? "d"
          : `${Math.round(q.x * 5)},${Math.round(q.y * 5)},${Math.sign(q.vx)},${Math.round(q.vy / 4)},${q.ground ? 1 : 0},${Math.round(q.apex * 2)},${Math.round(Math.max(0, q.buf) * 10)},${Math.round(Math.max(0, q.coyote) * 10)},${q.cut ? 1 : 0},${Math.round(q.frost * 8)},${Math.round(Math.max(0, q.cutterGrace) * 10)},${q.inJar ? 1 : 0}`,
      )
      .join(";") +
    "|" +
    w.active +
    "|" +
    jump +
    "|" +
    Math.ceil(w.respawnTimer * 12) +
    "|" +
    w.materials
      .map(
        (m) =>
          m.type +
          Math.round(m.timer * 6) +
          Number(m.touched) +
          m.cells.map((c) => c.join(",")).join(";"),
      )
      .join("|") +
    "|" +
    w.presses
      .map((k) =>
        k.jammed ? "j" : k.phase + "," + Math.round(k.pos * 4) + "," + Math.round(k.t * 5),
      )
      .join("")
  );
}
function score(w) {
  const ps = w.players.filter((p) => !p.dead);
  return (
    ps.reduce(
      (s, p) => s + Math.abs(w.exit.x - p.x) + Math.abs(w.exit.y - p.y) * 1.15 + (p.inJar ? -5 : 0),
      0,
    ) /
      Math.max(1, ps.length) +
    w.deaths * 2 -
    w.materials.length * 25
  );
}
export function solve(room, { beam = 100, max = 400, extraDeaths = 8 } = {}) {
  let layer = [{ w: new DeathMaterials(room), jump: false, parent: null, action: null, ticks: 0 }],
    visited = new Map(),
    best = null;
  const masks = [0, 1, 2, 4, 5, 6, 16];
  for (let depth = 0; depth < max; depth++) {
    const next = [];
    for (const n of layer)
      for (const mask of masks) {
        if (mask === 16 && n.w.players.length < 2) continue;
        const child = clone(n.w),
          hold = !!(mask & 4);
        let ticks = 0;
        for (; ticks < 24 && !child.won; ticks++) {
          child.step({
            left: !!(mask & 1),
            right: !!(mask & 2),
            jump: hold,
            jumpPressed: hold && !n.jump && ticks === 0,
            swap: mask === 16 && ticks === 0,
          });
          child.events = [];
        }
        if (child.deaths > room.par + extraDeaths) continue;
        const node = { w: child, jump: hold, parent: n, action: mask, ticks };
        if (child.won) {
          const chain = [];
          for (let q = node; q.parent; q = q.parent) chain.push(q);
          chain.reverse();
          const runs = [];
          let previousJump = false;
          for (const q of chain) {
            for (let i = 0; i < q.ticks; i++)
              appendInput(
                runs,
                inputBits({
                  left: !!(q.action & 1),
                  right: !!(q.action & 2),
                  jump: !!(q.action & 4),
                  jumpPressed: !!(q.action & 4) && !previousJump && i === 0,
                  swap: q.action === 16 && i === 0,
                }),
              );
            previousJump = !!(q.action & 4);
          }
          const tape = {
            version: "0.1.0",
            roomId: room.id,
            deaths: child.deaths,
            ticks: child.tick,
            inputs: runs,
          };
          verifyReplay(tape);
          return { tape, depth };
        }
        const k = key(child, hold),
          old = visited.get(k),
          value = child.deaths + child.time * 0.001;
        if (old !== undefined && old <= value) continue;
        visited.set(k, value);
        node.score = score(child);
        next.push(node);
      }
    next.sort((a, b) => a.score - b.score);
    layer = next.slice(0, beam);
    if (!layer.length) break;
    best = layer[0];
  }
  return {
    failed: true,
    best: best
      ? {
          x: best.w.players[best.w.active]?.x,
          y: best.w.players[best.w.active]?.y,
          deaths: best.w.deaths,
          materials: best.w.materials.map((m) => ({ type: m.type, cells: m.cells })),
        }
      : null,
  };
}
if (process.argv[1]?.endsWith("solver.mjs")) {
  const ids = process.argv.slice(2),
    rooms = ids.length ? ROOMS.filter((r) => ids.includes(r.id)) : ROOMS.filter((r) => r.act === 0),
    results = JSON.parse(await readFile("tests/solutions.json", "utf8").catch(() => "{}"));
  for (const room of rooms) {
    const start = Date.now(),
      result = solve(room, {
        beam: 180,
        max: room.width > 32 || room.height > 18 ? 1000 : 500,
        extraDeaths: Number(process.env.PRESERVE_SOLVER_EXTRA ?? 8),
      });
    results[room.id] = result;
    console.log(
      room.id,
      result.tape
        ? `clear ${result.tape.deaths}/${room.par} ${(result.tape.ticks / 240).toFixed(1)}s`
        : JSON.stringify(result),
      Date.now() - start + "ms",
    );
    await mkdir("tests/solutions", { recursive: true });
    await writeFile("tests/solutions/" + room.id + ".json", JSON.stringify(result, null, 2));
  }
}
