import { runPlan } from "./plan-runner.js";
import { writeFile } from "node:fs/promises";
import { verifyReplay } from "../src/replays.js";
const R = (s, t = 8) => [{ r: 1 }, s, t],
  J = (s) => [{ r: 1, j: 1 }, s, 8, 1],
  D = [{}, "!pl.dead", 2];
function fieldsPlan(fields) {
  const p = [];
  function cross(s, die = false) {
    p.push(R(`pl.x>${s - 1.1}`), J(die ? "pl.dead>0" : `pl.ground&&pl.x>${s}`));
    if (!die) p.push(R(`pl.x>${s + 4.9}`), J(`pl.ground&&pl.x>${s + 7}`));
  }
  for (let k = 0; k < fields.length; k++) {
    for (let i = 0; i < k; i++) cross(fields[i]);
    cross(fields[k], true);
    p.push(D);
  }
  fields.forEach((s) => cross(s));
  p.push(R("WON", 10));
  return p;
}
for (const id of ["room.1.06", "room.1.08"]) {
  const r = runPlan(id, fieldsPlan([7, 20]));
  console.log(id, r.world.won, r.world.deaths);
  if (!r.world.won) console.log(r.log);
  else {
    const tape = {
      version: "0.1.0",
      roomId: id,
      deaths: r.world.deaths,
      ticks: r.world.tick,
      inputs: r.runs,
    };
    verifyReplay(tape);
    await writeFile("tests/solutions/" + id + ".json", JSON.stringify({ tape }, null, 2));
  }
}
