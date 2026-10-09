// Prove rooms at par and record their tapes.
//   node tools/prove.mjs [--min] [--quiet] [room ids or act numbers...]
// Writes tests/par/<room id>.json for every room that clears at exactly par
// (or at par - 1 for a birdie room, which also proves the birdie exists).
import { mkdir, writeFile } from "node:fs/promises";
import { ROOMS } from "../src/rooms.js";
import { prove, minimum } from "./bot.mjs";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const picks = args.filter((a) => !a.startsWith("--"));
const rooms = picks.length
  ? ROOMS.filter((r) => picks.includes(r.id) || picks.includes(String(r.act)))
  : ROOMS;

await mkdir("tests/par", { recursive: true });
let failed = 0;
for (const room of rooms) {
  if (!flags.has("--quiet"))
    console.log(`\n${room.id} ${room.name} (par ${room.par})\n${room.rows.join("\n")}`);
  const t = Date.now();
  let r;
  if (room.search) {
    // No scripted line: the death search finds the cheapest clear and its tape.
    const m = minimum(room, room.par, { tape: true });
    r = m.tape ? { ok: true, tape: m.tape } : { ok: false, step: "search", target: m, deaths: 0 };
  } else
    for (const maxNodes of [400000, 1500000, 5000000]) {
      r = prove(room, { maxNodes });
      if (r.ok) break;
    }
  const target = room.par;
  let line = `${room.id}: `;
  if (!r.ok) {
    failed++;
    line += `FAIL at step ${r.step} ${JSON.stringify(r.target)} (deaths ${r.deaths})`;
    if (r.grid) line += "\n" + r.grid.join("\n") + "\n";
  } else if (r.tape.deaths !== target) {
    failed++;
    line += `WRONG deaths ${r.tape.deaths} vs par ${target}`;
  } else {
    line += `par ${r.tape.deaths} in ${(r.tape.ticks / 240).toFixed(1)}s`;
    await writeFile(`tests/par/${room.id}.json`, JSON.stringify(r.tape) + "\n");
  }
  if (r.ok && (room.birdieSolution || room.birdieSearch)) {
    let b;
    if (room.birdieSearch) {
      // No scripted birdie line: the death search finds the cheaper clear.
      const m = minimum(room, target - 1, { tape: true });
      b = m.tape ? { ok: true, tape: m.tape } : { ok: false };
    } else
      for (const maxNodes of [400000, 1500000, 5000000]) {
        b = prove({ ...room, solution: room.birdieSolution }, { maxNodes });
        if (b.ok) break;
      }
    line += b.ok && b.tape.deaths === target - 1 ? `, birdie ${target - 1} ok` : ", BIRDIE FAIL";
    if (!(b.ok && b.tape.deaths === target - 1)) failed++;
  }
  if (flags.has("--min") && r.ok) {
    const floor = room.birdie ? target - 1 : room.ace ? 0 : target;
    const m = minimum(room, floor - 1);
    line +=
      m.deaths === null
        ? `, no clear under ${floor} (${m.exhaustive ? "exhaustive" : "bounded"})`
        : `, CHEAPER clear at ${m.deaths}`;
    if (m.deaths !== null) failed++;
  }
  console.log(line + ` [${Date.now() - t}ms]`);
}
process.exitCode = failed ? 1 : 0;
